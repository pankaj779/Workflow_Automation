import os
from databricks import sql
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return sql.connect(
        server_hostname=os.getenv("DB_HOST"),
        http_path=os.getenv("DB_HTTP_PATH"),
        access_token=os.getenv("DB_TOKEN"),
    )