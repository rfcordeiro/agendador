"""Views para gestão de escalas e alocações."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from django.db.models import Count, QuerySet
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AgendaGoogle, Alocacao, EventoCalendar, ExecucaoJob, PromptHistory, Troca
from .serializers import (
    AgendaGoogleSerializer,
    AlocacaoSerializer,
    EventoCalendarSerializer,
    ExecucaoJobSerializer,
    PromptHistorySerializer,
    TrocaSerializer,
)


class AlocacaoViewSet(viewsets.ModelViewSet):
    """ViewSet para Alocações com filtros avançados."""

    queryset = Alocacao.objects.select_related("profissional", "local", "sala", "sala__local").all()
    serializer_class = AlocacaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["profissional", "local", "sala", "data", "turno", "status", "origem"]
    ordering_fields = ["data", "turno", "profissional__nome", "local__nome"]
    ordering = ["data", "turno"]

    def get_queryset(self) -> QuerySet[Alocacao]:
        """Filtros customizados via query params."""
        queryset = super().get_queryset()

        # Filtro por range de datas
        data_inicio = self.request.query_params.get("data_inicio")
        data_fim = self.request.query_params.get("data_fim")
        if data_inicio:
            queryset = queryset.filter(data__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data__lte=data_fim)

        # Filtro por profissional (múltiplos)
        profissionais = self.request.query_params.getlist("profissionais[]")
        if profissionais:
            queryset = queryset.filter(profissional__id__in=profissionais)

        # Filtro por local (múltiplos)
        locais = self.request.query_params.getlist("locais[]")
        if locais:
            queryset = queryset.filter(local__id__in=locais)

        return queryset

    @action(detail=False, methods=["get"])
    def inconsistencias(self, request: Any) -> Response:
        """Lista inconsistências com severidades (ERROR, WARNING)."""
        # Filtros opcionais
        severidade = request.query_params.get("severidade")  # ERROR ou WARNING
        data_inicio = request.query_params.get("data_inicio")
        data_fim = request.query_params.get("data_fim")

        # Buscar alocações
        queryset = self.get_queryset()
        if data_inicio:
            queryset = queryset.filter(data__gte=data_inicio)
        if data_fim:
            queryset = queryset.filter(data__lte=data_fim)

        # Coletar inconsistências
        inconsistencias = []
        for alocacao in queryset:
            serializer = self.get_serializer(alocacao)
            issues = serializer.data.get("validation_issues", [])

            # Filtrar por severidade se especificado
            if severidade:
                issues = [i for i in issues if i["severity"] == severidade]

            if issues:
                inconsistencias.append(
                    {
                        "alocacao_id": alocacao.id,
                        "profissional": alocacao.profissional.nome,
                        "local": alocacao.local.nome,
                        "data": alocacao.data,
                        "turno": alocacao.get_turno_display(),
                        "issues": issues,
                    }
                )

        return Response(inconsistencias)

    @action(detail=False, methods=["get"])
    def estatisticas(self, request: Any) -> Response:
        """Estatísticas das últimas semanas (1, 2, 3, 4 semanas)."""
        semanas = int(request.query_params.get("semanas", 4))

        hoje = date.today()
        inicio = hoje - timedelta(weeks=semanas)

        # Buscar alocações no período
        alocacoes = Alocacao.objects.filter(data__gte=inicio, data__lte=hoje).select_related(
            "profissional", "local"
        )

        # Estatísticas por profissional
        stats_profissionais: dict[int, dict[str, Any]] = {}
        for alocacao in alocacoes:
            prof_id = alocacao.profissional.id
            prof_nome = alocacao.profissional.nome

            if prof_id not in stats_profissionais:
                stats_profissionais[prof_id] = {
                    "nome": prof_nome,
                    "total_turnos": 0,
                    "horas_total": 0,
                    "locais": {},
                    "dobras": 0,
                }

            stats_profissionais[prof_id]["total_turnos"] += 1
            stats_profissionais[prof_id]["horas_total"] += 6  # 6h por turno

            # Contar por local
            local_nome = alocacao.local.nome
            if local_nome not in stats_profissionais[prof_id]["locais"]:
                stats_profissionais[prof_id]["locais"][local_nome] = 0
            stats_profissionais[prof_id]["locais"][local_nome] += 1

        # Contar dobras (dias com 2+ turnos)
        for prof_id in stats_profissionais:
            dobras = (
                alocacoes.filter(profissional_id=prof_id)
                .values("data")
                .annotate(turnos=Count("id"))
                .filter(turnos__gte=2)
                .count()
            )
            stats_profissionais[prof_id]["dobras"] = dobras

        return Response(
            {
                "periodo": {
                    "inicio": inicio,
                    "fim": hoje,
                    "semanas": semanas,
                },
                "profissionais": list(stats_profissionais.values()),
            }
        )


class ExecucaoJobViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para Execuções de Jobs (somente leitura)."""

    queryset = ExecucaoJob.objects.all()
    serializer_class = ExecucaoJobSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["tipo", "status", "autor"]
    ordering = ["-iniciou_em"]


class PromptHistoryViewSet(viewsets.ModelViewSet):
    """ViewSet para Histórico de Prompts."""

    queryset = PromptHistory.objects.all()
    serializer_class = PromptHistorySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["acao", "publicada", "plataforma", "autor"]
    ordering = ["-created_at"]


class TrocaViewSet(viewsets.ModelViewSet):
    """ViewSet para Trocas."""

    queryset = Troca.objects.select_related(
        "profissional_origem",
        "profissional_destino",
        "local",
        "sala",
    ).all()
    serializer_class = TrocaSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "origem", "data"]
    ordering = ["-data"]

    @action(detail=True, methods=["post"])
    def aplicar(self, request: Any, pk: int | None = None) -> Response:
        """Aplica a troca, atualizando alocações correspondentes."""
        troca = self.get_object()

        if troca.status != "registrada":
            return Response(
                {"error": "Troca já foi aplicada ou cancelada"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar alocação original
        alocacao = Alocacao.objects.filter(
            profissional=troca.profissional_origem,
            data=troca.data,
            turno=troca.turno,
        )

        if troca.local:
            alocacao = alocacao.filter(local=troca.local)
        if troca.sala:
            alocacao = alocacao.filter(sala=troca.sala)

        alocacao_obj = alocacao.first()

        if not alocacao_obj:
            return Response(
                {"error": "Alocação original não encontrada"}, status=status.HTTP_404_NOT_FOUND
            )

        # Atualizar profissional
        alocacao_obj.profissional = troca.profissional_destino
        alocacao_obj.origem = "manual"
        alocacao_obj.status = "ajustado"
        alocacao_obj.save()

        # Marcar troca como aplicada
        troca.status = "aplicada"
        troca.save()

        return Response({"message": "Troca aplicada com sucesso", "alocacao_id": alocacao_obj.id})


class AgendaGoogleViewSet(viewsets.ModelViewSet):
    """ViewSet para Agendas Google."""

    queryset = AgendaGoogle.objects.select_related("profissional").all()
    serializer_class = AgendaGoogleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["profissional", "pode_publicar", "ativa"]
    ordering = ["profissional__nome"]

    @action(detail=True, methods=["post"])
    def sincronizar(self, request: Any, pk: int | None = None) -> Response:
        """Sincroniza agenda específica com Google Calendar."""
        agenda = self.get_object()

        # TODO: Implementar sincronização real com Google Calendar (Sprint 5)
        # Por enquanto retorna sucesso simulado

        from django.utils import timezone

        agenda.ultima_sync = timezone.now()
        agenda.save()

        return Response(
            {
                "message": f"Agenda '{agenda.nome}' sincronizada com sucesso",
                "ultima_sync": agenda.ultima_sync,
            }
        )


class EventoCalendarViewSet(viewsets.ModelViewSet):
    """ViewSet para Eventos do Calendar."""

    queryset = EventoCalendar.objects.select_related("agenda", "alocacao").all()
    serializer_class = EventoCalendarSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["agenda", "status", "origem"]
    ordering = ["-data_inicio"]
