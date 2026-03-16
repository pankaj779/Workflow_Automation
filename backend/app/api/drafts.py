from fastapi import APIRouter
from app.services.base import fetch_all

router = APIRouter()

@router.get("/")
def list_drafts():
    return fetch_all("SELECT * FROM gold.kpi_drafts WHERE is_deleted = false")