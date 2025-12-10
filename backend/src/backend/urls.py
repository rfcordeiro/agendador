import json
import secrets

from django.contrib import admin
from django.contrib.auth import authenticate
from django.http import HttpRequest, JsonResponse
from django.urls import path
from django.views.decorators.csrf import csrf_exempt


def healthcheck(_request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


@csrf_exempt
def login_view(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"detail": "Método não permitido."}, status=405)

    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "JSON inválido."}, status=400)

    username = (payload.get("username") or payload.get("email") or "").strip()
    password = (payload.get("password") or "").strip()

    if not username or not password:
        return JsonResponse({"detail": "Usuário e senha são obrigatórios."}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Credenciais inválidas."}, status=401)

    token = secrets.token_hex(20)
    role = "admin" if user.is_staff or user.is_superuser else "operador"

    return JsonResponse(
        {
            "token": token,
            "user": {
                "name": user.get_full_name() or user.username,
                "email": user.email,
                "role": role,
            },
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck),
    path("api/auth/login", login_view),
]
