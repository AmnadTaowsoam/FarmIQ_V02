from __future__ import annotations

import contextlib
import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import Settings
from app.db import InMemoryMlModelDb, MlModelDb
from app.logging_ import configure_logging, request_id_ctx, tenant_id_ctx, trace_id_ctx
from app.routes import router as ml_router

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if settings.testing:
            app.state.db = InMemoryMlModelDb()
            app.state.settings = settings
            yield
            return

        db = MlModelDb(settings.database_url)
        await db.connect()
        await db.ensure_schema()
        app.state.db = db
        app.state.settings = settings

        try:
            yield
        finally:
            with contextlib.suppress(Exception):
                await db.close()

    app = FastAPI(
        title="FarmIQ Cloud ML Model Service",
        version="1.0.0",
        docs_url="/api-docs",
        redoc_url=None,
        openapi_url="/api-docs/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        started = time.perf_counter()
        request_id = request.headers.get("x-request-id") or settings.new_id()
        trace_id = request.headers.get("x-trace-id") or settings.new_id()
        request_id_ctx.set(request_id)
        trace_id_ctx.set(trace_id)

        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        response.headers["x-trace-id"] = trace_id

        duration_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "Request completed",
            extra={
                "service": settings.service_name,
                "path": str(request.url.path),
                "statusCode": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": exc.errors(),
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(_request: Request, exc: HTTPException):
        code = "INTERNAL_ERROR"
        if exc.status_code == 401:
            code = "UNAUTHORIZED"
        elif exc.status_code == 403:
            code = "FORBIDDEN"
        elif exc.status_code == 404:
            code = "NOT_FOUND"
        elif exc.status_code == 409:
            code = "CONFLICT"

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": exc.detail,
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception):
        logger.exception("Unhandled error")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Internal error",
                    "traceId": trace_id_ctx.get(),
                }
            },
        )

    @app.get("/api/health", tags=["Health"])
    async def api_health() -> dict[str, str]:
        return {"status": "healthy"}

    @app.get("/health", tags=["Health"])
    async def health_alias() -> dict[str, str]:
        return {"status": "healthy"}

    @app.get("/api/ready", tags=["Health"])
    async def api_ready() -> dict[str, Any]:
        db: MlModelDb = app.state.db
        if settings.testing:
            return {"status": "ready", "db": True}

        db_ok = await db.ping()
        if not db_ok:
            return JSONResponse(status_code=503, content={"status": "not_ready", "db": False})
        return {"status": "ready", "db": True}

    app.include_router(ml_router, prefix="/api/v1/ml", tags=["ML Models"])
    return app


app = create_app()
