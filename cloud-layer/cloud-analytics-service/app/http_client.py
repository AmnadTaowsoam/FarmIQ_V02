from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Optional

import httpx


@dataclass(frozen=True)
class RetryPolicy:
    max_retries: int
    retry_on_statuses: set[int]
    retry_on_exceptions: tuple[type[Exception], ...]


async def request_json_with_retries(
    *,
    method: str,
    url: str,
    headers: dict[str, str],
    params: Optional[dict[str, Any]] = None,
    json_body: Optional[dict[str, Any]] = None,
    timeout_s: float,
    policy: RetryPolicy,
    client_factory: Callable[[float], httpx.AsyncClient] | None = None,
) -> tuple[int, dict[str, Any]]:
    last_exc: Exception | None = None

    def _default_factory(timeout: float) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=timeout)

    factory = client_factory or _default_factory

    for attempt in range(policy.max_retries + 1):
        try:
            async with factory(timeout_s) as client:
                resp = await client.request(method, url, headers=headers, params=params, json=json_body)

            status = resp.status_code
            if status in policy.retry_on_statuses and attempt < policy.max_retries:
                continue

            if not resp.content:
                data = {}
            else:
                try:
                    data = resp.json()
                except ValueError:
                    # Guardrail: avoid crashing on invalid JSON responses from downstream services.
                    data = {"rawText": resp.text}
            return status, data if isinstance(data, dict) else {"data": data}
        except policy.retry_on_exceptions as exc:
            last_exc = exc
            if attempt >= policy.max_retries:
                raise
            continue

    if last_exc:
        raise last_exc
    raise RuntimeError("request_json_with_retries failed unexpectedly")
