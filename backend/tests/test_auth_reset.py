from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_password_reset_sends_email_when_user_exists() -> None:
    cache.clear()
    User.objects.create_user(username="alice", email="alice@example.com", password="secret123")  # noqa: S106
    client = APIClient()

    response = client.post(
        "/api/auth/password/reset/",
        {"email": "alice@example.com"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["detail"]
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["alice@example.com"]
    assert "token=" in mail.outbox[0].body


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_password_reset_returns_200_for_unknown_email() -> None:
    cache.clear()
    client = APIClient()

    response = client.post(
        "/api/auth/password/reset/",
        {"email": "missing@example.com"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["detail"]
    assert len(mail.outbox) == 0


@pytest.mark.django_db
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    REST_FRAMEWORK={
        "DEFAULT_RENDERER_CLASSES": [
            "rest_framework.renderers.JSONRenderer",
        ],
        "DEFAULT_PARSER_CLASSES": [
            "rest_framework.parsers.JSONParser",
        ],
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework.authentication.SessionAuthentication",
        ],
        "DEFAULT_THROTTLE_CLASSES": [
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
            "backend.auth_views.PasswordResetRateThrottle",
        ],
        "DEFAULT_THROTTLE_RATES": {
            "anon": "500/day",
            "user": "1000/day",
            "login": "5/min",
            "password_reset": "1/min",
        },
        "EXCEPTION_HANDLER": "backend.exception_handlers.custom_exception_handler",
    },
)
def test_password_reset_throttles_multiple_requests() -> None:
    cache.clear()
    User.objects.create_user(username="bruno", email="bruno@example.com", password="secret123")  # noqa: S106
    client = APIClient()

    first = client.post(
        "/api/auth/password/reset/",
        {"email": "bruno@example.com"},
        format="json",
    )
    second = client.post(
        "/api/auth/password/reset/",
        {"email": "bruno@example.com"},
        format="json",
    )

    assert first.status_code == 200
    assert len(mail.outbox) == 1
    assert second.status_code == 429
    assert "Limite de requisições" in str(second.data.get("detail"))
