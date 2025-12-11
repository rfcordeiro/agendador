from __future__ import annotations

from django.db.models import QuerySet
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import CapacidadeSala, Local, PremissasGlobais, Profissional, Sala
from .serializers import (
    CapacidadeSalaSerializer,
    LocalSerializer,
    PremissasGlobaisSerializer,
    ProfissionalSerializer,
    SalaSerializer,
)


class ProfissionalViewSet(viewsets.ModelViewSet):
    queryset = Profissional.objects.prefetch_related("locais_preferidos", "locais_proibidos")
    serializer_class = ProfissionalSerializer
    permission_classes = [IsAuthenticated]


class LocalViewSet(viewsets.ModelViewSet):
    queryset = Local.objects.all()
    serializer_class = LocalSerializer
    permission_classes = [IsAuthenticated]


class SalaViewSet(viewsets.ModelViewSet):
    queryset = Sala.objects.select_related("local")
    serializer_class = SalaSerializer
    permission_classes = [IsAuthenticated]


class CapacidadeSalaViewSet(viewsets.ModelViewSet):
    queryset = CapacidadeSala.objects.select_related("sala", "sala__local")
    serializer_class = CapacidadeSalaSerializer
    permission_classes = [IsAuthenticated]


class PremissasGlobaisViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = PremissasGlobais.objects.all()
    serializer_class = PremissasGlobaisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[PremissasGlobais]:
        # Sempre retorna apenas o registro singleton para evitar múltiplas instâncias.
        return PremissasGlobais.objects.filter(singleton=True)
