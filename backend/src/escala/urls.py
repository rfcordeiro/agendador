"""URLs para escala."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AgendaGoogleViewSet,
    AlocacaoViewSet,
    EventoCalendarViewSet,
    ExecucaoJobViewSet,
    PromptHistoryViewSet,
    TrocaViewSet,
)

router = DefaultRouter()
router.register(r"alocacoes", AlocacaoViewSet, basename="alocacao")
router.register(r"jobs", ExecucaoJobViewSet, basename="job")
router.register(r"prompts", PromptHistoryViewSet, basename="prompt")
router.register(r"trocas", TrocaViewSet, basename="troca")
router.register(r"agendas-google", AgendaGoogleViewSet, basename="agenda-google")
router.register(r"eventos-calendar", EventoCalendarViewSet, basename="evento-calendar")

urlpatterns = [
    path("", include(router.urls)),
]
