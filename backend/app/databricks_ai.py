"""
Databricks Foundation Models for SQL optimization and semantic signature.
Uses Databricks serving endpoints - no OpenAI or sqlglot.
"""
import json
import hashlib
import re
import os
import requests
from typing import Optional, Dict, Any

_last_error: str = ""


def _get_base_url() -> str:
    """Base URL for Databricks (same host as Genie). Use DATABRICKS_SERVING_URL if set."""
    override = (os.getenv("DATABRICKS_SERVING_URL") or "").strip()
    if override:
        return override.rstrip("/") if override.startswith(("http://", "https://")) else f"https://{override}".rstrip("/")
    host = (os.getenv("DB_HOST") or "").strip()
    if not host:
        return ""
    if host.startswith("http://") or host.startswith("https://"):
        return host.rstrip("/")
    return f"https://{host}".rstrip("/")


def _get_token() -> str:
    return (os.getenv("DB_TOKEN") or "").strip()


def _get_model() -> str:
    return os.getenv("DATABRICKS_FM_MODEL", "databricks-meta-llama-3-3-70b-instruct")


def _call_fm(
    prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 1500,
    temperature: float = 0.2,
) -> Optional[str]:
    """Call Databricks Foundation Model. Returns response text or None on failure."""
    global _last_error
    base_url = _get_base_url()
    token = _get_token()
    model = _get_model()
    if not base_url or not token:
        return None

    url = f"{base_url}/serving-endpoints/{model}/invocations"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        choices = data.get("choices") or []
        if choices:
            msg = choices[0].get("message") or {}
            return (msg.get("content") or "").strip()
        return None
    except requests.exceptions.RequestException as e:
        _last_error = str(e)
        err_detail = str(e)
        if getattr(e, "response", None) is not None:
            try:
                body = e.response.json()
                err_detail = (body.get("error") or {}).get("message", err_detail) or err_detail
            except Exception:
                pass
        import logging
        logging.getLogger("databricks_ai").warning("FM call failed: %s | URL: %s", err_detail, url)
        return None
    except Exception as ex:
        import logging
        logging.getLogger("databricks_ai").warning("FM call error: %s", ex)
        return None


def test_fm_connection() -> tuple[bool, str]:
    """Test FM connectivity. Returns (ok, message)."""
    base_url = _get_base_url()
    token = _get_token()
    model = _get_model()
    if not base_url or not token:
        return False, "Set DB_HOST (or DATABRICKS_SERVING_URL) and DB_TOKEN in .env"
    url = f"{base_url}/serving-endpoints/{model}/invocations"
    try:
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 5},
            timeout=15,
        )
        resp.raise_for_status()
        return True, "Databricks FM reachable"
    except requests.exceptions.RequestException as e:
        err = str(e)
        if getattr(e, "response", None) is not None:
            try:
                body = e.response.json()
                err = (body.get("error") or {}).get("message", err) or err
            except Exception:
                pass
        return False, f"FM unreachable: {err}"


def optimize_sql(sql_text: str, user_prompt: Optional[str] = None) -> Dict[str, Any]:
    """
    Optimize SQL using Databricks Foundation Model.
    Returns {optimized_sql, optimization_score, changes_made}.
    """
    if not sql_text or not sql_text.strip():
        return {
            "optimized_sql": sql_text or "",
            "optimization_score": 0,
            "changes_made": ["Empty input"],
        }

    user_ctx = ""
    if user_prompt:
        user_ctx = f"\nUser intent: {user_prompt}\n"
    else:
        user_ctx = """
Make STRUCTURAL optimizations: fix bugs, rewrite correlated subqueries to JOINs/CTEs,
add LIMIT for preview queries, predicate pushdown. Formatting alone = 0 score."""

    prompt = f"""You are a Databricks SQL optimizer. OPTIMIZE this query structurally.

Query:
```sql
{sql_text.strip()}
```
{user_ctx}

Return ONLY valid JSON:
{{"optimized_query": "<SQL string>", "optimization_score": <0-100>, "changes_made": ["change1", "change2"]}}
Score: 0=format only, 20=typo fix, 40=minor rewrite, 60=subquery→JOIN, 80=major restructure."""

    result = _call_fm(prompt, system_prompt="Produce only valid JSON. No markdown.", temperature=0.2, max_tokens=1200)
    if not result:
        return _fallback_optimize(sql_text)

    try:
        content = result.strip()
        if content.startswith("```"):
            parts = content.split("```")
            content = parts[1] if len(parts) > 1 else content
            if content.startswith("json"):
                content = content[4:]
        content = content.strip().rstrip("```").strip()
        obj = json.loads(content)
        optimized = (obj.get("optimized_query") or "").strip()
        if not optimized:
            return _fallback_optimize(sql_text)
        score = obj.get("optimization_score")
        if not isinstance(score, (int, float)):
            score = 50
        score = max(0, min(100, int(score)))
        changes = obj.get("changes_made")
        if not isinstance(changes, list):
            changes = ["Optimization applied"]
        return {
            "optimized_sql": optimized,
            "optimization_score": score,
            "changes_made": changes[:10],
        }
    except Exception:
        return _fallback_optimize(sql_text)


def _fallback_optimize(sql_text: str) -> Dict[str, Any]:
    """Fallback when FM fails: normalize whitespace only."""
    s = " ".join((sql_text or "").strip().split())
    return {
        "optimized_sql": s or sql_text,
        "optimization_score": 0,
        "changes_made": ["Format only — Databricks FM unavailable"],
    }


def _pre_normalize_for_signature(sql: str) -> str:
    """
    Normalize SQL so equivalent queries (formatting, LIMIT) produce same input for FM.
    Research: LLM canonicalization works better with consistent input.
    """
    if not sql or not sql.strip():
        return ""
    s = sql.strip().rstrip(";")
    s = re.sub(r"--[^\n]*", " ", s)
    s = re.sub(r"/\*.*?\*/", " ", s, flags=re.DOTALL)
    s = s.lower()
    s = " ".join(s.split())
    s = re.sub(r"\blimit\s+\d+\b", "", s, flags=re.IGNORECASE)
    s = " ".join(s.split())
    return s.strip()


def semantic_signature(sql_query: str) -> str:
    """
    Generate semantic signature for duplicate detection using Databricks FM.
    Uses pre-normalization + FM canonical intent. Equivalent SQL produces same signature.
    """
    if not sql_query or not sql_query.strip():
        return ""

    normalized_input = _pre_normalize_for_signature(sql_query)
    if not normalized_input:
        return _fallback_semantic(sql_query)

    prompt = f"""Output a canonical semantic fingerprint for duplicate detection.
Two queries with the SAME logical result MUST produce the EXACT SAME fingerprint.

RULES:
- T: base tables only (catalog.schema.table). Expand CTEs—never list CTE names.
- C: final output columns + key filter columns. Exclude intermediates.
- A: aggregates in final SELECT only (SUM, AVG, COUNT, etc.).
- IGNORE completely: LIMIT N, whitespace, newlines, AS vs as, formatting. They do NOT affect equivalence.

Format: T:table1|table2|C:col1|col2|A:sum|avg
Sort items alphabetically within each section for consistency.

SQL:
```sql
{normalized_input}
```

Output ONLY the fingerprint line, nothing else."""

    result = _call_fm(prompt, temperature=0, max_tokens=300)
    if result:
        sig_line = result.strip().split("\n")[0].strip()
        if sig_line and len(sig_line) > 5:
            normalized = _normalize_sig_line(sig_line)
            if normalized:
                return hashlib.sha256(("s:" + normalized).encode("utf-8")).hexdigest()[:16]

    return _fallback_semantic(sql_query)


def _normalize_sig_line(sig_line: str) -> str:
    """Parse T:, C:, A: sections, sort items, rebuild for consistent hashing."""
    parts = {}
    current_key = None
    current_items = []
    for seg in sig_line.split("|"):
        seg = seg.strip()
        if not seg:
            continue
        if len(seg) >= 2 and seg[1] == ":" and seg[0].upper() in ("T", "C", "A"):
            if current_key:
                parts[current_key] = "|".join(sorted(current_items))
            current_key = seg[0].upper()
            rest = seg[2:].strip()
            current_items = [rest] if rest else []
        else:
            current_items.append(seg)
    if current_key:
        parts[current_key] = "|".join(sorted(current_items))
    return "|".join(f"{k}:{parts[k]}" for k in sorted(parts.keys())) if parts else sig_line


def _fallback_semantic(sql_text: str) -> str:
    """Fallback: hash of normalized SQL when FM fails."""
    if not sql_text or not sql_text.strip():
        return ""
    s = sql_text.strip()
    s = re.sub(r"--[^\n]*", " ", s)
    s = re.sub(r"/\*.*?\*/", " ", s, flags=re.DOTALL)
    s = " ".join(s.lower().split())
    s = re.sub(r"'[^']*'", " _S_ ", s)
    s = re.sub(r"\d+\.?\d*", " _N_ ", s)
    combined = "s:" + s
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()[:16]


def check_equivalent_to_any(new_sql: str, candidate_sqls: list[str], max_candidates: int = 15) -> list[int]:
    """
    Ask FM if new_sql is semantically equivalent to any of candidate_sqls.
    Returns list of indices (0-based) of equivalent candidates.
    Research: "Explain & Compare" - direct pairwise equivalence is more reliable than canonical hashing.
    """
    if not new_sql or not candidate_sqls:
        return []
    candidates = candidate_sqls[:max_candidates]
    numbered = "\n\n".join(f"[{i}] {s.strip()}" for i, s in enumerate(candidates))
    prompt = f"""You are a SQL equivalence checker. Two queries are equivalent if they return the SAME logical result.

IGNORE these differences (they do NOT affect equivalence):
- Whitespace, newlines, formatting, LIMIT N
- AS vs as (alias casing)
- CTE vs subquery (same logic)
- Correlated subquery with ORDER BY ... LIMIT 1 vs CTE with MAX(year*100+week) + JOIN (both get "latest row per group")
- Column order in SELECT when GROUP BY defines the result

NEW QUERY:
```sql
{new_sql.strip()}
```

CANDIDATES:
{numbered}

If ANY candidate is equivalent to the NEW query, output ONLY their indices as comma-separated numbers (e.g. 0 or 0,2).
If NONE are equivalent, output exactly: NONE

Output ONLY numbers or NONE."""

    result = _call_fm(prompt, temperature=0, max_tokens=100)
    if not result:
        return []
    text = result.strip().upper()
    first_word = text.split()[0] if text.split() else ""
    if first_word == "NONE" or (len(text) <= 6 and "NONE" in text):
        return []
    indices = []
    for part in text.replace(",", " ").split():
        try:
            i = int(part.strip())
            if 0 <= i < len(candidates):
                indices.append(i)
        except ValueError:
            continue
    return indices
