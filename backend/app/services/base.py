from app.db.connection import get_connection

def fetch_all(query: str, params: tuple = ()):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            cols = [c[0] for c in cursor.description]
            return [dict(zip(cols, r)) for r in cursor.fetchall()]