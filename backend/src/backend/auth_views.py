from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.sessions.models import Session
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import HttpRequest
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

logger = logging.getLogger(__name__)


class LoginRateThrottle(SimpleRateThrottle):
    """Limit login attempts per IP to reduce brute-force."""

    scope = "login"

    def get_cache_key(self, request: Request, view: Any) -> str | None:
        ident = self.get_ident(request)
        if not ident:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _get_user_agent(request: Request) -> str:
    return request.META.get("HTTP_USER_AGENT", "")


def _log_auth_event(
    action: str,
    status: str,
    request: Request,
    *,
    user: User | None = None,
    username: str | None = None,
) -> None:
    user_identifier = username or (user.username if user else None)
    payload = {
        "action": action,
        "status": status,
        "user": user_identifier or "anonymous",
        "user_id": user.id if user else None,
        "ip": _get_client_ip(request),
        "user_agent": _get_user_agent(request),
        "path": request.path,
        "method": request.method,
    }
    logger.info("auth_event %s", json.dumps(payload))


def _delete_other_sessions(user_id: int, current_session_key: str | None) -> None:
    active_sessions = Session.objects.filter(expire_date__gt=timezone.now())
    for session in active_sessions.iterator():
        try:
            data = session.get_decoded()
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Falha ao decodificar sessão ao invalidar outras sessões: %s", exc
            )
            continue

        session_user_id = data.get("_auth_user_id")
        if session_user_id is None:
            continue

        if (
            str(session_user_id) == str(user_id)
            and session.session_key != current_session_key
        ):
            session.delete()


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
            return Response(
                {"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST
            )

    username_or_email = (payload.get("username") or payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not username_or_email or not password:
        _log_auth_event(
            "login", "missing_credentials", request, username=username_or_email
        )
        return Response(
            {"detail": "Usuário e senha são obrigatórios."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user: User | None = None
    if User.objects.filter(username=username_or_email).exists():
        auth_user = authenticate(request, username=username_or_email, password=password)
        if isinstance(auth_user, User):
            user = auth_user
    else:
        email_user: User | None = (
            User.objects.filter(email__iexact=username_or_email)
            .only("username")
            .first()
        )
        if email_user:
            auth_user = authenticate(
                request, username=email_user.username, password=password
            )
            if isinstance(auth_user, User):
                user = auth_user

    if user is None or not isinstance(user, User):
        _log_auth_event(
            "login", "invalid_credentials", request, username=username_or_email
        )
        return Response(
            {"detail": "Credenciais inválidas."}, status=status.HTTP_401_UNAUTHORIZED
        )

    login(request, user)
    request.session.cycle_key()
    _log_auth_event("login", "success", request, user=user)
    # Ensure a CSRF token is available for subsequent POSTs
    get_token(request)

    return Response({"user": _serialize_user(user)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request: Request) -> Response:
    user = request.user
    if not isinstance(user, User):
        return Response(
            {"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED
        )
    return Response({"user": _serialize_user(user)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request: Request) -> Response:
    user = request.user if isinstance(request.user, User) else None
    logout(request)
    _log_auth_event("logout", "success", request, user=user)
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
            return Response(
                {"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST
            )

    old_password = (payload.get("old_password") or "").strip()
    new_password = (payload.get("new_password") or "").strip()
    user_for_log = request.user if isinstance(request.user, User) else None

    if not old_password or not new_password:
        _log_auth_event("password_change", "missing_fields", request, user=user_for_log)
        return Response(
            {"detail": "Campos obrigatórios faltando."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(request.user, User):
        _log_auth_event("password_change", "invalid_session", request)
        return Response(
            {"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED
        )

    user = request.user
    if not user.check_password(old_password):
        _log_auth_event(
            "password_change", "invalid_current_password", request, user=user
        )
        return Response(
            {"detail": "Senha atual inválida."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        validate_password(new_password, user=user)
    except Exception as exc:  # noqa: BLE001
        _log_auth_event(
            "password_change", "password_validation_failed", request, user=user
        )
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    current_session_key = request.session.session_key
    user.set_password(new_password)
    user.save(update_fields=["password"])
    _delete_other_sessions(user.id, current_session_key)
    update_session_auth_hash(request, user)
    request.session.cycle_key()
    _log_auth_event("password_change", "success", request, user=user)

    return Response(
        {
            "detail": "Senha alterada com sucesso.",
            "user": _serialize_user(user),
        }
    )


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
            return Response(
                {"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST
            )

    email = (payload.get("email") or "").strip()
    if email:
        logger.info(
            "Solicitação de reset de senha para email %s (mock, sem envio real)", email
        )
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
        logger.info(
            "Solicitação de reset sem correspondência de usuário (email=%s)", email
        )

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
            return Response(
                {"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST
            )

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
            {"detail": "Token inválido ou expirado."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token_generator = PasswordResetTokenGenerator()
    if not token_generator.check_token(user, token):
        return Response(
            {"detail": "Token inválido ou expirado."},
            status=status.HTTP_400_BAD_REQUEST,
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
            return Response(
                {"detail": "JSON inválido."}, status=status.HTTP_400_BAD_REQUEST
            )

    new_email = (payload.get("email") or "").strip().lower()
    if not new_email:
        return Response(
            {"detail": "Email é obrigatório."}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        validate_email(new_email)
    except ValidationError:
        return Response(
            {"detail": "Email inválido."}, status=status.HTTP_400_BAD_REQUEST
        )

    user = request.user
    if not isinstance(user, User):
        return Response(
            {"detail": "Sessão inválida."}, status=status.HTTP_401_UNAUTHORIZED
        )

    if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
        return Response(
            {"detail": "Email já está em uso por outro usuário."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if user.email.lower() == new_email:
        return Response(
            {"detail": "O email informado já está cadastrado."},
            status=status.HTTP_400_BAD_REQUEST,
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
