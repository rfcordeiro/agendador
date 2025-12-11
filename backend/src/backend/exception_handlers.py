from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import Throttled
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc: Exception, context: dict) -> Response | None:
    """Normalize throttling messages to pt-BR while delegating to the default handler."""
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled) and response is not None:
        wait_seconds = int(getattr(exc, "wait", 0) or 0)
        human_wait = f"{wait_seconds} segundos" if wait_seconds else "alguns instantes"
        response.data = {
            "detail": f"Limite de requisições atingido. Tente novamente em {human_wait}."
        }
        response.status_code = status.HTTP_429_TOO_MANY_REQUESTS

    return response
