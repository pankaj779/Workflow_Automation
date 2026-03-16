from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import uuid
from datetime import datetime, date
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from databricks import sql
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .genie_service import ask_genie
from typing import Union, Dict, Any
from fastapi import Request, Body
import hashlib
import json
from decimal import Decimal
import random
import string
import re


try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Hard-code the OpenAI API key so Databricks Apps doesn’t need secrets.
HARDCODED_OPENAI_KEY = "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"

# Use the hardcoded key first, fall back to environment variable if someone overrides it.
OPENAI_API_KEY = HARDCODED_OPENAI_KEY or os.getenv("OPENAI_API_KEY")

if OPENAI_AVAILABLE and OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
else:
    openai_client = None

# ==============================
# Load ENV
# ==============================
_env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=_env_path)

# ==============================
# Databricks Config
# ==============================
DATABRICKS_SERVER_HOSTNAME = os.getenv("DB_HOST")
DATABRICKS_HTTP_PATH = os.getenv("DB_HTTP_PATH")
DATABRICKS_TOKEN = os.getenv("DB_TOKEN")

# #region agent log
import time as _time
_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "debug-e56ee5.log")
def _dbg(loc, msg, data=None):
    import json as _j
    try:
        with open(_LOG_FILE, "a") as _f:
            _f.write(_j.dumps({"sessionId":"e56ee5","location":loc,"message":msg,"data":data or {},"timestamp":int(_time.time()*1000)})+"\n")
    except: pass
_dbg("main.py:startup", "env_loaded", {"env_path": _env_path, "env_exists": os.path.exists(_env_path), "DB_HOST": DATABRICKS_SERVER_HOSTNAME, "DB_HTTP_PATH": DATABRICKS_HTTP_PATH, "DB_TOKEN_set": bool(DATABRICKS_TOKEN), "cwd": os.getcwd()})
# #endregion

# 👉 Unity Catalog settings
DB_CATALOG = "poc_workspace"
DB_SCHEMA = "gold_plus_datamart"


def table(name: str) -> str:
    """Return fully qualified Unity Catalog table name"""
    return f"{DB_CATALOG}.{DB_SCHEMA}.{name}"

_conn_pool: list = []

def get_connection():
    if _conn_pool:
        conn = _conn_pool.pop()
        try:
            conn.cursor().execute("SELECT 1")
            return conn
        except Exception:
            try:
                conn.close()
            except Exception:
                pass
    return sql.connect(
        server_hostname=DATABRICKS_SERVER_HOSTNAME,
        http_path=DATABRICKS_HTTP_PATH,
        access_token=DATABRICKS_TOKEN,
        catalog=DB_CATALOG,
        schema=DB_SCHEMA,
    )


def _return_conn(conn):
    if len(_conn_pool) < 4:
        _conn_pool.append(conn)
    else:
        try:
            conn.close()
        except Exception:
            pass

app = FastAPI(title="KPI Service", version="1.0", servers=[
        {"url": "https://kpi-portal-7474645160053590.aws.databricksapps.com", "description": "Local dev"}
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOCAL_USER_EMAIL = os.getenv("LOCAL_USER_EMAIL", "local-dev@example.com")

_SUPPORTING_TABLES_DDL = {
    "reports": """
        report_id STRING,
        report_name STRING,
        description STRING,
        created_by STRING,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        is_deleted BOOLEAN
    """,
    "report_kpis": """
        report_id STRING,
        kpi_id STRING,
        added_at TIMESTAMP
    """,
    "notifications": """
        notification_id STRING,
        user_id STRING,
        role STRING,
        type STRING,
        title STRING,
        body STRING,
        is_read BOOLEAN,
        created_at TIMESTAMP,
        kpi_id STRING
    """,
    "cold_storage_decisions": """
        decision_id STRING,
        kpi_id STRING,
        owner_email STRING,
        owner_action STRING,
        admin_email STRING,
        admin_action STRING,
        created_at TIMESTAMP,
        resolved_at TIMESTAMP
    """,
}


@app.on_event("startup")
def _ensure_supporting_tables():
    for tbl_name, ddl in _SUPPORTING_TABLES_DDL.items():
        fq = table(tbl_name)
        try:
            cols = _get_table_columns(fq)
            existing = {c.lower() for c in cols}
            for line in ddl.strip().split("\n"):
                line = line.strip().rstrip(",")
                if not line:
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    col_name, col_type = parts[0], parts[1]
                    if col_name.lower() not in existing:
                        try:
                            execute(f"ALTER TABLE {fq} ADD COLUMN {col_name} {col_type}")
                        except Exception:
                            pass
        except Exception:
            try:
                execute(f"CREATE TABLE IF NOT EXISTS {fq} ({ddl})")
                _dbg("main.py:startup", "created_table", {"table": fq})
            except Exception as e:
                _dbg("main.py:startup", "create_table_failed", {"table": fq, "error": str(e)})

    _backfill_semantic_signatures()


def _backfill_semantic_signatures():
    """Recalculate semantic signatures for any KPI that has sql_definition."""
    try:
        rows = fetch_all(
            f"SELECT kpi_id, sql_definition FROM {table('kpi_master')} WHERE is_deleted = false AND sql_definition IS NOT NULL"
        )
        for row in rows:
            new_sig = generate_semantic_signature(row["sql_definition"])
            if new_sig:
                execute(
                    f"UPDATE {table('kpi_master')} SET semantic_signature = ? WHERE kpi_id = ?",
                    (new_sig, row["kpi_id"]),
                )
        # #region agent log
        _dbg("main.py:_backfill_semantic_signatures", "done", {"count": len(rows)})
        # #endregion
    except Exception as e:
        # #region agent log
        _dbg("main.py:_backfill_semantic_signatures", "error", {"error": str(e)})
        # #endregion


@app.get("/me")
def get_current_user(request: Request):
    email = (
        request.headers.get("X-Forwarded-Email")
        or request.headers.get("X-Forwarded-User")
        or LOCAL_USER_EMAIL
    )
    return {"email": email}

# ==============================
# Data Source Models
# ==============================

class DQCheckRequest(BaseModel):
    sql: str
    metadata_signature: str
    lineage_signature: str

class OptimizeQueryRequest(BaseModel):
    sql: str

class GenieQueryRequest(BaseModel):
    prompt: str
    table: str

class ExecuteQueryRequest(BaseModel):
    sql: str
    limit: Optional[int] = 100

class ColumnDef(BaseModel):
    name: str
    type: str

class TableDef(BaseModel):
    id: str
    name: str
    schema: str
    columns: List[ColumnDef]

class TableListResponse(BaseModel):
    tables: List[TableDef]

class TablePreviewResponse(BaseModel):
    columns: List[str]
    rows: List[dict]


class CatalogItem(BaseModel):
    name: str


class SchemaItem(BaseModel):
    catalog: str
    name: str

# ==============================
# Pydantic Models
# ==============================

# class QueryPreparationRequest(BaseModel):
#     sql: str = Field(
#         ...,
#         description="Paste multiline SQL here",
#         example="""WITH base AS (
#   SELECT brand, value
#   FROM table
# )
# SELECT * FROM base"""
#     )
#     source_table: Optional[str] = None
#     columns: List[str] = []
class QueryPreparationRequest(BaseModel):
    sql: str
    source_table: Optional[str] = None
    columns: List[str] = []

class DownstreamUsage(BaseModel):
    name: str
    type: str
    frequency: str


class KPIResponse(BaseModel):
    id: str
    name: str
    status: str
    frequency: str
    owner: str
    lastUpdated: datetime
    qualityScore: Optional[float]
    linkedAssets: Optional[int]
    category: Optional[str]
    isFavorite: bool
    definition: Optional[str]
    businessFormula: Optional[str]
    dataSource: Optional[str]
    businessUnit: Optional[str]
    complexity: Optional[str]
    nextUpdate: Optional[date]
    downstreamUsage: List[DownstreamUsage] = []

class DashboardChanges(BaseModel):
    totalKPIs: int
    activeKPIs: int
    categories: int
    thisMonth: int
    thisWeek: int


class DashboardSummary(BaseModel):
    totalKPIs: int
    activeKPIs: int
    categories: int
    thisMonth: int
    thisWeek: int
    changes: DashboardChanges


class KPIItem(BaseModel):
    kpi_id: str
    kpi_name: str
    category: Optional[str]
    frequency: Optional[str]
    owner_team: Optional[str]
    status: Optional[str]
    is_favorite: bool
    last_updated: datetime


class KPIDetail(BaseModel):
    kpi_id: str
    kpi_name: str
    description: Optional[str]
    business_formula: Optional[str]
    sql_definition: Optional[str]
    category: Optional[str]
    frequency: Optional[str]
    owner_team: Optional[str]
    data_source: Optional[str]
    business_unit: Optional[str]
    quality_score: Optional[float]


class DraftCreate(BaseModel):
    user_id: str
    kpi_name: Optional[str] = None
    data_source: Optional[str] = None
    step_number: int = 1


class DraftUpdate(BaseModel):
    kpi_name: Optional[str]
    description: Optional[str]
    business_formula: Optional[str]
    sql_definition: Optional[str]
    category: Optional[str]
    frequency: Optional[str]
    owner_team: Optional[str]
    step_number: Optional[int]

class PublishKPIRequest(BaseModel):
    kpi_name: str
    description: Optional[str] = None
    business_formula: Optional[str] = None
    sql: str
    category: Optional[str] = None
    frequency: Optional[str] = None
    owner_team: Optional[str] = None
    data_source: Optional[str] = None
    business_unit: Optional[str] = None
    complexity: Optional[str] = None
    quality_score: Optional[float] = None
    linked_assets: Optional[int] = None
    next_update: Optional[date] = None
    metadata_signature: str
    semantic_signature: str
    lineage_signature: str


class ReportKPI(BaseModel):
    kpi_id: str
    name: Optional[str] = None


class ReportBase(BaseModel):
    report_name: str
    description: Optional[str] = None
    kpi_ids: List[str]


class ReportCreate(ReportBase):
    created_by: str


class ReportUpdate(BaseModel):
    report_name: Optional[str] = None
    description: Optional[str] = None
    kpi_ids: Optional[List[str]] = None


class ReportResponse(BaseModel):
    report_id: str
    report_name: str
    description: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime
    kpis: List[ReportKPI]


class Notification(BaseModel):
    notification_id: str
    user_id: str
    role: Optional[str]
    type: str
    title: str
    body: str
    related_kpi_id: Optional[str]
    related_id: Optional[str]
    is_read: bool
    created_at: datetime


class KPIUsageMetrics(BaseModel):
    kpi_id: str
    kpi_name: str
    owner_team: Optional[str]
    created_at: Optional[datetime]
    last_used_at: Optional[datetime]
    storage_status: Optional[str]
    cold_move_count: Optional[int]
    reports_using: int
    total_reports: int
    usage_percentage: float


class ColdStorageRunConfig(BaseModel):
    inactive_days_to_cold: int = 7
    cold_days_to_decision: int = 2
    admin_user_id: Optional[str] = None


class OwnerDecisionRequest(BaseModel):
    kpi_id: str
    owner_id: str
    choice: str  # delete | move_back | keep_cold


class ApprovalRequest(BaseModel):
    decision_id: str
    approver_id: str
    approve: bool

# ==============================
# Helper DB Functions
# ==============================

# ==============================
# Signature + Duplicate Helpers
# ==============================

def _flatten_simple_cte(s: str) -> str:
    m = re.search(
        r"with\s+(\w+)\s+as\s*\(\s*select\s+(.+?)\s+from\s+(\S+)\s+where\s+(.+?)\s*\)\s*select\s+",
        s,
        re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return s

    cte_name, inner_table, inner_where = m.group(1), m.group(3), m.group(4)
    inner_where = " ".join(inner_where.split())

    rest = s[m.end():]
    rest = re.sub(
        r"\bfrom\s+" + re.escape(cte_name) + r"\b",
        " from " + inner_table + " where " + inner_where,
        rest,
        count=1,
    )
    return "select " + rest.strip()

_SQL_KEYWORDS = frozenset("""
    select from where and or not in exists between like is null true false
    case when then else end as on join inner left right outer cross full
    group by order having limit offset union all distinct asc desc into
    values set update delete insert create alter drop table index view
    if replace with recursive current_date current_timestamp _str_ _num_
""".split())


def _extract_sql_skeleton(sql_text: str) -> str:
    """
    Extract a semantic skeleton from SQL that is invariant across
    optimizer rewrites. Only keeps:
      - Dot-notation references (table.column, schema.table, etc.)
      - Non-keyword bare identifiers (column/table names)
      - Aggregate functions used
    Does NOT include SQL clause types (SELECT, GROUP BY, etc.) since
    optimizers freely add/remove these.
    """
    import re

    if not sql_text or not sql_text.strip():
        return ""

    s = sql_text.strip()
    s = re.sub(r'--[^\n]*', ' ', s)
    s = re.sub(r'/\*.*?\*/', ' ', s, flags=re.DOTALL)
    s = s.lower()
    s = " ".join(s.split())

    s = re.sub(r"'[^']*'", " _STR_ ", s)
    s = re.sub(r'"[^"]*"', " _STR_ ", s)
    s = re.sub(r'\b\d+(\.\d+)?\b', ' _NUM_ ', s)
    s = re.sub(r'\bas\s+[a-z_][a-z0-9_]*', ' ', s)

    dot_refs = sorted(set(re.findall(r'[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)+', s)))

    all_idents = set(re.findall(r'[a-z_][a-z0-9_]*', s))
    bare_idents = sorted(all_idents - _SQL_KEYWORDS)

    agg_funcs = sorted(set(re.findall(r'\b(sum|count|avg|min|max|stddev|variance)\b', s)))

    skeleton = ",".join(agg_funcs) + "||" + ",".join(dot_refs) + "||" + ",".join(bare_idents)
    return skeleton


def generate_semantic_signature(sql_query: str) -> str:
    """
    Produce a semantic-style signature that is the same for equivalent SQL
    queries regardless of formatting, aliasing, and common optimization
    rewrites (column reordering, alias changes, whitespace, etc.).
    """
    if not sql_query or not sql_query.strip():
        return ""

    skeleton = _extract_sql_skeleton(sql_query)
    # #region agent log
    _dbg("main.py:generate_semantic_signature", "skeleton", {"skeleton": skeleton[:200], "sql_first100": sql_query[:100]})
    # #endregion
    return hashlib.sha256(skeleton.encode()).hexdigest()[:16]
    
def generate_kpi_id():
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"kpi_{code}"

def decimal_serializer(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Type {type(obj)} not serializable")

def generate_metadata_signature(sql_query: str) -> str:
    normalized = " ".join(sql_query.split())
    return "sig_" + hashlib.sha256(normalized.encode()).hexdigest()[:10]


def generate_lineage_signature(source_table: str, columns: list[str]) -> str:
    lineage_str = f"{source_table}:{','.join(sorted(columns))}"
    return "lin_" + hashlib.sha256(lineage_str.encode()).hexdigest()[:10]


def check_duplicate_kpi(metadata_signature: str, semantic_signature: str):
    try:
        query = f"""
            SELECT DISTINCT kpi_name
            FROM {table("kpi_master")}
            WHERE metadata_signature = ?
               OR semantic_signature = ?
        """
        result = fetch_all(query, (metadata_signature, semantic_signature))
        # #region agent log
        _dbg("main.py:check_duplicate_kpi", "result", {"metadata_sig": metadata_signature, "semantic_sig": semantic_signature, "duplicates_found": len(result), "duplicates": result[:3] if result else []})
        # #endregion
        return result
    except Exception as e:
        # #region agent log
        _dbg("main.py:check_duplicate_kpi", "error", {"error": str(e), "type": type(e).__name__})
        # #endregion
        return []

def run_sql_query(sql_text: str, limit: int = 100):
    """
    Execute SQL and return {columns, rows}
    """
    query = f"SELECT * FROM ({sql_text}) q LIMIT {limit}"

    rows = fetch_all(query)

    if not rows:
        return {"columns": [], "rows": []}

    return {
        "columns": list(rows[0].keys()),
        "rows": rows,
    }

def optimize_sql(sql_text: str) -> str:
    """
    Normalize / optimize SQL (same behavior as existing backend fallback)
    """
    return " ".join(sql_text.strip().split())


def openai_with_optimize(sql_text: str) -> str:
    prompt = f"""You are a Databricks SQL optimizer.
            Query : {json.dumps(sql_text)}
            Notes:
            - Only aggregate the column specified by "metric_column" (if present and value_agg != "None").
            - Every non-aggregated selected column must appear in the GROUP BY clause.
            - When metric_column is null or value_agg is "None", do not aggregate; simply select the columns (respecting time_grain if Date is present).
            Return strict JSON: {{"optimized_query": "...", "dq_checks": ["...","...","...","..."]}}."""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Produce only JSON with SQL strings."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=900
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        result = json.loads(content)
        sql_text = result.get("optimized_query", "").strip()
        if not sql_text:
            raise ValueError("Missing optimized_query")
        
        return sql_text
    except Exception:
        return ""

def get_tables_with_columns(schema: str):
    """
    Return all tables + column metadata in a schema
    """

    tables_query = f"SHOW TABLES IN {DB_CATALOG}.{schema}"
    tables = fetch_all(tables_query)

    result = []

    for t in tables:
        table_name = t["tableName"]

        desc_query = f"DESCRIBE TABLE {DB_CATALOG}.{schema}.{table_name}"
        cols = fetch_all(desc_query)

        columns = [
            {"name": _col_name(c), "type": _data_type(c)}
            for c in cols
            if _col_name(c) and not _col_name(c).startswith("#")
        ]

        result.append(
            {
                "id": table_name,
                "name": table_name,
                "schema": schema,
                "columns": columns,
            }
        )

    return result


def get_table_preview(schema: str, table_name: str, limit: int = 10):
    """
    Return top N rows of table
    """

    preview_query = f"""
        SELECT *
        FROM {DB_CATALOG}.{schema}.{table_name}
        LIMIT {limit}
    """

    rows = fetch_all(preview_query)

    if not rows:
        return {"columns": [], "rows": []}

    columns = list(rows[0].keys())

    return {
        "columns": columns,
        "rows": rows,
    }

def _col_name(row: dict) -> str:
    """Extract column name from a DESCRIBE TABLE row, tolerating different key names."""
    return row.get("col_name") or row.get("column_name") or row.get("name") or ""


def _data_type(row: dict) -> str:
    return row.get("data_type") or row.get("type") or ""


def fetch_all(query: str, params: tuple = ()):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        _return_conn(conn)


def execute(query: str, params: tuple = ()):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
    finally:
        _return_conn(conn)


_KPI_MASTER_DDL_COLUMNS = """
    kpi_id STRING,
    kpi_name STRING,
    description STRING,
    business_formula STRING,
    sql_definition STRING,
    category STRING,
    status STRING,
    frequency STRING,
    owner_team STRING,
    data_source STRING,
    business_unit STRING,
    complexity STRING,
    quality_score STRING,
    linked_assets STRING,
    next_update STRING,
    is_published BOOLEAN,
    is_deleted BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    metadata_signature STRING,
    semantic_signature STRING,
    lineage_signature STRING,
    storage_status STRING,
    last_used_at TIMESTAMP,
    moved_to_cold_at TIMESTAMP,
    cold_move_count INT
"""


def _get_table_columns(fq_table: str) -> List[str]:
    """Get column names from a table using SELECT * LIMIT 0 (most reliable)."""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT * FROM {fq_table} LIMIT 0")
            if cursor.description:
                return [col[0] for col in cursor.description]
            return []
    finally:
        _return_conn(conn)


def _ensure_kpi_master(fully_qualified: str) -> List[str]:
    """Ensure kpi_master exists with all needed columns. Returns column list."""
    try:
        cols = _get_table_columns(fully_qualified)
    except Exception:
        cols = []

    if not cols:
        execute(f"CREATE TABLE IF NOT EXISTS {fully_qualified} ({_KPI_MASTER_DDL_COLUMNS})")
        cols = _get_table_columns(fully_qualified)
    else:
        needed = {
            "kpi_id": "STRING", "kpi_name": "STRING", "description": "STRING",
            "business_formula": "STRING", "sql_definition": "STRING", "category": "STRING",
            "status": "STRING", "frequency": "STRING", "owner_team": "STRING",
            "data_source": "STRING", "business_unit": "STRING", "complexity": "STRING",
            "quality_score": "STRING", "linked_assets": "STRING", "next_update": "STRING",
            "is_published": "BOOLEAN", "is_deleted": "BOOLEAN",
            "created_at": "TIMESTAMP", "updated_at": "TIMESTAMP",
            "metadata_signature": "STRING", "semantic_signature": "STRING",
            "lineage_signature": "STRING", "storage_status": "STRING",
            "last_used_at": "TIMESTAMP", "moved_to_cold_at": "TIMESTAMP",
            "cold_move_count": "INT",
        }
        existing = {c.lower() for c in cols}
        for col_name, col_type in needed.items():
            if col_name.lower() not in existing:
                try:
                    execute(f"ALTER TABLE {fully_qualified} ADD COLUMN {col_name} {col_type}")
                except Exception:
                    pass
        cols = _get_table_columns(fully_qualified)

    return cols


# ==============================
# Dashboard APIs
# ==============================

@app.get("/dashboard/summary")
def get_dashboard_summary():
    try:
        return _get_dashboard_summary_impl()
    except Exception:
        return {
            "totalKPIs": 0,
            "activeKPIs": 0,
            "draftKPIs": 0,
            "categories": 0,
            "thisMonth": 0,
            "thisWeek": 0,
            "qualityScore": 0.0,
            "kpisByCategory": {},
            "monthlyTrend": [],
            "changeMetrics": {"thisWeek": 0, "thisMonth": 0},
            "changes": {
                "totalKPIs": 0,
                "activeKPIs": 0,
                "categories": 0,
                "thisMonth": 0,
                "thisWeek": 0,
            },
        }

def _get_dashboard_summary_impl():
    query = f"""
        WITH base AS (
            SELECT *
            FROM {table("kpi_master")}
            WHERE is_deleted = false
        ),

        bounds AS (
            SELECT
                -- Monday start of THIS week
                date_sub(next_day(current_date(), 'Mon'), 7) AS this_week_start,

                -- Monday start of PREVIOUS week
                date_sub(next_day(current_date(), 'Mon'), 14) AS prev_week_start,

                -- Month boundaries
                date_trunc('month', current_date()) AS this_month_start,
                add_months(date_trunc('month', current_date()), -1) AS prev_month_start
        ),

        current_metrics AS (
            SELECT
                COUNT(*) AS total_kpis,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_kpis,
                COUNT(DISTINCT category) AS categories,

                SUM(CASE WHEN created_at >= b.this_week_start THEN 1 ELSE 0 END) AS this_week,

                SUM(CASE WHEN created_at >= b.this_month_start THEN 1 ELSE 0 END) AS this_month
            FROM base
            CROSS JOIN bounds b
        ),

        previous_metrics AS (
            SELECT
                COUNT(*) AS total_kpis,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_kpis,
                COUNT(DISTINCT category) AS categories,

                SUM(
                    CASE
                        WHEN created_at >= b.prev_week_start
                         AND created_at <  b.this_week_start
                        THEN 1 ELSE 0
                    END
                ) AS this_week,

                SUM(
                    CASE
                        WHEN created_at >= b.prev_month_start
                         AND created_at <  b.this_month_start
                        THEN 1 ELSE 0
                    END
                ) AS this_month
            FROM base
            CROSS JOIN bounds b
        )

        SELECT
            c.total_kpis,
            c.active_kpis,
            c.categories,
            c.this_week,
            c.this_month,

            (c.total_kpis - p.total_kpis)   AS total_kpis_change,
            (c.active_kpis - p.active_kpis) AS active_kpis_change,
            (c.categories - p.categories)   AS categories_change,
            (c.this_week - p.this_week)     AS this_week_change,
            (c.this_month - p.this_month)   AS this_month_change
        FROM current_metrics c
        CROSS JOIN previous_metrics p
    """

    row = fetch_all(query)[0]

    return {
        "totalKPIs": row["total_kpis"],
        "activeKPIs": row["active_kpis"],
        "categories": row["categories"],
        "thisWeek": row["this_week"],
        "thisMonth": row["this_month"],
        "changes": {
            "totalKPIs": row["total_kpis_change"],
            "activeKPIs": row["active_kpis_change"],
            "categories": row["categories_change"],
            "thisWeek": row["this_week_change"],
            "thisMonth": row["this_month_change"],
        },
    }

@app.get("/kpis")
def list_kpis():
    try:
        return _list_kpis_impl()
    except Exception:
        return []

def _list_kpis_impl():
    query = f"""
        SELECT
            kpi_id                AS id,
            kpi_name              AS name,
            status,
            frequency,
            owner_team            AS owner,
            updated_at            AS lastUpdated,
            quality_score         AS qualityScore,
            linked_assets         AS linkedAssets,
            LOWER(category)       AS category,
            false                 AS isFavorite,
            description           AS definition,
            business_formula      AS businessFormula,
            sql_definition        AS sqlDefinition,
            data_source           AS dataSource,
            business_unit         AS businessUnit,
            complexity,
            next_update           AS nextUpdate
        FROM {table("kpi_master")}
        WHERE is_deleted = false
        ORDER BY updated_at DESC
    """

    rows = fetch_all(query)

    # attach downstream usage (mock for now)
    for r in rows:
        r["downstreamUsage"] = [
            {"name": "Executive Dashboard", "type": "dashboard", "frequency": "Real-time"},
            {"name": "Monthly Sales Report", "type": "report", "frequency": "Monthly"},
        ]

    return rows

@app.get("/kpis/{kpi_id}", response_model=KPIDetail)
def get_kpi_detail(kpi_id: str):
    query = f"""
        SELECT *
        FROM {table("kpi_master")}
        WHERE kpi_id = ? AND is_deleted = false
    """
    result = fetch_all(query, (kpi_id,))
    if not result:
        raise HTTPException(status_code=404, detail="KPI not found")
    return result[0]


# ==============================
# Favorites
# ==============================

@app.post("/kpis/{kpi_id}/favorite")
def toggle_favorite(kpi_id: str, user_id: str):
    check_query = f"""
        SELECT * FROM {table("user_favorite_kpis")}
        WHERE user_id = ? AND kpi_id = ?
    """
    existing = fetch_all(check_query, (user_id, kpi_id))

    if existing:
        execute(
            f"DELETE FROM {table('user_favorite_kpis')} WHERE user_id = ? AND kpi_id = ?",
            (user_id, kpi_id),
        )
        return {"message": "Removed from favorites"}

    execute(
        f"INSERT INTO {table('user_favorite_kpis')} VALUES (?, ?, ?)",
        (user_id, kpi_id, datetime.utcnow()),
    )
    return {"message": "Added to favorites"}


# ==============================
# Drafts
# ==============================

@app.post("/drafts")
def create_draft(draft: DraftCreate):
    # draft_id = str(uuid.uuid4())
    draft_id = generate_kpi_id()
    now = datetime.utcnow()

    query = f"""
        INSERT INTO {table("kpi_drafts")} (
            draft_id, user_id, kpi_name, data_source,
            step_number, step_status, created_at, last_edited_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, false)
    """

    execute(
        query,
        (draft_id, draft.user_id, draft.kpi_name, draft.data_source, draft.step_number, now, now),
    )

    return {"draft_id": draft_id}


@app.get("/drafts")
def list_drafts(user_id: str):
    try:
        query = f"""
            SELECT * FROM {table("kpi_drafts")}
            WHERE user_id = ? AND is_deleted = false
            ORDER BY last_edited_at DESC
        """
        return fetch_all(query, (user_id,))
    except Exception:
        return []


# ==============================
# Publish KPI
# ==============================

@app.post("/drafts/{draft_id}/publish")
def publish_kpi(draft_id: str):
    drafts = fetch_all(
        f"SELECT * FROM {table('kpi_drafts')} WHERE draft_id = ? AND is_deleted = false",
        (draft_id,),
    )

    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft = drafts[0]
    kpi_id = str(uuid.uuid4())
    now = datetime.utcnow()

    insert_query = f"""
        INSERT INTO {table("kpi_master")} (
            kpi_id, kpi_name, description, business_formula, sql_definition,
            category, frequency, owner_team, data_source, business_unit,
            status, is_published, is_deleted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', true, false, ?, ?)
    """

    execute(
        insert_query,
        (
            kpi_id,
            draft.get("kpi_name"),
            draft.get("description"),
            draft.get("business_formula"),
            draft.get("sql_definition"),
            draft.get("category"),
            draft.get("frequency"),
            draft.get("owner_team"),
            draft.get("data_source"),
            draft.get("business_unit"),
            now,
            now,
        ),
    )

    execute(f"DELETE FROM {table('kpi_drafts')} WHERE draft_id = ?", (draft_id,))

    return {"kpi_id": kpi_id, "message": "KPI published successfully"}


# ==============================
# Reports + Usage
# ==============================


def _load_report_with_kpis(report_row: dict) -> ReportResponse:
    kpis = fetch_all(
        f"""
        SELECT rk.kpi_id, km.kpi_name AS name
        FROM {table("report_kpis")} rk
        LEFT JOIN {table("kpi_master")} km
          ON rk.kpi_id = km.kpi_id
        WHERE rk.report_id = ?
        """,
        (report_row["report_id"],),
    )
    return ReportResponse(
        report_id=report_row["report_id"],
        report_name=report_row["report_name"],
        description=report_row.get("description"),
        created_by=report_row.get("created_by"),
        created_at=report_row.get("created_at"),
        updated_at=report_row.get("updated_at"),
        kpis=[ReportKPI(kpi_id=r["kpi_id"], name=r.get("name")) for r in kpis],
    )


def _touch_kpi_last_used(kpi_ids: List[str]):
    if not kpi_ids:
        return
    now = datetime.utcnow()
    placeholders = ",".join(["?"] * len(kpi_ids))
    execute(
        f"""
        UPDATE {table("kpi_master")}
        SET last_used_at = ?
        WHERE kpi_id IN ({placeholders})
        """,
        (now, *kpi_ids),
    )


@app.post("/reports", response_model=ReportResponse)
def create_report(payload: ReportCreate):
    report_id = str(uuid.uuid4())
    now = datetime.utcnow()

    execute(
        f"""
        INSERT INTO {table("reports")} (
            report_id, report_name, description,
            created_by, created_at, updated_at, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, false)
        """,
        (report_id, payload.report_name, payload.description, payload.created_by, now, now),
    )

    for kpi_id in payload.kpi_ids:
        execute(
            f"""
            INSERT INTO {table("report_kpis")} (report_id, kpi_id, added_at)
            VALUES (?, ?, ?)
            """,
            (report_id, kpi_id, now),
        )

    _touch_kpi_last_used(payload.kpi_ids)

    row = fetch_all(
        f"SELECT * FROM {table('reports')} WHERE report_id = ? AND is_deleted = false",
        (report_id,),
    )[0]
    return _load_report_with_kpis(row)


@app.get("/reports")
def list_reports(include_deleted: bool = False):
    try:
        where = "" if include_deleted else "WHERE is_deleted = false"
        rows = fetch_all(
            f"""
            SELECT *
            FROM {table("reports")}
            {where}
            ORDER BY updated_at DESC
            """
        )
        return [_load_report_with_kpis(r) for r in rows]
    except Exception as e:
        # #region agent log
        _dbg("main.py:list_reports", "error", {"error": str(e)})
        # #endregion
        return []


@app.get("/reports/{report_id}", response_model=ReportResponse)
def get_report(report_id: str):
    rows = fetch_all(
        f"""
        SELECT *
        FROM {table("reports")}
        WHERE report_id = ? AND is_deleted = false
        """,
        (report_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Report not found")
    return _load_report_with_kpis(rows[0])


@app.put("/reports/{report_id}", response_model=ReportResponse)
def update_report(report_id: str, payload: ReportUpdate):
    rows = fetch_all(
        f"""
        SELECT *
        FROM {table("reports")}
        WHERE report_id = ? AND is_deleted = false
        """,
        (report_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Report not found")

    current = rows[0]
    name = payload.report_name or current["report_name"]
    description = payload.description if payload.description is not None else current.get("description")
    now = datetime.utcnow()

    execute(
        f"""
        UPDATE {table("reports")}
        SET report_name = ?, description = ?, updated_at = ?
        WHERE report_id = ? AND is_deleted = false
        """,
        (name, description, now, report_id),
    )

    if payload.kpi_ids is not None:
        execute(f"DELETE FROM {table('report_kpis')} WHERE report_id = ?", (report_id,))
        for kpi_id in payload.kpi_ids:
            execute(
                f"""
                INSERT INTO {table("report_kpis")} (report_id, kpi_id, added_at)
                VALUES (?, ?, ?)
                """,
                (report_id, kpi_id, now),
            )
        _touch_kpi_last_used(payload.kpi_ids)

    updated = fetch_all(
        f"SELECT * FROM {table('reports')} WHERE report_id = ?",
        (report_id,),
    )[0]
    return _load_report_with_kpis(updated)


@app.delete("/reports/{report_id}")
def delete_report(report_id: str):
    execute(
        f"""
        UPDATE {table("reports")}
        SET is_deleted = true
        WHERE report_id = ?
        """,
        (report_id,),
    )
    return {"message": "Report deleted"}

# ==============================
# Data Source APIs (dynamic catalogs/schemas)
# ==============================

@app.get("/datasource/catalogs", response_model=List[CatalogItem])
def list_catalogs():
    """
    List all available Unity Catalog catalogs.
    """
    # #region agent log
    _dbg("main.py:list_catalogs", "called", {"DB_HOST": DATABRICKS_SERVER_HOSTNAME, "DB_HTTP_PATH": DATABRICKS_HTTP_PATH, "DB_TOKEN_set": bool(DATABRICKS_TOKEN)})
    # #endregion
    try:
        rows = fetch_all("SHOW CATALOGS")
        # #region agent log
        _dbg("main.py:list_catalogs", "success", {"row_count": len(rows), "sample": rows[:2] if rows else []})
        # #endregion
        return [CatalogItem(name=r.get("catalog") or r.get("catalog_name")) for r in rows]
    except Exception as e:
        # #region agent log
        _dbg("main.py:list_catalogs", "error", {"error": str(e), "error_type": type(e).__name__})
        # #endregion
        raise HTTPException(status_code=500, detail=f"SHOW CATALOGS failed: {e}")


@app.get("/datasource/schemas", response_model=List[SchemaItem])
def list_schemas(catalog: str):
    """
    List all schemas for a given catalog.
    """
    try:
        rows = fetch_all(f"SHOW SCHEMAS IN {catalog}")
        # Databricks returns column "databaseName" or "schema_name" depending on version
        items: List[SchemaItem] = []
        for r in rows:
            name = r.get("databaseName") or r.get("schema_name") or r.get("schema")
            if name:
                items.append(SchemaItem(catalog=catalog, name=name))
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/datasource/tables", response_model=TableListResponse)
def list_tables(schema: str, catalog: Optional[str] = None):
    """
    Get all tables + column definitions for selected catalog/schema.
    If catalog is not provided, default DB_CATALOG is used.
    """
    try:
        effective_schema = schema
        global DB_SCHEMA  # used for internal helpers
        if catalog:
            # temporarily override DB_CATALOG/DB_SCHEMA for helper
            original_catalog = DB_CATALOG
            original_schema = DB_SCHEMA
            try:
                # use fully qualified SHOW TABLES when catalog provided
                tables_query = f"SHOW TABLES IN {catalog}.{schema}"
                tables_raw = fetch_all(tables_query)
                tables: List[TableDef] = []
                for t in tables_raw:
                    table_name = t.get("tableName") or t.get("table_name")
                    if not table_name:
                        continue
                    desc_rows = fetch_all(f"DESCRIBE TABLE {catalog}.{schema}.{table_name}")
                    columns = [
                        {"name": _col_name(c), "type": _data_type(c)}
                        for c in desc_rows
                        if _col_name(c) and not _col_name(c).startswith("#")
                    ]
                    tables.append(
                        TableDef(
                            id=table_name,
                            name=table_name,
                            schema=schema,
                            columns=[ColumnDef(**col) for col in columns],
                        )
                    )
                return {"tables": tables}
            finally:
                DB_SCHEMA = original_schema
        else:
            # default: original helper using configured catalog/schema
            tables = get_tables_with_columns(effective_schema)
            return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/datasource/preview", response_model=TablePreviewResponse)
def preview_table(schema: str, table: str, catalog: Optional[str] = None):
    """
    Get top 10 preview rows from selected table (supports explicit catalog).
    """
    try:
        if catalog:
            preview_query = f"""
                SELECT *
                FROM {catalog}.{schema}.{table}
                LIMIT 10
            """
            rows = fetch_all(preview_query)
            if not rows:
                return {"columns": [], "rows": []}
            columns = list(rows[0].keys())
            return {"columns": columns, "rows": rows}
        return get_table_preview(schema, table)
    except Exception as e:
        return {"columns": [], "rows": []}

@app.post("/query/optimize")
def optimize_query(sql: str = Body(..., media_type="text/plain")):
    """
    Accept RAW SQL directly in body (no JSON escaping needed)
    """
    try:
        if not openai_client:
            optimized = optimize_sql(sql)
        else:
            optimized = openai_with_optimize(sql)
        print(optimized)
        return {"optimized_sql": optimized}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/query/genie")
def generate_sql_with_genie(req: GenieQueryRequest):
    """
    Generate SQL using Databricks Genie
    """
    try:
        table_identifier = f"{DB_CATALOG}.{DB_SCHEMA}.{req.table}"

        # minimal column metadata (Genie requires structure)
        desc_rows = fetch_all(f"DESCRIBE TABLE {table_identifier}")
        column_metadata = {
            _col_name(r): {"type": _data_type(r), "comment": ""}
            for r in desc_rows
            if _col_name(r) and not _col_name(r).startswith("#")
        }

        space_id, sql_text, error = ask_genie(
            table_identifier=table_identifier,
            column_metadata=column_metadata,
            prompt=req.prompt,
            warehouse_id=DATABRICKS_HTTP_PATH.split("/")[-1],
            host=DATABRICKS_SERVER_HOSTNAME,
            token=DATABRICKS_TOKEN,
        )

        if error:
            raise Exception(error)

        return {"sql": sql_text, "space_id": space_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/run")
def execute_query(req: ExecuteQueryRequest):
    """
    Execute SQL and return preview rows
    """
    try:
        return run_sql_query(req.sql, req.limit or 100)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# @app.post("/kpi/query-preparation")
# def query_preparation(req: QueryPreparationRequest):
#     """
#     Clean Swagger-friendly endpoint
#     """
#     try:
#         metadata_sig = generate_metadata_signature(req.sql)
#         lineage_sig = generate_lineage_signature(req.source_table or "unknown", req.columns)

#         duplicates = check_duplicate_kpi(metadata_sig)

#         if duplicates:
#             return {
#                 "duplicate": True,
#                 "existing_kpis": duplicates,
#             }

#         return {
#             "duplicate": False,
#             "metadata_signature": metadata_sig,
#             "lineage_signature": lineage_sig,
#         }

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/kpi/query-preparation")
def query_preparation(req: QueryPreparationRequest):
    try:
        # --- Generate signatures ---
        metadata_sig = generate_metadata_signature(req.sql)
        semantic_sig = generate_semantic_signature(req.sql)
        lineage_sig = generate_lineage_signature(
            req.source_table or "unknown",
            req.columns or [],
        )
        # #region agent log
        _dbg("main.py:query_preparation", "signatures", {"metadata_sig": metadata_sig, "semantic_sig": semantic_sig, "lineage_sig": lineage_sig, "sql_first100": req.sql[:100] if req.sql else ""})
        # #endregion

        # --- Duplicate detection ---
        duplicates = check_duplicate_kpi(metadata_sig, semantic_sig)

        if duplicates:
            return {
                "duplicate": True,
                "existing_kpis": duplicates,
                "metadata_signature": metadata_sig,
                "semantic_signature": semantic_sig,
            }

        return {
            "duplicate": False,
            "metadata_signature": metadata_sig,
            "semantic_signature": semantic_sig,
            "lineage_signature": lineage_sig,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/kpi/data-quality")
def run_dq_checks(req: DQCheckRequest):
    """
    Full enterprise Data Quality validation
    """

    try:
        preview = run_sql_query(req.sql, limit=1000)

        columns: List[str] = preview.get("columns", [])
        rows: List[Dict[str, Any]] = preview.get("rows", [])

        row_count = len(rows)

        # -------------------------
        # NULL CHECK
        # -------------------------
        null_counts = {
            col: sum(1 for r in rows if r.get(col) is None)
            for col in columns
        }

        null_failed = any(v > 0 for v in null_counts.values())

        # -------------------------
        # DUPLICATE CHECK
        # (row-level duplicate detection)
        # -------------------------
        seen = set()
        duplicate_count = 0

        for r in rows:
            key = tuple(r.get(c) for c in columns)
            if key in seen:
                duplicate_count += 1
            else:
                seen.add(key)

        duplicate_failed = duplicate_count > 0

        # -------------------------
        # TYPE ALIGNMENT CHECK
        # (basic inference)
        # -------------------------
        type_mismatch = False

        for col in columns:
            values = [r.get(col) for r in rows if r.get(col) is not None]

            if not values:
                continue

            inferred_type = type(values[0]).__name__

            for v in values:
                if type(v).__name__ != inferred_type:
                    type_mismatch = True
                    break

        # -------------------------
        # ROW COUNT CHECK
        # -------------------------
        row_count_failed = row_count == 0

        # -------------------------
        # BUILD CHECK LIST
        # (for React Phase-2 UI)
        # -------------------------
        checks = [
            {
                "name": "NULL Detection",
                "status": "failed" if null_failed else "passed",
                "message": f"Null counts: {null_counts}",
            },
            {
                "name": "Row Count Validation",
                "status": "failed" if row_count_failed else "passed",
                "message": f"Row count = {row_count}",
            },
            {
                "name": "Type Alignment",
                "status": "failed" if type_mismatch else "passed",
                "message": "Column types consistent"
                if not type_mismatch
                else "Type mismatch detected",
            },
            {
                "name": "Duplicate Detection",
                "status": "failed" if duplicate_failed else "passed",
                "message": f"{duplicate_count} duplicate rows found",
            },
        ]

        # -------------------------
        # FINAL PASS / FAIL
        # -------------------------
        passed = not any(c["status"] == "failed" for c in checks)

        return {
            "row_count": row_count,
            "null_counts": null_counts,
            "duplicate_count": duplicate_count,
            "checks": checks,
            "passed": passed,
            "status": "PASS" if passed else "FAIL",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/kpi/publish-final")
def publish_final_kpi(req: PublishKPIRequest):
    """
    Insert KPI into kpi_master + kpi_values
    """
    try:
        kpi_id = generate_kpi_id()
        now = datetime.utcnow()
        # #region agent log
        _dbg("main.py:publish_final_kpi", "called", {"kpi_id": kpi_id, "kpi_name": req.kpi_name, "target_table": table("kpi_master")})
        # #endregion

        # -----------------------------
        # Ensure kpi_master table exists + get columns, then INSERT
        # -----------------------------
        actual_cols = _ensure_kpi_master(table("kpi_master"))
        actual_cols_lower = {c.lower() for c in actual_cols}

        value_map = {
            "kpi_id": kpi_id,
            "kpi_name": req.kpi_name,
            "description": req.description,
            "business_formula": req.business_formula,
            "sql_definition": req.sql,
            "category": req.category,
            "status": "Active",
            "frequency": req.frequency,
            "owner_team": req.owner_team,
            "data_source": req.data_source,
            "business_unit": req.business_unit,
            "complexity": req.complexity,
            "quality_score": req.quality_score,
            "linked_assets": req.linked_assets,
            "next_update": req.next_update,
            "is_published": True,
            "is_deleted": False,
            "created_at": now,
            "updated_at": now,
            "metadata_signature": req.metadata_signature,
            "semantic_signature": req.semantic_signature,
            "lineage_signature": req.lineage_signature,
            "storage_status": "active",
            "last_used_at": now,
            "moved_to_cold_at": None,
            "cold_move_count": 0,
        }

        insert_cols = [c for c in value_map if c.lower() in actual_cols_lower]
        # #region agent log
        _dbg("main.py:publish_final_kpi", "inserting", {"kpi_id": kpi_id, "actual_cols": actual_cols, "insert_cols": insert_cols})
        # #endregion
        if not insert_cols:
            raise HTTPException(status_code=500, detail=f"kpi_master has columns {actual_cols} but none match expected columns")

        placeholders = ", ".join(["?"] * len(insert_cols))
        col_sql = ", ".join(insert_cols)
        params = tuple(value_map[c] for c in insert_cols)

        execute(
            f"INSERT INTO {table('kpi_master')} ({col_sql}) VALUES ({placeholders})",
            params,
        )

        # -----------------------------
        # Execute KPI query → store values (optional — kpi_values may not exist)
        # -----------------------------
        rows_inserted = 0
        try:
            result = run_sql_query(req.sql, limit=10000)
            for row in result["rows"]:
                execute(
                    f"""
                    INSERT INTO {table("kpi_values")}
                    (kpi_id, created_at, value_json)
                    VALUES (?, ?, ?)
                    """,
                    (kpi_id, now, json.dumps(row, default=decimal_serializer)),
                )
            rows_inserted = len(result["rows"])
        except Exception:
            pass

        return {
            "kpi_id": kpi_id,
            "rows_inserted": rows_inserted,
            "message": "KPI published successfully",
        }

    except Exception as e:
        # #region agent log
        _dbg("main.py:publish_final_kpi", "ERROR", {"error": str(e), "type": type(e).__name__})
        # #endregion
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# KPI Usage Metrics
# ==============================


@app.get("/kpis/{kpi_id}/metrics")
def get_kpi_metrics(kpi_id: str):
    kpi_rows = fetch_all(
        f"""
        SELECT
          kpi_id,
          kpi_name,
          owner_team,
          created_at,
          last_used_at,
          storage_status,
          cold_move_count
        FROM {table("kpi_master")}
        WHERE kpi_id = ? AND is_deleted = false
        """,
        (kpi_id,),
    )
    if not kpi_rows:
        raise HTTPException(status_code=404, detail="KPI not found")

    kpi = kpi_rows[0]

    total_reports = 0
    reports_using = 0
    try:
        totals = fetch_all(
            f"""
            SELECT COUNT(DISTINCT report_id) AS total_reports
            FROM {table("reports")}
            WHERE is_deleted = false
            """
        )
        if totals:
            total_reports = totals[0].get("total_reports") or 0
    except Exception:
        pass

    try:
        usage = fetch_all(
            f"""
            SELECT COUNT(DISTINCT report_id) AS reports_using
            FROM {table("report_kpis")}
            WHERE kpi_id = ?
            """,
            (kpi_id,),
        )
        if usage:
            reports_using = usage[0].get("reports_using") or 0
    except Exception:
        pass

    usage_percentage = float(reports_using) / float(total_reports) * 100.0 if total_reports > 0 else 0.0

    return {
        "kpi_id": kpi["kpi_id"],
        "kpi_name": kpi["kpi_name"],
        "owner_team": kpi.get("owner_team"),
        "created_at": str(kpi.get("created_at")) if kpi.get("created_at") else None,
        "last_used_at": str(kpi.get("last_used_at")) if kpi.get("last_used_at") else None,
        "storage_status": kpi.get("storage_status"),
        "cold_move_count": kpi.get("cold_move_count") or 0,
        "reports_using": reports_using,
        "total_reports": total_reports,
        "usage_percentage": usage_percentage,
    }


# ==============================
# Notifications + Cold Storage
# ==============================


def _insert_notification(
    user_id: str,
    role: str,
    type_: str,
    title: str,
    body: str,
    related_kpi_id: Optional[str] = None,
    related_id: Optional[str] = None,
):
    notification_id = str(uuid.uuid4())
    now = datetime.utcnow()
    execute(
        f"""
        INSERT INTO {table("notifications")} (
            notification_id, user_id, role, type,
            title, body, related_kpi_id, related_id,
            is_read, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, false, ?)
        """,
        (notification_id, user_id, role, type_, title, body, related_kpi_id, related_id, now),
    )
    return notification_id


@app.get("/notifications", response_model=List[Notification])
def list_notifications(user_id: str):
    rows = fetch_all(
        f"""
        SELECT *
        FROM {table("notifications")}
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (user_id,),
    )
    return [
        Notification(
            notification_id=r["notification_id"],
            user_id=r["user_id"],
            role=r.get("role"),
            type=r["type"],
            title=r["title"],
            body=r["body"],
            related_kpi_id=r.get("related_kpi_id"),
            related_id=r.get("related_id"),
            is_read=bool(r.get("is_read", False)),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@app.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str):
    execute(
        f"""
        UPDATE {table("notifications")}
        SET is_read = true
        WHERE notification_id = ?
        """,
        (notification_id,),
    )
    return {"message": "Notification marked as read"}


@app.post("/cold-storage/run")
def run_cold_storage(config: ColdStorageRunConfig):
    """
    One-shot execution of cold storage logic.
    Intended to be triggered by a scheduler or manually.
    """
    now = datetime.utcnow()
    admin_id = config.admin_user_id or "admin"

    # 1) Move inactive KPIs to cold storage
    inactive_threshold = now.replace(microsecond=0)  # simplify comparison
    inactive_sql = f"""
        SELECT kpi_id, kpi_name, owner_team
        FROM {table("kpi_master")}
        WHERE is_deleted = false
          AND (storage_status IS NULL OR storage_status = 'active')
          AND (
                last_used_at IS NULL
                OR last_used_at < date_sub(current_timestamp(), {config.inactive_days_to_cold})
          )
    """
    to_cold = fetch_all(inactive_sql)

    for k in to_cold:
        execute(
            f"""
            UPDATE {table("kpi_master")}
            SET storage_status = 'cold',
                moved_to_cold_at = current_timestamp(),
                cold_move_count = COALESCE(cold_move_count, 0) + 1
            WHERE kpi_id = ?
            """,
            (k["kpi_id"],),
        )

        # notify admin and owner
        owner_id = k.get("owner_team") or "owner"
        title = f"KPI moved to cold storage: {k['kpi_name']}"
        body = f"KPI {k['kpi_name']} ({k['kpi_id']}) has been moved to cold storage due to inactivity."
        _insert_notification(admin_id, "admin", "moved_to_cold", title, body, related_kpi_id=k["kpi_id"])
        _insert_notification(owner_id, "owner", "moved_to_cold", title, body, related_kpi_id=k["kpi_id"])

    # 2) For KPIs in cold for >= Y days with no decision, create pending decisions
    decisions_sql = f"""
        SELECT kpi_id, kpi_name, owner_team
        FROM {table("kpi_master")}
        WHERE is_deleted = false
          AND storage_status = 'cold'
          AND moved_to_cold_at IS NOT NULL
          AND moved_to_cold_at < date_sub(current_timestamp(), {config.cold_days_to_decision})
          AND kpi_id NOT IN (
              SELECT kpi_id
              FROM {table("cold_storage_decisions")}
              WHERE status = 'open'
          )
    """
    needing_decision = fetch_all(decisions_sql)

    for k in needing_decision:
        decision_id = str(uuid.uuid4())
        owner_id = k.get("owner_team") or "owner"
        execute(
            f"""
            INSERT INTO {table("cold_storage_decisions")} (
                decision_id, kpi_id, owner_choice,
                requested_by, requested_at,
                approver_decision, decided_by, decided_at, status
            ) VALUES (?, ?, NULL, ?, current_timestamp(), 'pending', NULL, NULL, 'open')
            """,
            (decision_id, k["kpi_id"], owner_id),
        )

        title = f"Action required for KPI in cold storage: {k['kpi_name']}"
        body = (
            f"Your KPI {k['kpi_name']} ({k['kpi_id']}) has been in cold storage for "
            f"{config.cold_days_to_decision} days. Choose: Delete, Move back, or Keep in cold."
        )
        _insert_notification(owner_id, "owner", "owner_choice", title, body, related_kpi_id=k["kpi_id"], related_id=decision_id)

    return {
        "moved_to_cold": len(to_cold),
        "pending_decisions_created": len(needing_decision),
    }


@app.post("/cold-storage/owner-decision")
def owner_decision(req: OwnerDecisionRequest):
    """
    KPI Owner submits a choice for a KPI in cold storage.
    """
    if req.choice not in ("delete", "move_back", "keep_cold"):
        raise HTTPException(status_code=400, detail="Invalid choice")

    rows = fetch_all(
        f"""
        SELECT *
        FROM {table("cold_storage_decisions")}
        WHERE kpi_id = ?
          AND status = 'open'
          AND approver_decision = 'pending'
        ORDER BY requested_at DESC
        LIMIT 1
        """,
        (req.kpi_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="No open decision for KPI")

    decision = rows[0]
    decision_id = decision["decision_id"]

    execute(
        f"""
        UPDATE {table("cold_storage_decisions")}
        SET owner_choice = ?
        WHERE decision_id = ?
        """,
        (req.choice, decision_id),
    )

    # notify admin that owner has made a choice
    title = f"KPI owner decision for KPI {req.kpi_id}"
    body = f"Owner {req.owner_id} requested action '{req.choice}' for KPI {req.kpi_id}."
    _insert_notification("admin", "admin", "approval_request", title, body, related_kpi_id=req.kpi_id, related_id=decision_id)

    return {"decision_id": decision_id, "message": "Owner decision recorded"}


@app.post("/cold-storage/approve")
def approve_cold_storage(req: ApprovalRequest):
    """
    Admin approves or rejects the owner's cold storage decision.
    """
    rows = fetch_all(
        f"""
        SELECT *
        FROM {table("cold_storage_decisions")}
        WHERE decision_id = ?
          AND status = 'open'
        """,
        (req.decision_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Decision not found or already closed")

    decision = rows[0]
    kpi_id = decision["kpi_id"]
    owner_choice = decision.get("owner_choice")

    if not owner_choice:
        raise HTTPException(status_code=400, detail="Owner choice not set yet")

    decision_str = "approved" if req.approve else "rejected"

    execute(
        f"""
        UPDATE {table("cold_storage_decisions")}
        SET approver_decision = ?, decided_by = ?, decided_at = current_timestamp(),
            status = 'closed'
        WHERE decision_id = ?
        """,
        (decision_str, req.approver_id, req.decision_id),
    )

    # apply action if approved
    if req.approve:
        if owner_choice == "delete":
            execute(
                f"""
                UPDATE {table("kpi_master")}
                SET is_deleted = true
                WHERE kpi_id = ?
                """,
                (kpi_id,),
            )
        elif owner_choice == "move_back":
            execute(
                f"""
                UPDATE {table("kpi_master")}
                SET storage_status = 'active',
                    moved_to_cold_at = NULL
                WHERE kpi_id = ?
                """,
                (kpi_id,),
            )
        elif owner_choice == "keep_cold":
            # no change to storage_status, just keep in cold
            pass

    # notify owner of result
    owner_id = decision.get("requested_by") or "owner"
    title = f"Admin {decision_str} your request for KPI {kpi_id}"
    body = f"Your requested action '{owner_choice}' on KPI {kpi_id} was {decision_str} by {req.approver_id}."
    _insert_notification(owner_id, "owner", "approval_result", title, body, related_kpi_id=kpi_id, related_id=req.decision_id)

    return {"message": f"Decision {decision_str}", "applied": bool(req.approve)}

# ================= REACT STATIC SERVING LAST =================
BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)
DIST_DIR = os.path.join(BASE_DIR, "dist")

print("BASE_DIR =", BASE_DIR)
print("DIST_DIR =", DIST_DIR)
print("DIST EXISTS =", os.path.isdir(DIST_DIR))

if os.path.isdir(DIST_DIR):

    # serve assets
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(DIST_DIR, "assets")),
        name="assets",
    )

    # root
    @app.get("/")
    async def root():
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

    # SPA fallback
    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        return FileResponse(os.path.join(DIST_DIR, "index.html"))