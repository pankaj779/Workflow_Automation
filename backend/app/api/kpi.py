from fastapi import APIRouter, HTTPException
from app.services.base import fetch_all

router = APIRouter()

@router.get("/")
def list_kpis():
    return fetch_all("SELECT * FROM gold.kpi_master WHERE is_deleted = false")

@router.get("/{kpi_id}")
def get_kpi(kpi_id: str):
    rows = fetch_all("SELECT * FROM gold.kpi_master WHERE kpi_id = ?", (kpi_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="KPI not found")
    return rows[0]