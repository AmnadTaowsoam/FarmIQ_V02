## /app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
 
import logging
from app.config import Config
from app.api.v1.endpoints import router as api_router

# Initialize FastAPI app
app = FastAPI()

# Initialize Logger
logger = logging.getLogger(__name__)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/api/health", tags=["Health Check"])
async def health_check_api():
    logger.debug("Health check endpoint called.")
    return {"status": "healthy"}

@app.get("/health", tags=["Health Check"])
async def health_check():
    logger.debug("Health check endpoint called.")
    return {"status": "healthy"}

# Route Registration
app.include_router(api_router, prefix="/api/v1/inference")

# Main entry point for development
if __name__ == "__main__":
    import uvicorn
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = Config.PORT
    logger.info(f"Starting server at {HOST}:{PORT}")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True, workers=2)

