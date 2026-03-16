from fastapi import APIRouter
from app.services.base import fetch_all

router = APIRouter()

@router.get("/summary")
def summary():
    query = '''
    SELECT COUNT(*) as total_kpis
    FROM gold.kpi_master
    WHERE is_deleted = false
    '''
    return fetch_all(query)[0]