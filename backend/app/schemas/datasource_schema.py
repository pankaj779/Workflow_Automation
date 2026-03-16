from pydantic import BaseModel
from typing import List, Dict, Any


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
    rows: List[Dict[str, Any]]
