from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_favorites():
    return {"message": "Favorites endpoint placeholder"}