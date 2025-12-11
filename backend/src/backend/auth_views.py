from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import HttpRequest
from django.middleware.csrf import get_token
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """Limit login attempts per IP to reduce brute-force."""

    scope = "login"

    def get_cache_key(self, request: Request, view: Any) -> str | None:
        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}


class PasswordResetRateThrottle(SimpleRateThrottle):
    """Limit reset requests per IP to avoid abuse."""

    scope = "password_reset"

    def get_cache_key(self, request: Request, view: Any) -> str | None:
        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}


def _serialize_user(user: User) -> dict[str, Any]:
    """Return a user payload including permissions/roles for the frontend."""
    roles = list(user.groups.values_list("name", flat=True))
    permissions = sorted(set(user.get_all_permissions()))
    base_role = "admin" if user.is_staff or user.is_superuser else "operador"
    primary_role = roles[0] if roles else base_role
    return {
        "id": user.id,
        "username": user.username,
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "role": primary_role,
        "roles": roles or [primary_role],
        "permissions": permissions,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }


@api_view(["GET"])
@permission_classes([])
@ensure_csrf_cookie
def csrf_view(_request: HttpRequest) -> Response:
    # Forces the middleware to set the CSRF cookie
    return Response({"detail": "CSRF cookie set."})


@api_view(["POST"])
@permission_classes([])  # allow anonymous
@throttle_classes([LoginRateThrottle])
def login_view(request: Request) -> Response:
    payload: Mapping[str, Any]
    if isinstance(request.data, Mapping):
        payload = request.data
    else:
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

    login(request, user)
    # Ensure a CSRF token is available for subsequent POSTs
    get_token(request)

    return Response({"user": _serialize_user(user)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request: Request) -> Response:
    user = request.user
    if not isinstance(user, User):
        return Response({"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({"user": _serialize_user(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request: Request) -> Response:
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def password_change_view(request: Request) -> Response:
    payload: Mapping[str, Any]
    if isinstance(request.data, Mapping):
        payload = request.data
    else:
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

    return Response(
        {
            "detail": "Senha alterada com sucesso.",
            "user": _serialize_user(user),
        }
    )


logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([])  # allow anonymous
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request_view(request: Request) -> Response:
    payload: Mapping[str, Any]
    if isinstance(request.data, Mapping):
        payload = request.data
    else:
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return Response({"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST)

    email = (payload.get("email") or "").strip()
    if email:
        logger.info("Solicitação de reset de senha para email %s (mock, sem envio real)", email)
    else:
        logger.info("Solicitação de reset de senha sem email informado (mock)")

    users = list(User.objects.filter(email__iexact=email)) if email else []
    if users:
        token_generator = PasswordResetTokenGenerator()
        for user in users:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = token_generator.make_token(user)
            reset_link = f"{settings.FRONTEND_RESET_URL}?uid={uid}&token={token}"
            subject = "Recuperação de senha - Agendador"
            message = (
                "Recebemos um pedido para redefinir sua senha.\n"
                f"Clique no link ou copie e cole no navegador:\n{reset_link}\n\n"
                "Se você não solicitou, ignore este email."
            )
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            logger.info("Email de reset enviado (mock SMTP) para %s", user.email)
    else:
        logger.info("Solicitação de reset sem correspondência de usuário (email=%s)", email)

    # Resposta genérica para evitar exposição de usuários
    return Response(
        {"detail": "Se o email existir, enviaremos instruções para redefinir a senha."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([])  # allow anonymous
def password_reset_confirm_view(request: Request) -> Response:
    payload: Mapping[str, Any]
    if isinstance(request.data, Mapping):
        payload = request.data
    else:
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return Response({"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST)

    uidb64 = (payload.get("uid") or "").strip()
    token = (payload.get("token") or "").strip()
    new_password = (payload.get("new_password") or "").strip()

    if not uidb64 or not token or not new_password:
        return Response(
            {"detail": "Campos obrigatórios faltando."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError):
        return Response(
            {"detail": "Token inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST
        )

    token_generator = PasswordResetTokenGenerator()
    if not token_generator.check_token(user, token):
        return Response(
            {"detail": "Token inválido ou expirado."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        validate_password(new_password, user=user)
    except Exception as exc:  # noqa: BLE001
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])

    return Response(
        {
            "detail": "Senha redefinida com sucesso.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def email_change_view(request: Request) -> Response:
    payload: Mapping[str, Any]
    if isinstance(request.data, Mapping):
        payload = request.data
    else:
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return Response({"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST)

    new_email = (payload.get("email") or "").strip().lower()
    if not new_email:
        return Response({"detail": "Email é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_email(new_email)
    except ValidationError:
        return Response({"detail": "Email inválido."}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not isinstance(user, User):
        return Response({"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED)

    if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
        return Response(
            {"detail": "Email já está em uso por outro usuário."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.email.lower() == new_email:
        return Response(
            {"detail": "O email informado já está cadastrado."}, status=status.HTTP_400_BAD_REQUEST
        )

    user.email = new_email
    user.save(update_fields=["email"])

    return Response(
        {
            "detail": "Email atualizado com sucesso.",
            "user": _serialize_user(user),
        },
        status=status.HTTP_200_OK,
    )
