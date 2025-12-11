from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_email_change_updates_user_and_returns_payload() -> None:
    cache.clear()
    user = User.objects.create_user(
        username="carol",
        email="carol@example.com",
        password="secret123",  # noqa: S106
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/auth/email/change",
        {"email": "carol.nova@example.com"},
        format="json",
    )

    user.refresh_from_db()
    assert response.status_code == 200
    assert user.email == "carol.nova@example.com"
    assert response.data["user"]["email"] == "carol.nova@example.com"


@pytest.mark.django_db
def test_email_change_blocks_existing_email() -> None:
    cache.clear()
    user = User.objects.create_user(
        username="dani",
        email="dani@example.com",
        password="secret123",  # noqa: S106
    )
    other = User.objects.create_user(
        username="eli",
        email="eli@example.com",
        password="secret123",  # noqa: S106
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/auth/email/change",
        {"email": other.email},
        format="json",
    )

    assert response.status_code == 400
    assert "já está em uso" in str(response.data.get("detail"))
