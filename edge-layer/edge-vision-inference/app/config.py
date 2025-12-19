# utils/config.py
from dotenv import load_dotenv
import os
from pathlib import Path

# 1. หาโฟลเดอร์ services (สองระดับเหนือไฟล์นี้)
base_services = Path(__file__).resolve().parents[2]

# 2. โหลดค่าจาก .env.common
common_env = base_services / ".env"
if common_env.exists():
    load_dotenv(dotenv_path=common_env)
    print(f"Loaded common env: {common_env}")

class Config:
    # Logging and Timeouts
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    CONNECTION_TIMEOUT: int = int(os.getenv("CONNECTION_TIMEOUT", "10"))
    READ_TIMEOUT: int = int(os.getenv("READ_TIMEOUT", "30"))

    # Service runtime
    MODEL_VERSION: str = os.getenv("MODEL_VERSION", "0.0")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_LOG_CHANNEL: str = os.getenv("REDIS_LOG_CHANNEL", "microplate:vision-inference:logs")
    REDIS_ERROR_CHANNEL: str = os.getenv("REDIS_ERROR_CHANNEL", "microplate:vision-inference:errors")

    # Service URLs
    IMAGE_SERVICE_URL: str = os.getenv("IMAGE_SERVICE_URL", "http://image-ingestion-service:6402")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:6400")
    PREDICTION_DB_SERVICE_URL: str = os.getenv("PREDICTION_DB_SERVICE_URL", "http://prediction-db-service:6404")

    # Processing Configuration
    MAX_CONCURRENT_INFERENCES: int = int(os.getenv("MAX_CONCURRENT_INFERENCES", "5"))
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
    NMS_THRESHOLD: float = float(os.getenv("NMS_THRESHOLD", "0.4"))
    ENABLE_GPU: bool = os.getenv("ENABLE_GPU", "false").lower() == "true"
    GPU_DEVICE_ID: int = int(os.getenv("GPU_DEVICE_ID", "0"))
