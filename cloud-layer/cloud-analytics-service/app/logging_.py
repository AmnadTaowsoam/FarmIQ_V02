from __future__ import annotations

import logging
import sys
from contextvars import ContextVar

from pythonjsonlogger import jsonlogger

from app.config import Settings

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
trace_id_ctx: ContextVar[str] = ContextVar("trace_id", default="")


class ContextJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record["requestId"] = request_id_ctx.get()
        log_record["traceId"] = trace_id_ctx.get()


def configure_logging(settings: Settings) -> None:
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(settings.log_level.upper())

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setLevel(settings.log_level.upper())

    if settings.log_format.lower() == "json":
        handler.setFormatter(ContextJsonFormatter("%(message)s"))
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))

    root.addHandler(handler)

