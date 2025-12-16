from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CapacidadeSalaViewSet,
    LocalViewSet,
    PremissasGlobaisViewSet,
    ProfissionalViewSet,
    SalaViewSet,
)

router = DefaultRouter()
router.register("profissionais", ProfissionalViewSet)
router.register("locais", LocalViewSet)
router.register("salas", SalaViewSet)
router.register("capacidade-salas", CapacidadeSalaViewSet, basename="capacidade-salas")
router.register("premissas-globais", PremissasGlobaisViewSet, basename="premissas-globais")

urlpatterns = [
    path("", include(router.urls)),
]
