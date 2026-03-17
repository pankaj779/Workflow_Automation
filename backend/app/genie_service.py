"""
Databricks Genie Integration Service - Option B (Dynamic Space Creation)

Creates Genie spaces on-the-fly when user selects a table, then uses
Conversation API for natural language → SQL generation.
"""

import json
import time
import uuid
import requests
from typing import Dict, List, Optional, Tuple


def _gen_id() -> str:
    """Generate 32-char lowercase hex ID for Genie API."""
    return uuid.uuid4().hex


def _ensure_trailing_slash(url: str) -> str:
    """Ensure URL has no trailing slash for REST API."""
    return url.rstrip("/")


def _ensure_https(host: str) -> str:
    """Ensure host has https:// scheme for valid API URL."""
    h = (host or "").strip()
    if not h:
        return h
    if h.startswith("http://") or h.startswith("https://"):
        return h
    return f"https://{h}"


def _build_table_config(table_identifier: str, column_metadata: Dict[str, Dict]) -> Dict:
    """Build a single table config for Genie space."""
    col_names = sorted(column_metadata.keys())
    column_configs = []
    for col_name in col_names:
        meta = column_metadata.get(col_name, {})
        col_type = meta.get("type", "string")
        comment = meta.get("comment", "") or ""
        config = {
            "column_name": col_name,
            "description": [comment] if comment else [],
        }
        if col_type in ("timestamp", "date"):
            config["enable_format_assistance"] = True
        column_configs.append(config)
    column_configs.sort(key=lambda x: x["column_name"])
    return {
        "identifier": table_identifier,
        "description": [f"Table {table_identifier} for KPI creation"],
        "column_configs": column_configs,
    }


def create_genie_space(
    table_identifier: str,
    column_metadata: Dict[str, Dict],
    warehouse_id: str,
    host: str,
    token: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Create a Genie space for a single table. See create_genie_space_multi for multiple tables."""
    return create_genie_space_multi(
        tables=[(table_identifier, column_metadata)],
        warehouse_id=warehouse_id,
        host=host,
        token=token,
        title=title or f"KPI Space: {table_identifier}",
        description=description or f"Dynamic Genie space for {table_identifier}",
    )


def create_genie_space_multi(
    tables: List[Tuple[str, Dict[str, Dict]]],
    warehouse_id: str,
    host: str,
    token: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Create a Genie space with multiple tables (from different schemas/catalogs).

    Args:
        tables: List of (table_identifier, column_metadata) e.g. [("cat.schema.t1", {...}), ("cat.schema2.t2", {...})]
    """
    if not tables:
        return None, "No tables provided"
    base_url = _ensure_trailing_slash(_ensure_https(host))
    url = f"{base_url}/api/2.0/genie/spaces"

    table_configs = []
    all_identifiers = []
    for table_identifier, column_metadata in tables:
        tc = _build_table_config(table_identifier, column_metadata)
        table_configs.append(tc)
        all_identifiers.append(table_identifier)

    table_list_str = ", ".join(all_identifiers)
    sample_questions = [
        {"id": _gen_id(), "question": [f"Show me the first 10 rows from {all_identifiers[0]}"]},
        {"id": _gen_id(), "question": [f"Generate SQL using tables: {table_list_str}"]},
    ]
    sample_questions.sort(key=lambda x: x["id"])

    multi_table_instruction = ""
    if len(tables) > 1:
        multi_table_instruction = (
            "CRITICAL: When the user asks to ADD, COMBINE, or use values from MULTIPLE tables, "
            "your SQL MUST include ALL tables listed above. Use subqueries, UNION ALL, or JOINs to combine data. "
            "Never return SQL that uses only one table when the prompt clearly mentions multiple tables. "
        )
    instructions_text = (
        f"Generate valid Databricks SQL for the tables: {table_list_str}. "
        f"{multi_table_instruction}"
        "Use three-part identifiers with backticks (e.g. `catalog`.`schema`.`table`). "
        "Return only executable SQL. You may JOIN, UNION ALL, or combine data from multiple tables. "
        "Include LIMIT when appropriate for exploratory queries."
    )

    space_config = {
        "version": 2,
        "config": {"sample_questions": sample_questions},
        "data_sources": {"tables": table_configs},
        "instructions": {
            "text_instructions": [
                {"id": _gen_id(), "content": [instructions_text]},
            ]
        },
    }

    serialized_space = json.dumps(space_config)
    payload = {
        "warehouse_id": warehouse_id,
        "serialized_space": serialized_space,
        "title": title or f"KPI Space: {table_list_str[:80]}",
        "description": description or f"Dynamic Genie space for {len(tables)} table(s)",
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data.get("space_id"), None
    except requests.exceptions.RequestException as e:
        err_msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                err_data = e.response.json()
                err_msg = err_data.get("error_code", "") + ": " + err_data.get("message", err_msg)
            except Exception:
                err_msg = e.response.text or err_msg
        return None, err_msg
    except Exception as e:
        return None, str(e)


def delete_genie_space(space_id: str, host: str, token: str) -> Optional[str]:
    """
    Delete (trash) a Genie space to free up resources and avoid charges.

    Returns:
        None on success, error message on failure.
    """
    base_url = _ensure_trailing_slash(_ensure_https(host))
    # Trash Genie Space API (soft delete - moves to trash)
    url = f"{base_url}/api/2.0/genie/spaces/{space_id}/trash"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, headers=headers, timeout=30)
        resp.raise_for_status()
        return None
    except requests.exceptions.RequestException as e:
        err_msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                err_data = e.response.json()
                err_msg = err_data.get("message", err_data.get("error_code", err_msg))
            except Exception:
                pass
        return err_msg
    except Exception as e:
        return str(e)


def start_genie_conversation(
    space_id: str,
    prompt: str,
    host: str,
    token: str,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Start a Genie conversation with a natural language prompt.

    Returns:
        (conversation_id, message_id, error_message)
    """
    base_url = _ensure_trailing_slash(_ensure_https(host))
    url = f"{base_url}/api/2.0/genie/spaces/{space_id}/start-conversation"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {"content": prompt}

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        conv = data.get("conversation", {})
        msg = data.get("message", {})
        return conv.get("id"), msg.get("id"), None
    except requests.exceptions.RequestException as e:
        err_msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                err_data = e.response.json()
                err_msg = err_data.get("message", err_data.get("error_code", "")) or err_msg
            except Exception:
                pass
        return None, None, err_msg
    except Exception as e:
        return None, None, str(e)


def poll_genie_message(
    space_id: str,
    conversation_id: str,
    message_id: str,
    host: str,
    token: str,
    max_wait_seconds: int = 120,
    poll_interval: float = 2.0,
) -> Tuple[str, Optional[str], Optional[str], Optional[Dict]]:
    """
    Poll for Genie message completion and extract SQL.

    Returns:
        (status, sql, error_message, attachments)
        status: "COMPLETED" | "FAILED" | "CANCELLED" | "IN_PROGRESS" | "TIMEOUT"
    """
    base_url = _ensure_trailing_slash(_ensure_https(host))
    url = f"{base_url}/api/2.0/genie/spaces/{space_id}/conversations/{conversation_id}/messages/{message_id}"

    headers = {"Authorization": f"Bearer {token}"}

    start = time.time()
    last_sql = None

    while (time.time() - start) < max_wait_seconds:
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            status = data.get("status", "UNKNOWN")
            error = data.get("error")
            attachments = data.get("attachments") or []

            if error:
                return "FAILED", None, str(error), None

            if status == "COMPLETED":
                sql = _extract_sql_from_attachments(attachments)
                return "COMPLETED", sql or last_sql, None, attachments

            if status in ("FAILED", "CANCELLED"):
                return status, None, data.get("error", f"Genie status: {status}"), None

            # Extract partial SQL if available (some responses may include it early)
            partial_sql = _extract_sql_from_attachments(attachments)
            if partial_sql:
                last_sql = partial_sql

        except requests.exceptions.RequestException as e:
            return "FAILED", None, str(e), None
        except Exception as e:
            return "FAILED", None, str(e), None

        time.sleep(poll_interval)

    return "TIMEOUT", last_sql, "Genie timed out waiting for response", None


def _extract_sql_from_attachments(attachments: List[Dict]) -> Optional[str]:
    """Extract SQL query from Genie message attachments (multiple possible formats)."""
    if not attachments:
        return None

    def _extract_from_value(val) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, str):
            s = val.strip()
            return s if s else None
        if isinstance(val, list):
            joined = "".join(str(x) for x in val).strip()
            return joined if joined else None
        if isinstance(val, dict):
            return (
                _extract_from_value(val.get("sql")) or
                _extract_from_value(val.get("query")) or
                _extract_from_value(val.get("content"))
            )
        return None

    for att in attachments:
        # Try various known Genie API formats
        sql = (
            _extract_from_value(att.get("query")) or
            _extract_from_value(att.get("sql")) or
            _extract_from_value(att.get("content"))
        )
        if sql:
            # Normalize: strip trailing semicolon so SQL can be safely wrapped in subqueries
            sql = sql.strip().rstrip(";").strip()
            return sql if sql else None
    return None


def ask_genie(
    table_identifier: str,
    column_metadata: Dict[str, Dict],
    prompt: str,
    warehouse_id: str,
    host: str,
    token: str,
    existing_space_id: Optional[str] = None,
    tables: Optional[List[Tuple[str, Dict[str, Dict]]]] = None,
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    High-level: Create space (if needed), ask Genie, return SQL.

    Args:
        table_identifier: Used when tables is None (single-table mode)
        column_metadata: Used when tables is None
        tables: Optional list of (table_identifier, column_metadata) for multi-table mode

    Returns:
        (space_id, sql, error_message)
    """
    space_id = existing_space_id

    if not space_id:
        if tables and len(tables) > 0:
            space_id, create_err = create_genie_space_multi(
                tables=tables,
                warehouse_id=warehouse_id,
                host=host,
                token=token,
            )
        else:
            space_id, create_err = create_genie_space(
                table_identifier=table_identifier,
                column_metadata=column_metadata,
                warehouse_id=warehouse_id,
                host=host,
                token=token,
            )
        if create_err:
            return None, None, f"Failed to create Genie space: {create_err}"

    conv_id, msg_id, start_err = start_genie_conversation(
        space_id=space_id,
        prompt=prompt,
        host=host,
        token=token,
    )
    if start_err:
        return space_id, None, f"Failed to start conversation: {start_err}"

    status, sql, poll_err, _ = poll_genie_message(
        space_id=space_id,
        conversation_id=conv_id,
        message_id=msg_id,
        host=host,
        token=token,
    )

    if poll_err:
        return space_id, None, poll_err
    if status != "COMPLETED":
        return space_id, None, f"Genie returned status: {status}"
    if not sql:
        return space_id, None, "Genie did not return SQL"

    return space_id, sql, None
