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


def create_genie_space(
    table_identifier: str,
    column_metadata: Dict[str, Dict],
    warehouse_id: str,
    host: str,
    token: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Create a Genie space dynamically for the selected table.

    Args:
        table_identifier: "catalog.schema.table" (no backticks)
        column_metadata: {col_name: {"type": ..., "comment": ...}}
        warehouse_id: SQL warehouse ID
        host: Databricks host (e.g. https://xxx.cloud.databricks.com)
        token: Databricks PAT token
        title: Optional space title
        description: Optional space description

    Returns:
        (space_id, error_message) - space_id is None on failure
    """
    base_url = _ensure_trailing_slash(_ensure_https(host))
    url = f"{base_url}/api/2.0/genie/spaces"

    # Build column_configs from column metadata
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
        # Add format assistance for date/timestamp columns
        if col_type in ("timestamp", "date"):
            config["enable_format_assistance"] = True
        column_configs.append(config)

    # Sort column_configs by column_name (API requirement)
    column_configs.sort(key=lambda x: x["column_name"])

    # Build sample questions from column names
    cols_sample = col_names[:5]  # First 5 columns for examples
    sample_questions = [
        {"id": _gen_id(), "question": [f"What are the distinct values in {table_identifier}?"]},
        {"id": _gen_id(), "question": [f"Show me the first 10 rows from {table_identifier}"]},
        {"id": _gen_id(), "question": [f"Summarize {table_identifier} by {cols_sample[0]}" if cols_sample else f"Count rows in {table_identifier}"]},
    ]
    sample_questions.sort(key=lambda x: x["id"])

    # Build table config
    table_config = {
        "identifier": table_identifier,
        "description": [description or f"Table {table_identifier} for KPI creation"],
        "column_configs": column_configs,
    }

    # Build serialized_space JSON (version 2)
    space_config = {
        "version": 2,
        "config": {
            "sample_questions": sample_questions,
        },
        "data_sources": {
            "tables": [table_config],
        },
        "instructions": {
            "text_instructions": [
                {
                    "id": _gen_id(),
                    "content": [
                        f"Generate valid Databricks SQL for the table {table_identifier}. "
                        "Use three-part identifiers with backticks. Return only executable SQL. "
                        "Include LIMIT when appropriate for exploratory queries.",
                    ],
                }
            ],
        },
    }

    serialized_space = json.dumps(space_config)

    payload = {
        "warehouse_id": warehouse_id,
        "serialized_space": serialized_space,
        "title": title or f"KPI Space: {table_identifier}",
        "description": description or f"Dynamic Genie space for {table_identifier}",
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
) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    High-level: Create space (if needed), ask Genie, return SQL.

    Returns:
        (space_id, sql, error_message)
    """
    space_id = existing_space_id

    if not space_id:
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
