"""Logging configuration for Advanced Analytics Service"""

import logging
import sys
from contextvars import ContextVar

from pythonjsonlogger import jsonlogger

from app.config import Settings

# Context variables for request tracking
request_id_ctx: ContextVar[str] = ContextVar('request_id', default='')
trace_id_ctx: ContextVar[str] = ContextVar('trace_id', default='')
tenant_id_ctx: ContextVar[str] = ContextVar('tenant_id', default='')


class ContextJsonFormatter(jsonlogger.JsonFormatter):
    """JSON formatter that includes request context variables"""
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record["requestId"] = request_id_ctx.get()
        log_record["traceId"] = trace_id_ctx.get()
        log_record["tenantId"] = tenant_id_ctx.get()


def configure_logging(settings: Settings) -> None:
    """Configure JSON logging for the service"""
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(settings.log_level.upper())

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setLevel(settings.log_level.upper())
    
    # Use JSON formatter
    handler.setFormatter(ContextJsonFormatter("%(message)s"))
    
    root.addHandler(handler)
