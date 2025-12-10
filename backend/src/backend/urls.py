from django.contrib import admin
from django.http import HttpRequest, JsonResponse
from django.urls import path

from . import auth_views


def healthcheck(_request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck),
    path("api/auth/login", auth_views.login_view, name="login"),
    path("api/auth/logout", auth_views.logout_view, name="logout"),
    path("api/auth/me", auth_views.me_view, name="me"),
    path("api/auth/password/change", auth_views.password_change_view, name="password_change"),
]
