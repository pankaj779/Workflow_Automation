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
import threading


try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Hard-code the OpenAI API key so Databricks Apps doesn’t need secrets.
HARDCODED_OPENAI_KEY = "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"

# Prefer OPENAI_API_KEY from .env (load_dotenv runs first). Add OPENAI_API_KEY to .env to use your own key.
_env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=_env_path)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or HARDCODED_OPENAI_KEY

if OPENAI_AVAILABLE and OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
else:
    openai_client = None


# ==============================
# Load ENV (already loaded above for OpenAI)
# ==============================

# ==============================
# Databricks Config
# ==============================
DATABRICKS_SERVER_HOSTNAME = os.getenv("DB_HOST")
DATABRICKS_HTTP_PATH = os.getenv("DB_HTTP_PATH")
DATABRICKS_TOKEN = os.getenv("DB_TOKEN")

# #region agent log
import time as _time
_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "debug-e56ee5.log")
_DEBUG_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "debug-f798bc.log")
def _dbg(loc, msg, data=None):
    import json as _j
    try:
        with open(_LOG_FILE, "a") as _f:
            _f.write(_j.dumps({"sessionId":"e56ee5","location":loc,"message":msg,"data":data or {},"timestamp":int(_time.time()*1000)})+"\n")
    except: pass


def _agent_dbg(location: str, message: str, data=None, run_id: str = "pre-fix", hypothesis_id: str = "H1"):
    import json as _j
    payload = {
        "sessionId": "f798bc",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data or {},
        "timestamp": int(_time.time() * 1000),
    }
    try:
        with open(_DEBUG_LOG_FILE, "a", encoding="utf-8") as _f:
            _f.write(_j.dumps(payload) + "\n")
    except Exception:
        pass
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

# Admin emails (comma-separated). Users in this list get admin role for RBAC.
_ADMIN_EMAILS_RAW = os.getenv("ADMIN_EMAILS", "")
ADMIN_EMAILS: set = {e.strip().lower() for e in _ADMIN_EMAILS_RAW.split(",") if e.strip()}


def _get_current_user_email(request: Request) -> str:
    """Extract current user email from request (Databricks X-Forwarded-Email or LOCAL_USER_EMAIL)."""
    return (
        request.headers.get("X-Forwarded-Email")
        or request.headers.get("X-Forwarded-User")
        or LOCAL_USER_EMAIL
    )


def _is_admin(email: str) -> bool:
    """Check if email is in admin list."""
    if not email:
        return False
    return email.strip().lower() in ADMIN_EMAILS


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


# Automatic cold-storage scheduler config (env-driven)
COLD_STORAGE_AUTO_ENABLED = os.getenv("COLD_STORAGE_AUTO_ENABLED", "true").strip().lower() in ("1", "true", "yes", "on")
COLD_STORAGE_LOOP_SECONDS = _env_int("COLD_STORAGE_LOOP_SECONDS", 60)
COLD_STORAGE_INACTIVE_DAYS = _env_int("COLD_STORAGE_INACTIVE_DAYS", 7)
COLD_STORAGE_DECISION_DAYS = _env_int("COLD_STORAGE_DECISION_DAYS", 2)
COLD_STORAGE_INACTIVE_MINUTES = _env_int("COLD_STORAGE_INACTIVE_MINUTES", 10)
COLD_STORAGE_DECISION_MINUTES = _env_int("COLD_STORAGE_DECISION_MINUTES", 5)
COLD_STORAGE_REMINDER_MINUTES = _env_int("COLD_STORAGE_REMINDER_MINUTES", 1)
COLD_STORAGE_OWNER_RESPONSE_DAYS = _env_int("COLD_STORAGE_OWNER_RESPONSE_DAYS", 3)
COLD_STORAGE_OWNER_RESPONSE_MINUTES = _env_int("COLD_STORAGE_OWNER_RESPONSE_MINUTES", 0)  # 0 = use days

_cold_storage_scheduler_started = False

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
        kpi_id STRING,
        related_kpi_id STRING,
        related_id STRING
    """,
    "kpi_values": """
        kpi_id STRING,
        created_at TIMESTAMP,
        value_json STRING
    """,
    "cold_storage_decisions": """
        decision_id STRING,
        kpi_id STRING,
        owner_email STRING,
        owner_action STRING,
        admin_email STRING,
        admin_action STRING,
        created_at TIMESTAMP,
        resolved_at TIMESTAMP,
        owner_choice STRING,
        requested_by STRING,
        requested_at TIMESTAMP,
        approver_decision STRING,
        decided_by STRING,
        decided_at TIMESTAMP,
        status STRING,
        last_reminder_at TIMESTAMP
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
    _start_cold_storage_scheduler()


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
    email = _get_current_user_email(request)
    is_admin = _is_admin(email)
    return {
        "email": email,
        "role": "admin" if is_admin else "user",
        "isAdmin": is_admin,
    }


@app.get("/health/openai")
def health_openai():
    """
    Test if OpenAI API is reachable and API key is valid.
    Returns: { "ok": bool, "message": str }
    """
    if not openai_client:
        return {"ok": False, "message": "OpenAI client not configured (missing import or API key)"}
    try:
        openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=5,
        )
        return {"ok": True, "message": "OpenAI API is reachable and API key is valid"}
    except Exception as e:
        err = str(e).lower()
        if "invalid" in err or "api_key" in err or "authentication" in err:
            msg = "Invalid or expired OpenAI API key"
        elif "rate" in err or "limit" in err:
            msg = "OpenAI rate limit exceeded"
        elif "connection" in err or "timeout" in err:
            msg = "OpenAI connection failed (network/timeout)"
        else:
            msg = f"OpenAI error: {str(e)[:80]}"
        return {"ok": False, "message": msg}


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
    table: str  # Legacy: single table name (uses DB_CATALOG.DB_SCHEMA.table)
    table_identifiers: Optional[List[str]] = None  # Full catalog.schema.table for single or multi-table

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
    prompt: Optional[str] = None  # Genie prompt - used for prompt-based semantic signature when available

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
    # Optional minute-based windows for test mode
    inactive_minutes_to_cold: Optional[int] = None
    cold_minutes_to_decision: Optional[int] = None
    reminder_minutes_interval: Optional[int] = None
    owner_response_days: Optional[int] = None
    owner_response_minutes: Optional[int] = None


class OwnerDecisionRequest(BaseModel):
    kpi_id: str
    owner_id: Optional[str] = None  # Optional; backend uses current user from Request when not provided
    choice: str  # delete | move_back | keep_cold


class ApprovalRequest(BaseModel):
    decision_id: str
    approver_id: Optional[str] = None  # Optional; backend uses current user from Request when not provided
    approve: bool


class AdminWarnOwnerRequest(BaseModel):
    decision_id: str
    custom_message: Optional[str] = None  # If provided, use as body; else use default warning


class AdminActionRequest(BaseModel):
    decision_id: str
    action: str  # delete | move_back | keep_cold

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


def _normalize_prompt_for_signature(prompt: str) -> str:
    """Normalize prompt for consistent semantic hashing. Preserves intent, removes noise."""
    if not prompt or not prompt.strip():
        return ""
    t = prompt.strip().lower()
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def generate_semantic_signature(sql_query: str, prompt: Optional[str] = None) -> str:
    """
    Best-in-class semantic signature for duplicate detection.
    Uses logical essence (tables, columns, filters, partitions) so equivalent queries
    (e.g. correlated subquery vs CTE+ROW_NUMBER, optimized vs original) produce the same signature.
    IMPORTANT: Uses SQL-only essence (prompt is ignored) so that duplicate detection
    matches on logical equivalence regardless of how the query was created or optimized.
    """
    from .semantic_sql import extract_logical_essence, normalize_sql_for_essence

    sql_part = ""
    if sql_query and sql_query.strip():
        essence = extract_logical_essence(sql_query)
        sql_part = essence if essence else normalize_sql_for_essence(sql_query)

    if not sql_part:
        return ""

    combined = "s:" + sql_part
    sig = hashlib.sha256(combined.encode("utf-8")).hexdigest()[:16]
    _dbg("main.py:generate_semantic_signature", "combined", {"sql_len": len(sql_part), "sig": sig})
    return sig
    
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
    """
    Returns list of duplicates with kpi_name, and which signature matched.
    Each item: {"kpi_name": str, "matched_signature_type": "metadata"|"semantic", "matched_signature": str}
    """
    try:
        seen = set()
        result = []
        meta_query = f"""
            SELECT kpi_name FROM {table("kpi_master")}
            WHERE metadata_signature = ? AND is_deleted = false
        """
        for row in fetch_all(meta_query, (metadata_signature,)):
            k = row["kpi_name"]
            if k not in seen:
                seen.add(k)
                result.append({"kpi_name": k, "matched_signature_type": "metadata", "matched_signature": metadata_signature})
        sem_query = f"""
            SELECT kpi_name FROM {table("kpi_master")}
            WHERE semantic_signature = ? AND is_deleted = false
        """
        for row in fetch_all(sem_query, (semantic_signature,)):
            k = row["kpi_name"]
            if k not in seen:
                seen.add(k)
                result.append({"kpi_name": k, "matched_signature_type": "semantic", "matched_signature": semantic_signature})
        # #region agent log
        _dbg("main.py:check_duplicate_kpi", "result", {"metadata_sig": metadata_signature, "semantic_sig": semantic_signature, "duplicates_found": len(result)})
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

def _sqlglot_format(sql_text: str) -> str:
    """Use sqlglot to format SQL (proper indentation, consistent spacing)."""
    try:
        import sqlglot
        parsed = sqlglot.parse_one(sql_text.strip())
        return parsed.sql(dialect="databricks", pretty=True)
    except Exception:
        return " ".join(sql_text.strip().split())


def optimize_sql(sql_text: str) -> str:
    """
    Format and normalize SQL using sqlglot when available; fallback to whitespace join.
    """
    return _sqlglot_format(sql_text)


def openai_with_optimize(sql_text: str, user_prompt: Optional[str] = None) -> Dict[str, Any]:
    """
    Use OpenAI to optimize SQL. Returns {optimized_sql, optimization_score (0-100), changes_made: [...]}.
    """
    user_context = ""
    if user_prompt:
        user_context = f"""
USER'S INTENT (MUST apply): {json.dumps(user_prompt)}
- "Give first 2 rows" -> ADD LIMIT 2; "last week" -> add date filter; etc."""
    else:
        user_context = """
You MUST make STRUCTURAL optimizations, not just formatting. Consider:
1. FIX BUGS: typos (kpt->kpi, tz->t2), wrong table aliases, invalid references
2. REWRITE: correlated subqueries -> JOINs/CTEs; redundant predicates removal
3. ADD: LIMIT for preview queries if missing; predicate pushdown
4. IMPROVE: combine AND conditions; use EXISTS instead of IN when beneficial
Formatting alone = 0 score. At least one structural change required."""
    prompt = f"""You are a Databricks SQL optimizer. OPTIMIZE the query structurally, not just format it.

Query:
{json.dumps(sql_text)}

{user_context}

Return ONLY valid JSON with this exact structure:
{{"optimized_query": "<SQL string>", "optimization_score": <0-100>, "changes_made": ["change1", "change2", ...]}}

Score guide: 0=format only, 20=typo fix, 40=minor rewrite, 60=subquery→JOIN, 80=major restructure, 100=best practice rewrite.
changes_made: list what you did (e.g. "Fixed typo kpt_value->kpi_value", "Converted subquery to JOIN")."""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Produce only valid JSON. No markdown, no explanation."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1200
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        if content.endswith("```"):
            content = content[:-3].strip()
        result = json.loads(content)
        optimized = result.get("optimized_query", "").strip()
        if not optimized:
            raise ValueError("Missing optimized_query")
        score = result.get("optimization_score")
        if not isinstance(score, (int, float)):
            score = 50
        score = max(0, min(100, int(score)))
        changes = result.get("changes_made")
        if not isinstance(changes, list):
            changes = ["Optimization applied"] if score > 0 else ["Formatting only"]
        return {
            "optimized_sql": optimized,
            "optimization_score": score,
            "changes_made": changes[:10],
        }
    except Exception as ex:
        err_msg = str(ex).lower()
        if "invalid" in err_msg or "api_key" in err_msg or "authentication" in err_msg:
            hint = "Invalid or expired OpenAI API key — check /health/openai"
        elif "rate" in err_msg or "limit" in err_msg:
            hint = "OpenAI rate limit exceeded"
        else:
            hint = "OpenAI unavailable or failed — check /health/openai for details"
        fallback = optimize_sql(sql_text)
        return {
            "optimized_sql": fallback,
            "optimization_score": 0,
            "changes_made": [f"Format only — {hint}"],
        }

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


_KPI_VALUES_DDL = """
    kpi_id STRING,
    created_at TIMESTAMP,
    value_json STRING
"""


def _ensure_kpi_values(fully_qualified: str) -> None:
    """Create kpi_values table if it does not exist."""
    try:
        _get_table_columns(fully_qualified)
    except Exception:
        try:
            execute(f"CREATE TABLE IF NOT EXISTS {fully_qualified} ({_KPI_VALUES_DDL.strip()})")
            _dbg("main.py:_ensure_kpi_values", "created_table", {"table": fully_qualified})
        except Exception as e:
            _dbg("main.py:_ensure_kpi_values", "create_failed", {"table": fully_qualified, "error": str(e)})
            raise


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
            next_update           AS nextUpdate,
            storage_status        AS storage_status,
            moved_to_cold_at      AS moved_to_cold_at
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


@app.get("/reports/{report_id}/data")
def get_report_data(report_id: str):
    """
    Returns report with KPI data for charts. Each KPI has rows from kpi_values
    or from executing sql_definition if kpi_values is empty.
    """
    rows = fetch_all(
        f"""
        SELECT * FROM {table("reports")}
        WHERE report_id = ? AND is_deleted = false
        """,
        (report_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Report not found")
    report = rows[0]

    kpi_ids = fetch_all(
        f"SELECT kpi_id FROM {table('report_kpis')} WHERE report_id = ? ORDER BY added_at",
        (report_id,),
    )
    kpi_ids = [r["kpi_id"] for r in kpi_ids]

    kpis_with_data = []
    for kpi_id in kpi_ids:
        km = fetch_all(
            f"SELECT kpi_id, kpi_name, sql_definition FROM {table('kpi_master')} WHERE kpi_id = ? AND is_deleted = false",
            (kpi_id,),
        )
        if not km:
            continue
        kpi_name = km[0].get("kpi_name", kpi_id)
        sql_def = km[0].get("sql_definition")

        rows_data = []
        try:
            kv_rows = fetch_all(
                f"SELECT value_json FROM {table('kpi_values')} WHERE kpi_id = ? ORDER BY created_at",
                (kpi_id,),
            )
            if kv_rows:
                for r in kv_rows:
                    try:
                        rows_data.append(json.loads(r["value_json"]))
                    except Exception:
                        pass
            if not rows_data and sql_def:
                result = run_sql_query(sql_def, limit=500)
                rows_data = result.get("rows", [])
        except Exception:
            if sql_def:
                try:
                    result = run_sql_query(sql_def, limit=500)
                    rows_data = result.get("rows", [])
                except Exception:
                    rows_data = []

        kpis_with_data.append({
            "kpi_id": kpi_id,
            "kpi_name": kpi_name,
            "rows": rows_data,
        })

    return {
        "report_id": report["report_id"],
        "report_name": report["report_name"],
        "description": report.get("description"),
        "kpis": kpis_with_data,
    }


@app.get("/kpis/{kpi_id}/values")
def get_kpi_values(kpi_id: str):
    """
    Returns KPI metric values for charts. From kpi_values, or by executing sql_definition if empty.
    """
    km = fetch_all(
        f"SELECT kpi_id, kpi_name, sql_definition FROM {table('kpi_master')} WHERE kpi_id = ? AND is_deleted = false",
        (kpi_id,),
    )
    if not km:
        raise HTTPException(status_code=404, detail="KPI not found")

    rows_data = []
    try:
        kv_rows = fetch_all(
            f"SELECT value_json FROM {table('kpi_values')} WHERE kpi_id = ? ORDER BY created_at",
            (kpi_id,),
        )
        if kv_rows:
            for r in kv_rows:
                try:
                    rows_data.append(json.loads(r["value_json"]))
                except Exception:
                    pass
        if not rows_data and km[0].get("sql_definition"):
            result = run_sql_query(km[0]["sql_definition"], limit=500)
            rows_data = result.get("rows", [])
    except Exception:
        if km[0].get("sql_definition"):
            try:
                result = run_sql_query(km[0]["sql_definition"], limit=500)
                rows_data = result.get("rows", [])
            except Exception:
                pass

    return {
        "kpi_id": kpi_id,
        "kpi_name": km[0].get("kpi_name", kpi_id),
        "rows": rows_data,
    }


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
def optimize_query(
    request: Request,
    sql: str = Body(..., media_type="text/plain"),
):
    """
    Accept RAW SQL in body. Optional ?prompt=... query param for user intent.
    Returns: optimized_sql, optimization_score (0-100), changes_made (list of changes).
    """
    try:
        user_prompt = request.query_params.get("prompt", "").strip() or None
        if not openai_client:
            formatted = optimize_sql(sql)
            return {
                "optimized_sql": formatted,
                "optimization_score": 0,
                "changes_made": ["Format only — OpenAI not configured"],
            }
        result = openai_with_optimize(sql, user_prompt=user_prompt)
        return {
            "optimized_sql": result["optimized_sql"],
            "optimization_score": result["optimization_score"],
            "changes_made": result["changes_made"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def _get_table_column_metadata(table_identifier: str) -> Dict[str, Dict]:
    """Fetch column metadata for a table via DESCRIBE."""
    try:
        desc_rows = fetch_all(f"DESCRIBE TABLE {table_identifier}")
        return {
            _col_name(r): {"type": _data_type(r), "comment": ""}
            for r in desc_rows
            if _col_name(r) and not _col_name(r).startswith("#")
        }
    except Exception as e:
        raise ValueError(f"Failed to describe table {table_identifier}: {e}") from e


@app.post("/query/genie")
def generate_sql_with_genie(req: GenieQueryRequest):
    """
    Generate SQL using Databricks Genie. Supports single or multiple tables from different schemas.
    Use table_identifiers for full catalog.schema.table (e.g. ["poc_workspace.gold_plus_datamart.t1", "poc_workspace.default.t2"]).
    """
    # #region agent log
    try:
        _agent_dbg(
            "main.py:genie:request",
            "genie request received",
            {"prompt_len": len(req.prompt or ""), "table": req.table, "table_identifiers": req.table_identifiers},
            run_id="genie-debug",
            hypothesis_id="H1",
        )
    except Exception:
        pass
    # #endregion
    try:
        tables_for_genie = []
        if req.table_identifiers and len(req.table_identifiers) > 0:
            for tid in req.table_identifiers:
                tid = (tid or "").strip()
                if not tid:
                    continue
                col_meta = _get_table_column_metadata(tid)
                if col_meta:
                    tables_for_genie.append((tid, col_meta))
                else:
                    raise ValueError(f"Table {tid} has no columns or does not exist")
            if not tables_for_genie:
                raise ValueError("No valid tables provided in table_identifiers")
        else:
            table_identifier = f"{DB_CATALOG}.{DB_SCHEMA}.{req.table}"
            col_meta = _get_table_column_metadata(table_identifier)
            if not col_meta:
                raise ValueError(f"Table {table_identifier} has no columns or does not exist")
            tables_for_genie = [(table_identifier, col_meta)]

        warehouse_id = (DATABRICKS_HTTP_PATH or "").split("/")[-1]
        if not warehouse_id:
            raise ValueError("DB_HTTP_PATH not configured (missing warehouse ID)")
        if not DATABRICKS_SERVER_HOSTNAME or not DATABRICKS_TOKEN:
            raise ValueError("DB_HOST and DB_TOKEN must be set for Genie")

        space_id, sql_text, error = ask_genie(
            table_identifier=tables_for_genie[0][0],
            column_metadata=tables_for_genie[0][1],
            prompt=req.prompt,
            warehouse_id=warehouse_id,
            host=DATABRICKS_SERVER_HOSTNAME,
            token=DATABRICKS_TOKEN,
            tables=tables_for_genie if len(tables_for_genie) > 1 else None,
        )

        if error:
            raise ValueError(error)
        if not sql_text:
            raise ValueError("Genie did not return SQL")

        return {"sql": sql_text, "space_id": space_id}

    except ValueError as e:
        # #region agent log
        try:
            _agent_dbg("main.py:genie:value_error", "genie ValueError", {"error": str(e)}, run_id="genie-debug", hypothesis_id="H2")
        except Exception:
            pass
        # #endregion
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        # #region agent log
        try:
            _agent_dbg("main.py:genie:exception", "genie Exception", {"error": str(e), "type": type(e).__name__}, run_id="genie-debug", hypothesis_id="H3")
        except Exception:
            pass
        # #endregion
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
        semantic_sig = generate_semantic_signature(req.sql, prompt=req.prompt)
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
            first = duplicates[0]
            return {
                "duplicate": True,
                "existing_kpis": [{"kpi_name": d["kpi_name"]} for d in duplicates],
                "matched_signature_type": first["matched_signature_type"],
                "matched_signature": first["matched_signature"],
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
        # Execute KPI query → store values in kpi_values (create table if not exists)
        # -----------------------------
        rows_inserted = 0
        try:
            _ensure_kpi_values(table("kpi_values"))
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
        except Exception as ex:
            _dbg("main.py:publish_final_kpi", "kpi_values_insert_failed", {"error": str(ex)})

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


def _notify_admins(
    type_: str,
    title: str,
    body: str,
    related_kpi_id: Optional[str] = None,
    related_id: Optional[str] = None,
):
    """Insert a notification for each admin. If no admins configured, notify 'admin' fallback."""
    if ADMIN_EMAILS:
        for admin_email in ADMIN_EMAILS:
            _insert_notification(admin_email, "admin", type_, title, body, related_kpi_id, related_id)
    else:
        _insert_notification("admin", "admin", type_, title, body, related_kpi_id, related_id)


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


@app.delete("/notifications/{notification_id}")
def delete_notification(notification_id: str, user_id: Optional[str] = None):
    # #region agent log
    _agent_dbg(
        "main.py:delete_notification:entry",
        "delete notification requested",
        {"notification_id": notification_id, "has_user_id": bool(user_id)},
        run_id="post-fix",
        hypothesis_id="H11",
    )
    # #endregion
    try:
        if user_id:
            execute(
                f"""
                DELETE FROM {table("notifications")}
                WHERE notification_id = ? AND user_id = ?
                """,
                (notification_id, user_id),
            )
        else:
            execute(
                f"""
                DELETE FROM {table("notifications")}
                WHERE notification_id = ?
                """,
                (notification_id,),
            )
        # #region agent log
        _agent_dbg(
            "main.py:delete_notification:success",
            "notification deleted",
            {"notification_id": notification_id},
            run_id="post-fix",
            hypothesis_id="H11",
        )
        # #endregion
        return {"message": "Notification deleted"}
    except Exception as ex:
        # #region agent log
        _agent_dbg(
            "main.py:delete_notification:error",
            "notification delete failed",
            {"notification_id": notification_id, "error": str(ex)},
            run_id="post-fix",
            hypothesis_id="H11",
        )
        # #endregion
        raise


def _run_cold_storage_core(config: ColdStorageRunConfig, run_source: str = "manual"):
    """
    One-shot execution of cold storage logic.
    Requires admin role when ADMIN_EMAILS is configured. Scheduler may use admin token.
    """
    # #region agent log
    _agent_dbg(
        "main.py:run_cold_storage:entry",
        "cold storage run request received",
        {
            "inactive_days_to_cold": config.inactive_days_to_cold,
            "cold_days_to_decision": config.cold_days_to_decision,
            "inactive_minutes_to_cold": config.inactive_minutes_to_cold,
            "cold_minutes_to_decision": config.cold_minutes_to_decision,
            "reminder_minutes_interval": config.reminder_minutes_interval,
            "run_source": run_source,
        },
        run_id="post-fix",
        hypothesis_id="H1",
    )
    # #endregion

    # Build dynamic windows: minute-based values override day-based values (for testing).
    inactive_cutoff_expr = (
        f"from_unixtime(unix_timestamp() - {int(config.inactive_minutes_to_cold) * 60})"
        if config.inactive_minutes_to_cold and int(config.inactive_minutes_to_cold) > 0
        else f"date_sub(current_timestamp(), {config.inactive_days_to_cold})"
    )
    decision_cutoff_expr = (
        f"from_unixtime(unix_timestamp() - {int(config.cold_minutes_to_decision) * 60})"
        if config.cold_minutes_to_decision and int(config.cold_minutes_to_decision) > 0
        else f"date_sub(current_timestamp(), {config.cold_days_to_decision})"
    )
    reminder_interval_seconds = (
        int(config.reminder_minutes_interval) * 60
        if config.reminder_minutes_interval and int(config.reminder_minutes_interval) > 0
        else 21600
    )
    owner_response_days = config.owner_response_days if config.owner_response_days is not None else COLD_STORAGE_OWNER_RESPONSE_DAYS
    owner_response_minutes = config.owner_response_minutes if config.owner_response_minutes is not None else COLD_STORAGE_OWNER_RESPONSE_MINUTES
    owner_response_cutoff_expr = (
        f"from_unixtime(unix_timestamp() - {int(owner_response_minutes) * 60})"
        if owner_response_minutes and int(owner_response_minutes) > 0
        else f"date_sub(current_timestamp(), {owner_response_days})"
    )

    # #region agent log
    _agent_dbg(
        "main.py:run_cold_storage:computed-windows",
        "computed cold storage timing windows",
        {
            "inactive_cutoff_expr": inactive_cutoff_expr,
            "decision_cutoff_expr": decision_cutoff_expr,
            "reminder_interval_seconds": reminder_interval_seconds,
            "mode": "minutes" if config.inactive_minutes_to_cold or config.cold_minutes_to_decision else "days",
        },
        run_id="post-fix",
        hypothesis_id="H5",
    )
    # #endregion

    # 1) Move inactive KPIs to cold storage
    inactive_sql = f"""
        SELECT kpi_id, kpi_name, owner_team
        FROM {table("kpi_master")}
        WHERE is_deleted = false
          AND (storage_status IS NULL OR storage_status = 'active')
          AND (
                last_used_at IS NULL
                OR last_used_at < {inactive_cutoff_expr}
          )
    """
    to_cold = fetch_all(inactive_sql)

    for k in to_cold:
        execute(
            f"""
            UPDATE {table("kpi_master")}
            SET storage_status = 'cold',
                status = 'Inactive',
                moved_to_cold_at = current_timestamp(),
                cold_move_count = COALESCE(cold_move_count, 0) + 1
            WHERE kpi_id = ?
            """,
            (k["kpi_id"],),
        )

        # notify all admins and owner
        owner_id = k.get("owner_team") or "owner"
        title = f"KPI moved to cold storage: {k['kpi_name']}"
        body = f"KPI {k['kpi_name']} ({k['kpi_id']}) has been moved to cold storage due to inactivity."
        _notify_admins("moved_to_cold", title, body, related_kpi_id=k["kpi_id"])
        _insert_notification(owner_id, "owner", "moved_to_cold", title, body, related_kpi_id=k["kpi_id"])

    # 2) For KPIs in cold for >= Y days with no decision, create pending decisions
    decisions_sql = f"""
        SELECT kpi_id, kpi_name, owner_team
        FROM {table("kpi_master")}
        WHERE is_deleted = false
          AND storage_status = 'cold'
          AND moved_to_cold_at IS NOT NULL
          AND moved_to_cold_at < {decision_cutoff_expr}
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
            f"{config.cold_minutes_to_decision} minutes. Choose: Delete, Move back, or Keep in cold."
            if config.cold_minutes_to_decision and int(config.cold_minutes_to_decision) > 0
            else f"{config.cold_days_to_decision} days. Choose: Delete, Move back, or Keep in cold."
        )
        _insert_notification(owner_id, "owner", "owner_choice", title, body, related_kpi_id=k["kpi_id"], related_id=decision_id)

    # 3) Send reminders (every 6h) to owners with open decisions
    # #region agent log
    _agent_dbg(
        "main.py:run_cold_storage:reminder-window",
        "using fixed reminder interval window",
        {"interval_seconds": reminder_interval_seconds, "interval_minutes": int(reminder_interval_seconds / 60)},
        run_id="post-fix",
        hypothesis_id="H2",
    )
    # #endregion
    reminders_sql = f"""
        SELECT d.decision_id, d.kpi_id, d.requested_by
        FROM {table("cold_storage_decisions")} d
        JOIN {table("kpi_master")} k ON k.kpi_id = d.kpi_id
        WHERE d.status = 'open' AND d.approver_decision = 'pending'
          AND k.is_deleted = false AND k.storage_status = 'cold'
          AND (d.last_reminder_at IS NULL OR d.last_reminder_at < from_unixtime(unix_timestamp() - {reminder_interval_seconds}))
    """
    try:
        reminder_rows = fetch_all(reminders_sql)
    except Exception:
        reminder_rows = []
    reminder_count = 0
    for r in reminder_rows:
        owner_id = (r.get("requested_by") or "owner").strip()
        if not owner_id:
            continue
        try:
            execute(
                f"UPDATE {table('cold_storage_decisions')} SET last_reminder_at = current_timestamp() WHERE decision_id = ?",
                (r["decision_id"],),
            )
            title = f"Reminder: Action required for KPI in cold storage"
            body = (
                f"Your KPI ({r['kpi_id']}) will require action. Choose: Delete, Move back, or Keep in cold. "
                "Please take action in the Cold Storage page."
            )
            _insert_notification(
                owner_id, "owner", "cold_reminder", title, body,
                related_kpi_id=r["kpi_id"], related_id=r["decision_id"],
            )
            reminder_count += 1
        except Exception:
            pass

    # 4) Notify admins when owner has not responded within owner_response window
    no_response_sql = f"""
        SELECT d.decision_id, d.kpi_id, d.requested_by
        FROM {table("cold_storage_decisions")} d
        JOIN {table("kpi_master")} k ON k.kpi_id = d.kpi_id
        WHERE d.status = 'open'
          AND (d.owner_choice IS NULL OR d.owner_choice = '')
          AND d.requested_at < {owner_response_cutoff_expr}
          AND k.is_deleted = false AND k.storage_status = 'cold'
    """
    try:
        no_response_rows = fetch_all(no_response_sql)
    except Exception:
        no_response_rows = []
    admin_notified_count = 0
    for r in no_response_rows:
        decision_id = r["decision_id"]
        # Avoid duplicate admin notifications
        existing = fetch_all(
            f"""
            SELECT 1 FROM {table("notifications")}
            WHERE type = 'owner_no_response' AND related_id = ?
            LIMIT 1
            """,
            (decision_id,),
        )
        if existing:
            continue
        owner_email = (r.get("requested_by") or "owner").strip()
        kpi_id = r["kpi_id"]
        title = f"Owner did not respond: KPI {kpi_id}"
        body = (
            f"KPI Owner ({owner_email}) did not respond to the cold storage decision for KPI {kpi_id}. "
            "You can send a warning to the owner or take action yourself (Delete, Move back, Keep in cold) from the Admin dashboard."
        )
        _notify_admins("owner_no_response", title, body, related_kpi_id=kpi_id, related_id=decision_id)
        admin_notified_count += 1

    # #region agent log
    _agent_dbg(
        "main.py:run_cold_storage:result",
        "cold storage run result",
        {
            "moved_to_cold": len(to_cold),
            "pending_decisions_created": len(needing_decision),
            "reminders_sent": reminder_count,
            "admin_notified_no_response": admin_notified_count,
            "mode": "minutes" if config.inactive_minutes_to_cold or config.cold_minutes_to_decision else "days",
        },
        run_id="post-fix",
        hypothesis_id="H4",
    )
    # #endregion
    return {
        "moved_to_cold": len(to_cold),
        "pending_decisions_created": len(needing_decision),
        "reminders_sent": reminder_count,
        "admin_notified_no_response": admin_notified_count,
    }


def _build_auto_cold_storage_config() -> ColdStorageRunConfig:
    """Build scheduler config from env vars."""
    return ColdStorageRunConfig(
        inactive_days_to_cold=COLD_STORAGE_INACTIVE_DAYS,
        cold_days_to_decision=COLD_STORAGE_DECISION_DAYS,
        inactive_minutes_to_cold=COLD_STORAGE_INACTIVE_MINUTES,
        cold_minutes_to_decision=COLD_STORAGE_DECISION_MINUTES,
        reminder_minutes_interval=COLD_STORAGE_REMINDER_MINUTES,
        owner_response_days=COLD_STORAGE_OWNER_RESPONSE_DAYS,
        owner_response_minutes=COLD_STORAGE_OWNER_RESPONSE_MINUTES if COLD_STORAGE_OWNER_RESPONSE_MINUTES > 0 else None,
    )


def _cold_storage_scheduler_loop():
    # #region agent log
    _agent_dbg(
        "main.py:cold_storage_scheduler:start",
        "cold storage scheduler started",
        {
            "loop_seconds": COLD_STORAGE_LOOP_SECONDS,
            "auto_enabled": COLD_STORAGE_AUTO_ENABLED,
            "inactive_minutes": COLD_STORAGE_INACTIVE_MINUTES,
            "decision_minutes": COLD_STORAGE_DECISION_MINUTES,
            "reminder_minutes": COLD_STORAGE_REMINDER_MINUTES,
        },
        run_id="post-fix",
        hypothesis_id="H13",
    )
    # #endregion
    while True:
        try:
            cfg = _build_auto_cold_storage_config()
            _run_cold_storage_core(cfg, run_source="scheduler")
        except Exception as ex:
            # #region agent log
            _agent_dbg(
                "main.py:cold_storage_scheduler:error",
                "cold storage scheduler iteration failed",
                {"error": str(ex)},
                run_id="post-fix",
                hypothesis_id="H13",
            )
            # #endregion
        _time.sleep(max(10, COLD_STORAGE_LOOP_SECONDS))


def _start_cold_storage_scheduler():
    global _cold_storage_scheduler_started
    if _cold_storage_scheduler_started or not COLD_STORAGE_AUTO_ENABLED:
        return
    _cold_storage_scheduler_started = True
    t = threading.Thread(target=_cold_storage_scheduler_loop, name="cold-storage-scheduler", daemon=True)
    t.start()


@app.post("/cold-storage/run")
def run_cold_storage(config: ColdStorageRunConfig, request: Request):
    """
    Manual trigger for cold storage run (optional). Core flow runs automatically via scheduler.
    """
    current_user = _get_current_user_email(request)
    # #region agent log
    _agent_dbg(
        "main.py:run_cold_storage:manual-trigger",
        "manual cold storage trigger invoked",
        {"current_user": current_user},
        run_id="post-fix",
        hypothesis_id="H14",
    )
    # #endregion
    return _run_cold_storage_core(config, run_source="manual")


@app.post("/cold-storage/owner-decision")
def owner_decision(req: OwnerDecisionRequest, request: Request):
    """
    KPI Owner submits a choice for a KPI in cold storage.
    owner_id defaults to current user from request (X-Forwarded-Email).
    """
    if req.choice not in ("delete", "move_back", "keep_cold"):
        raise HTTPException(status_code=400, detail="Invalid choice")

    current_user = _get_current_user_email(request)
    owner_id = (req.owner_id or current_user).strip() or "owner"

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
        # #region agent log
        _agent_dbg(
            "main.py:owner_decision:no-open-decision",
            "owner decision attempted before open decision exists",
            {"kpi_id": req.kpi_id, "owner_id": owner_id},
            run_id="post-fix",
            hypothesis_id="H6",
        )
        # #endregion
        raise HTTPException(
            status_code=400,
            detail="No open owner decision yet. Run cold storage evaluation after the decision window elapses.",
        )

    decision = rows[0]
    decision_id = decision["decision_id"]
    kpi_owner = (decision.get("requested_by") or "").strip().lower()

    # Optionally validate: only KPI owner or admin can submit decision (allow both for flexibility)
    if kpi_owner and owner_id.strip().lower() != kpi_owner and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only the KPI owner can submit this decision")

    execute(
        f"""
        UPDATE {table("cold_storage_decisions")}
        SET owner_choice = ?
        WHERE decision_id = ?
        """,
        (req.choice, decision_id),
    )

    # notify all admins that owner has made a choice
    title = f"KPI owner decision for KPI {req.kpi_id}"
    body = f"Owner {owner_id} requested action '{req.choice}' for KPI {req.kpi_id}."
    _notify_admins("approval_request", title, body, related_kpi_id=req.kpi_id, related_id=decision_id)

    return {"decision_id": decision_id, "message": "Owner decision recorded"}


@app.post("/cold-storage/approve")
def approve_cold_storage(req: ApprovalRequest, request: Request):
    """
    Admin approves or rejects the owner's cold storage decision.
    Requires admin role. approver_id defaults to current user from request.
    """
    current_user = _get_current_user_email(request)
    approver_id = (req.approver_id or current_user).strip() or "admin"
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role required to approve cold storage decisions")

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
        (decision_str, approver_id, req.decision_id),
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
                    status = 'Active',
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
    body = f"Your requested action '{owner_choice}' on KPI {kpi_id} was {decision_str} by {approver_id}."
    _insert_notification(owner_id, "owner", "approval_result", title, body, related_kpi_id=kpi_id, related_id=req.decision_id)

    return {"message": f"Decision {decision_str}", "applied": bool(req.approve)}


@app.post("/cold-storage/admin-warn-owner")
def admin_warn_owner(req: AdminWarnOwnerRequest, request: Request):
    """Admin sends a warning notification to the KPI owner to take action."""
    current_user = _get_current_user_email(request)
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role required")

    rows = fetch_all(
        f"""
        SELECT * FROM {table("cold_storage_decisions")}
        WHERE decision_id = ? AND status = 'open'
        """,
        (req.decision_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Decision not found or already closed")
    decision = rows[0]
    owner_id = (decision.get("requested_by") or "owner").strip()
    kpi_id = decision["kpi_id"]

    default_body = (
        f"An admin has requested you to take action on KPI {kpi_id} in cold storage. "
        "Please choose: Delete, Move back, or Keep in cold from the Cold Storage page."
    )
    title = "Admin warning: Action required for KPI in cold storage"
    body = (req.custom_message or "").strip() or default_body
    _insert_notification(
        owner_id, "owner", "admin_warning", title, body,
        related_kpi_id=kpi_id, related_id=req.decision_id,
    )
    return {"message": "Warning sent to owner"}


@app.post("/cold-storage/admin-action")
def admin_action(req: AdminActionRequest, request: Request):
    """Admin takes direct action on a cold storage decision (when owner has not responded)."""
    current_user = _get_current_user_email(request)
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role required")
    if req.action not in ("delete", "move_back", "keep_cold"):
        raise HTTPException(status_code=400, detail="Invalid action")

    rows = fetch_all(
        f"""
        SELECT * FROM {table("cold_storage_decisions")}
        WHERE decision_id = ? AND status = 'open'
        """,
        (req.decision_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Decision not found or already closed")
    decision = rows[0]
    kpi_id = decision["kpi_id"]
    owner_id = (decision.get("requested_by") or "owner").strip()

    execute(
        f"""
        UPDATE {table("cold_storage_decisions")}
        SET owner_choice = ?, approver_decision = 'approved', decided_by = ?, decided_at = current_timestamp(), status = 'closed'
        WHERE decision_id = ?
        """,
        (req.action, current_user, req.decision_id),
    )

    if req.action == "delete":
        execute(
            f"UPDATE {table('kpi_master')} SET is_deleted = true WHERE kpi_id = ?",
            (kpi_id,),
        )
    elif req.action == "move_back":
        execute(
            f"""
            UPDATE {table("kpi_master")}
            SET storage_status = 'active', status = 'Active', moved_to_cold_at = NULL
            WHERE kpi_id = ?
            """,
            (kpi_id,),
        )

    title = f"Admin took action on KPI {kpi_id}"
    body = f"An admin applied '{req.action}' to your KPI {kpi_id} in cold storage (owner had not responded)."
    _insert_notification(
        owner_id, "owner", "admin_action", title, body,
        related_kpi_id=kpi_id, related_id=req.decision_id,
    )
    return {"message": f"Action '{req.action}' applied", "kpi_id": kpi_id}


# ==============================
# Admin API (RBAC: admin only)
# ==============================


@app.get("/admin/stats")
def admin_stats(request: Request):
    """Admin dashboard stats: total KPIs, active, cold, deleted, pending approvals."""
    current_user = _get_current_user_email(request)
    if ADMIN_EMAILS and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role required")

    try:
        total = fetch_all(
            f"SELECT COUNT(*) AS c FROM {table('kpi_master')} WHERE is_deleted = false"
        )
        total_kpis = total[0].get("c", 0) if total else 0

        active = fetch_all(
            f"""
            SELECT COUNT(*) AS c FROM {table("kpi_master")}
            WHERE is_deleted = false AND (storage_status IS NULL OR storage_status = 'active')
            """
        )
        active_kpis = active[0].get("c", 0) if active else 0

        cold = fetch_all(
            f"""
            SELECT COUNT(*) AS c FROM {table("kpi_master")}
            WHERE is_deleted = false AND storage_status = 'cold'
            """
        )
        cold_kpis = cold[0].get("c", 0) if cold else 0

        deleted = fetch_all(
            f"SELECT COUNT(*) AS c FROM {table('kpi_master')} WHERE is_deleted = true"
        )
        deleted_kpis = deleted[0].get("c", 0) if deleted else 0

        pending = fetch_all(
            f"""
            SELECT COUNT(*) AS c FROM {table("cold_storage_decisions")}
            WHERE status = 'open' AND approver_decision = 'pending' AND owner_choice IS NOT NULL
            """
        )
        pending_approvals = pending[0].get("c", 0) if pending else 0

        awaiting_owner = fetch_all(
            f"""
            SELECT COUNT(*) AS c FROM {table("cold_storage_decisions")}
            WHERE status = 'open' AND (owner_choice IS NULL OR owner_choice = '')
            """
        )
        awaiting_owner_count = awaiting_owner[0].get("c", 0) if awaiting_owner else 0

        owner_resp_cutoff = (
            f"from_unixtime(unix_timestamp() - {COLD_STORAGE_OWNER_RESPONSE_MINUTES * 60})"
            if COLD_STORAGE_OWNER_RESPONSE_MINUTES and COLD_STORAGE_OWNER_RESPONSE_MINUTES > 0
            else f"date_sub(current_timestamp(), {COLD_STORAGE_OWNER_RESPONSE_DAYS})"
        )
        no_response = fetch_all(
            f"""
            SELECT COUNT(*) AS c FROM {table("cold_storage_decisions")} d
            JOIN {table("kpi_master")} k ON k.kpi_id = d.kpi_id
            WHERE d.status = 'open' AND (d.owner_choice IS NULL OR d.owner_choice = '')
              AND d.requested_at < {owner_resp_cutoff}
              AND k.is_deleted = false AND k.storage_status = 'cold'
            """
        )
        owner_no_response_count = no_response[0].get("c", 0) if no_response else 0

        return {
            "total_kpis": total_kpis,
            "active_kpis": active_kpis,
            "cold_kpis": cold_kpis,
            "deleted_kpis": deleted_kpis,
            "pending_approvals": pending_approvals,
            "awaiting_owner_decision": awaiting_owner_count,
            "owner_no_response": owner_no_response_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/pending-approvals")
def admin_pending_approvals(request: Request):
    """List cold storage decisions awaiting admin approval (owner has made a choice)."""
    current_user = _get_current_user_email(request)
    if ADMIN_EMAILS and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role required")

    try:
        rows = fetch_all(
            f"""
            SELECT d.decision_id, d.kpi_id, d.owner_choice, d.requested_by, d.requested_at
            FROM {table("cold_storage_decisions")} d
            WHERE d.status = 'open' AND d.approver_decision = 'pending' AND d.owner_choice IS NOT NULL
            ORDER BY d.requested_at DESC
            """
        )
        decisions = []
        for r in rows:
            kpi_rows = fetch_all(
                f"SELECT kpi_name, owner_team FROM {table('kpi_master')} WHERE kpi_id = ?",
                (r["kpi_id"],),
            )
            kpi_name = kpi_rows[0].get("kpi_name", r["kpi_id"]) if kpi_rows else r["kpi_id"]
            decisions.append({
                "decision_id": r["decision_id"],
                "kpi_id": r["kpi_id"],
                "kpi_name": kpi_name,
                "owner_choice": r.get("owner_choice"),
                "requested_by": r.get("requested_by"),
                "requested_at": str(r.get("requested_at")) if r.get("requested_at") else None,
            })
        return {"decisions": decisions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/no-owner-response")
def admin_no_owner_response(request: Request):
    """List cold storage decisions where owner has not responded within the timeout window."""
    current_user = _get_current_user_email(request)
    if ADMIN_EMAILS and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin role required")

    owner_resp_cutoff = (
        f"from_unixtime(unix_timestamp() - {COLD_STORAGE_OWNER_RESPONSE_MINUTES * 60})"
        if COLD_STORAGE_OWNER_RESPONSE_MINUTES and COLD_STORAGE_OWNER_RESPONSE_MINUTES > 0
        else f"date_sub(current_timestamp(), {COLD_STORAGE_OWNER_RESPONSE_DAYS})"
    )
    try:
        rows = fetch_all(
            f"""
            SELECT d.decision_id, d.kpi_id, d.requested_by, d.requested_at
            FROM {table("cold_storage_decisions")} d
            JOIN {table("kpi_master")} k ON k.kpi_id = d.kpi_id
            WHERE d.status = 'open'
              AND (d.owner_choice IS NULL OR d.owner_choice = '')
              AND d.requested_at < {owner_resp_cutoff}
              AND k.is_deleted = false AND k.storage_status = 'cold'
            ORDER BY d.requested_at ASC
            """
        )
        decisions = []
        for r in rows:
            kpi_rows = fetch_all(
                f"SELECT kpi_name, owner_team FROM {table('kpi_master')} WHERE kpi_id = ?",
                (r["kpi_id"],),
            )
            kpi_name = kpi_rows[0].get("kpi_name", r["kpi_id"]) if kpi_rows else r["kpi_id"]
            decisions.append({
                "decision_id": r["decision_id"],
                "kpi_id": r["kpi_id"],
                "kpi_name": kpi_name,
                "requested_by": r.get("requested_by"),
                "requested_at": str(r.get("requested_at")) if r.get("requested_at") else None,
            })
        return {"decisions": decisions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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