"""
Semantic SQL equivalence for duplicate KPI detection.
Extracts logical essence so equivalent queries (correlated subquery vs CTE+ROW_NUMBER, etc.) produce same signature.
"""
from typing import Set, List, Optional
import re


def _normalize_table_name(table_node) -> str:
    """Get normalized table name (catalog.schema.table or schema.table)."""
    try:
        sql = table_node.sql()
        if " AS " in sql.upper():
            sql = sql.upper().split(" AS ")[0].strip()
        return sql.strip()
    except Exception:
        return getattr(table_node, "name", "") or ""


def _col_name(col_node) -> str:
    """Get column name from Column or Identifier node."""
    try:
        name = getattr(col_node, "name", None) or getattr(getattr(col_node, "this", None), "name", None)
        return (str(name) if name else "").lower()
    except Exception:
        return ""


def _collect_from_select(select_node, tables: Set[str], columns: Set[str], 
                         partitions: Set[str], order_cols: Set[str], agg_funcs: Set[str]):
    """Recursively collect logical elements from a Select node."""
    try:
        import sqlglot
        from sqlglot import exp

        # CTEs first - recurse to get base tables from CTE definitions
        with_node = select_node.find(exp.With)
        cte_aliases: Set[str] = set()
        if with_node and getattr(with_node, "expressions", None):
            for c in with_node.expressions:
                alias = getattr(c, "alias", None)
                if alias is not None:
                    aname = (alias.sql() if hasattr(alias, "sql") else str(alias)).lower()
                    if aname:
                        cte_aliases.add(aname)
                if hasattr(c, "this") and c.this:
                    _collect_from_select(c.this, tables, columns, partitions, order_cols, agg_funcs)

        # Tables - skip CTE aliases; add base tables (qualified or from subquery/CTE)
        for t in select_node.find_all(exp.Table):
            tbl_name = _normalize_table_name(t)
            if tbl_name and tbl_name.lower() not in cte_aliases:
                tables.add(tbl_name)

        # Subqueries - recurse
        for sub in select_node.find_all(exp.Subquery):
            if sub.this:
                _collect_from_select(sub.this, tables, columns, partitions, order_cols, agg_funcs)

        # Output columns (select list)
        for expr in select_node.expressions:
            if hasattr(expr, "alias"):
                alias = expr.alias
                if alias:
                    columns.add((alias or "").lower())
            col = expr.this if hasattr(expr, "this") else expr
            for c in (col,) if not hasattr(col, "find_all") else col.find_all(exp.Column):
                columns.add(_col_name(c))
            for agg in [exp.Sum, exp.Count, exp.Avg, exp.Min, exp.Max]:
                for a in (col.find_all(agg) if hasattr(col, "find_all") else []):
                    agg_funcs.add(agg.sql_name().lower())

        # Columns from WHERE, GROUP BY, etc.
        for col in select_node.find_all(exp.Column):
            columns.add(_col_name(col))

        # Window: PARTITION BY, ORDER BY (from OVER clause)
        for w in select_node.find_all(exp.Window):
            part_by = getattr(w, "partition_by", None) or []
            for pb in (part_by if isinstance(part_by, list) else [part_by]):
                for c in (pb.find_all(exp.Column) if hasattr(pb, "find_all") else []):
                    partitions.add(_col_name(c))
            order_node = getattr(w, "order", None)
            if order_node:
                for oexpr in (getattr(order_node, "expressions", []) or []):
                    for c in (oexpr.find_all(exp.Column) if hasattr(oexpr, "find_all") else []):
                        order_cols.add(_col_name(c))

        # Explicit GROUP BY
        group = select_node.find(exp.Group)
        if group:
            for e in (group.expressions if hasattr(group, "expressions") else []):
                for c in (e.find_all(exp.Column) if hasattr(e, "find_all") else []):
                    columns.add(_col_name(c))
    except Exception:
        pass


def extract_logical_essence(sql_text: str) -> Optional[str]:
    """
    Extract logical essence from SQL for semantic equivalence.
    Same logical query (different structure) -> same essence string.
    Returns None on parse failure.
    """
    if not sql_text or not sql_text.strip():
        return None
    s = sql_text.strip()
    for dialect in ("databricks", "spark", None):
        try:
            import sqlglot
            from sqlglot import exp
            parsed = sqlglot.parse_one(s, dialect=dialect)
            tables: Set[str] = set()
            columns: Set[str] = set()
            partitions: Set[str] = set()
            order_cols: Set[str] = set()
            agg_funcs: Set[str] = set()
            _collect_from_select(parsed, tables, columns, partitions, order_cols, agg_funcs)
            # Build canonical string - sorted for determinism
            tables_s = "|".join(sorted((t or "").lower() for t in tables if t))
            cols_s = "|".join(sorted(c for c in columns if c and c.lower() not in ("rn", "_rn")))
            part_s = "|".join(sorted(partitions))
            order_s = "|".join(sorted(order_cols))
            agg_s = "|".join(sorted(agg_funcs))
            return f"T:{tables_s}|C:{cols_s}|P:{part_s}|O:{order_s}|A:{agg_s}"
        except Exception:
            continue
    return None


def normalize_sql_for_essence(sql_text: str) -> str:
    """
    Lightweight normalization: lowercase identifiers, collapse whitespace.
    Used as fallback when sqlglot fails - extracts key structural tokens.
    """
    if not sql_text or not sql_text.strip():
        return ""
    s = sql_text.strip()
    s = re.sub(r"--[^\n]*", " ", s)
    s = re.sub(r"/\*.*?\*/", " ", s, flags=re.DOTALL)
    s = s.lower()
    s = " ".join(s.split())
    s = re.sub(r"'[^']*'", " _S_ ", s)
    s = re.sub(r"\d+\.?\d*", " _N_ ", s)
    dot_refs = sorted(set(re.findall(r"[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)+", s)))
    idents = set(re.findall(r"[a-z_][a-z0-9_]*", s))
    keywords = {"select", "from", "where", "and", "or", "in", "as", "on", "join", "group", "by", "order", "limit", "row_number", "partition", "over", "with", "union", "desc", "asc"}
    bare = sorted(idents - keywords)
    return "|".join(dot_refs) + "||" + "|".join(bare)
