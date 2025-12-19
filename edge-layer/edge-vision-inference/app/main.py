"""Main application entry point for edge-vision-inference service."""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import Config
from app.db import InferenceDb
from app.inference_service import InferenceService
from app.job_service import JobService
from app.api.v1.endpoints import router as api_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO),
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "service": "edge-vision-inference"}',
    datefmt="%Y-%m-%dT%H:%M:%S"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    config = Config()
    db = InferenceDb(config.DATABASE_URL)
    await db.connect()
    await db.ensure_schema()
    
    inference_service = InferenceService(config)
    job_service = JobService(db, inference_service)
    
    app.state.db = db
    app.state.inference_service = inference_service
    app.state.job_service = job_service
    
    logger.info("Application started")
    
    yield
    
    # Shutdown
    await db.close()
    logger.info("Application shutdown")


# Initialize FastAPI app
app = FastAPI(
    title="FarmIQ Edge Vision Inference Service",
    version="1.0.0",
    docs_url="/api-docs",
    redoc_url=None,
    openapi_url="/api-docs/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoints
@app.get("/api/health", tags=["Health"])
async def health_check_api():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint (alias)."""
    return {"status": "healthy"}

@app.get("/api/ready", tags=["Health"])
async def ready_check(request: Request):
    """Readiness check endpoint."""
    db: InferenceDb = request.app.state.db
    db_ok = await db.ping()
    
    if not db_ok:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "db": False}
        )
    
    return {"status": "ready", "db": True}

# Route Registration
app.include_router(api_router, prefix="/api/v1/inference")

# Main entry point for development
if __name__ == "__main__":
    import uvicorn
    config = Config()
    logger.info(f"Starting server at {config.HOST}:{config.PORT}")
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, reload=True)

