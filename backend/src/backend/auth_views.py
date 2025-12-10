from __future__ import annotations

import json
from typing import Any

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.http import HttpRequest
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response


def _serialize_user(user: User) -> dict[str, Any]:
    """Return a minimal user payload for the frontend."""
    role = "admin" if user.is_staff or user.is_superuser else "operador"
    return {
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "role": role,
    }


@api_view(["POST"])
@permission_classes([])  # allow anonymous
def login_view(request: HttpRequest) -> Response:
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return Response({"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST)

    username = (payload.get("username") or payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not username or not password:
        return Response(
            {"detail": "Usuário e senha são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
    )

    user = authenticate(request, username=username, password=password)
    if user is None or not isinstance(user, User):
        return Response({"detail": "Credenciais inválidas."}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {
            "token": token.key,
            "user": _serialize_user(user),
        }
    )


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def me_view(request: Request) -> Response:
    user = request.user
    if not isinstance(user, User):
        return Response({"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"user": _serialize_user(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request: Request) -> Response:
    if isinstance(request.auth, Token):
        Token.objects.filter(key=request.auth.key).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def password_change_view(request: Request) -> Response:
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return Response({"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST)

    old_password = (payload.get("old_password") or "").strip()
    new_password = (payload.get("new_password") or "").strip()

    if not old_password or not new_password:
        return Response(
            {"detail": "Campos obrigatórios faltando."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user
    if not isinstance(user, User):
        return Response({"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(old_password):
        return Response({"detail": "Senha atual inválida."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new_password, user=user)
    except Exception as exc:  # noqa: BLE001
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)

    return Response(
        {
            "detail": "Senha alterada com sucesso.",
            "token": token.key,
            "user": _serialize_user(user),
        }
    )
