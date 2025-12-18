import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import Settings
from app.db import AnalyticsDb
from app.logging_ import configure_logging, request_id_ctx, trace_id_ctx
from app.rabbitmq import RabbitConsumer
from app.routes import router as analytics_router

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        db = AnalyticsDb(settings.database_url)
        await db.connect()
        await db.ensure_schema()
        app.state.db = db

        consumer: RabbitConsumer | None = None
        if settings.consumer_enabled:
            consumer = RabbitConsumer(settings=settings, db=db)
            app.state.rabbit = consumer
            consumer_task = asyncio.create_task(consumer.run_forever())
        else:
            app.state.rabbit = None
            consumer_task = None

        try:
            yield
        finally:
            if consumer_task:
                consumer_task.cancel()
                with contextlib.suppress(asyncio.CancelledError, Exception):
                    await consumer_task
            if consumer:
                await consumer.close()
            await db.close()

    app = FastAPI(
        title="FarmIQ Cloud Analytics Service",
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
        request_id = request.headers.get("x-request-id") or settings.new_id()
        trace_id = request.headers.get("x-trace-id") or settings.new_id()
        request_id_ctx.set(request_id)
        trace_id_ctx.set(trace_id)

        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        response.headers["x-trace-id"] = trace_id
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_request: Request, exc: RequestValidationError):
        trace_id = trace_id_ctx.get()
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": exc.errors(),
                    "traceId": trace_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, exc: Exception):
        trace_id = trace_id_ctx.get()
        logger.exception("Unhandled error", extra={"traceId": trace_id})
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Internal error",
                    "traceId": trace_id,
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
        db: AnalyticsDb = app.state.db
        rabbit: RabbitConsumer | None = app.state.rabbit

        db_ok = await db.ping()
        rabbit_ok = True if rabbit is None else rabbit.is_connected()

        if not db_ok or not rabbit_ok:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "db": db_ok, "rabbitmq": rabbit_ok},
            )

        return {"status": "ready", "db": True, "rabbitmq": rabbit_ok}

    app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
    return app


app = create_app()
