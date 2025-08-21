from pydantic import BaseModel
import os

class Settings(BaseModel):
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "80"))
    DATA_DIR: str = os.getenv("DATA_DIR", "data")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

settings = Settings()

# Ensure directories exist at runtime
os.makedirs(settings.DATA_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)