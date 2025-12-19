"""Configuration for edge-vision-inference service."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if exists
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

class Config:
    """Application configuration."""
    
    # Server
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://farmiq:farmiq_dev@postgres:5432/farmiq"
    )
    
    # Media Storage (PVC path)
    MEDIA_STORAGE_PATH: str = os.getenv("MEDIA_STORAGE_PATH", "/data/media")
    
    # Model Configuration
    MODEL_PATH: str = os.getenv("MODEL_PATH", "")
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "v1.0.0")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
    NMS_THRESHOLD: float = float(os.getenv("NMS_THRESHOLD", "0.4"))
    
    # Service URLs
    WEIGHVISION_SESSION_URL: str = os.getenv(
        "WEIGHVISION_SESSION_URL",
        "http://edge-weighvision-session:3000"
    )
    
    # Datadog
    DD_SERVICE: str = os.getenv("DD_SERVICE", "edge-vision-inference")
    DD_ENV: str = os.getenv("DD_ENV", "development")
    
    @staticmethod
    def new_id() -> str:
        """Generate a new UUID v7-like ID (simplified for MVP)."""
        import uuid
        return str(uuid.uuid4())
