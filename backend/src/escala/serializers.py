"""Serializers para gestão de escalas e alocações."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, cast

from cadastros.models import Local, Profissional, Sala
from cadastros.serializers import LocalSerializer, ProfissionalSerializer, SalaSerializer
from rest_framework import serializers

from .models import (
    AgendaGoogle,
    Alocacao,
    EventoCalendar,
    ExecucaoJob,
    PromptHistory,
    Troca,
)


class ValidationIssue:
    """Representa uma issue de validação com severidade."""

    def __init__(self, severity: str, message: str, field: str | None = None):
        self.severity = severity  # 'ERROR' ou 'WARNING'
        self.message = message
        self.field = field


class AlocacaoSerializer(serializers.ModelSerializer):
    """Serializer para Alocacao com validações e severidades."""

    profissional_detail = ProfissionalSerializer(source="profissional", read_only=True)
    local_detail = LocalSerializer(source="local", read_only=True)
    sala_detail = SalaSerializer(source="sala", read_only=True)
    validation_issues = serializers.SerializerMethodField()

    class Meta:
        model = Alocacao
        fields = [
            "id",
            "profissional",
            "profissional_detail",
            "local",
            "local_detail",
            "sala",
            "sala_detail",
            "data",
            "turno",
            "origem",
            "status",
            "inseguranca",
            "metadata",
            "observacoes",
            "validation_issues",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "validation_issues"]

    def get_validation_issues(self, obj: Alocacao) -> list[dict[str, str]]:
        """Retorna issues de validação com severidades."""
        issues = []

        # Verificar conflitos com Google Calendar (ERRO - severidade máxima)
        conflitos_google = self._check_google_conflicts(obj)
        if conflitos_google:
            issues.append(
                {
                    "severity": "ERROR",
                    "message": f"Conflito com Google Calendar: {conflitos_google}",
                    "field": "data",
                }
            )

        # Verificar sobreposição de profissional (ERRO)
        sobreposicao = self._check_professional_overlap(obj)
        if sobreposicao:
            issues.append(
                {
                    "severity": "ERROR",
                    "message": f"Profissional já alocado neste horário: {sobreposicao}",
                    "field": "profissional",
                }
            )

        # Verificar limite de horas semanais (WARNING)
        horas_warning = self._check_weekly_hours(obj)
        if horas_warning:
            issues.append(
                {
                    "severity": "WARNING",
                    "message": horas_warning,
                    "field": "profissional",
                }
            )

        # Verificar limite de dobras (WARNING)
        dobras_warning = self._check_double_shifts(obj)
        if dobras_warning:
            issues.append(
                {
                    "severity": "WARNING",
                    "message": dobras_warning,
                    "field": "turno",
                }
            )

        # Verificar bloqueios não respeitados (WARNING)
        bloqueios_warning = self._check_blocks_and_preferences(obj)
        if bloqueios_warning:
            issues.append(
                {
                    "severity": "WARNING",
                    "message": bloqueios_warning,
                    "field": "profissional",
                }
            )

        return issues

    def _check_google_conflicts(self, alocacao: Alocacao) -> str | None:
        """Verifica conflitos com Google Calendar."""
        # TODO: implementar verificação real com Google Calendar
        # Por enquanto retorna None (será implementado no Sprint 5)
        return None

    def _check_professional_overlap(self, alocacao: Alocacao) -> str | None:
        """Verifica se profissional já está alocado no mesmo turno/data."""
        conflito_qs = Alocacao.objects.filter(
            profissional=alocacao.profissional,
            data=alocacao.data,
            turno=alocacao.turno,
        )
        if alocacao.pk is not None:
            conflito_qs = conflito_qs.exclude(pk=alocacao.pk)
        conflito = conflito_qs.first()

        if conflito:
            return f"{conflito.local.nome}/{conflito.sala.nome}"
        return None

    def _check_weekly_hours(self, alocacao: Alocacao) -> str | None:
        """Verifica se limite de horas semanais será excedido (WARNING)."""
        # Calcular início e fim da semana
        data = alocacao.data
        inicio_semana = data - timedelta(days=data.weekday())
        fim_semana = inicio_semana + timedelta(days=6)

        # Buscar todas as alocações do profissional na semana
        alocacoes_semana = Alocacao.objects.filter(
            profissional=alocacao.profissional,
            data__gte=inicio_semana,
            data__lte=fim_semana,
        )
        if alocacao.pk is not None:
            alocacoes_semana = alocacoes_semana.exclude(pk=alocacao.pk)

        # Calcular horas (assumindo 6h por turno)
        horas_atuais = alocacoes_semana.count() * 6
        horas_com_nova = horas_atuais + 6

        limite = alocacao.profissional.carga_semanal_alvo
        if horas_com_nova > limite:
            return f"Limite de {limite}h/semana será excedido ({horas_com_nova}h total)"

        return None

    def _check_double_shifts(self, alocacao: Alocacao) -> str | None:
        """Verifica se limite de dobras será excedido (WARNING)."""
        # Calcular início e fim da semana
        data = alocacao.data
        inicio_semana = data - timedelta(days=data.weekday())
        fim_semana = inicio_semana + timedelta(days=6)

        # Contar dobras na semana (dias com 2 turnos)
        from django.db.models import Count

        dobras_base_qs = Alocacao.objects.filter(
            profissional=alocacao.profissional,
            data__gte=inicio_semana,
            data__lte=fim_semana,
        )
        if alocacao.pk is not None:
            dobras_base_qs = dobras_base_qs.exclude(pk=alocacao.pk)
        dobras_semana = (
            dobras_base_qs.values("data").annotate(turnos=Count("id")).filter(turnos__gte=2).count()
        )

        # Verificar se esta alocação criará uma dobra
        turnos_dia_qs = Alocacao.objects.filter(
            profissional=alocacao.profissional,
            data=alocacao.data,
        )
        if alocacao.pk is not None:
            turnos_dia_qs = turnos_dia_qs.exclude(pk=alocacao.pk)
        turnos_no_dia = turnos_dia_qs.count()

        if turnos_no_dia >= 1:
            dobras_semana += 1

        limite = alocacao.profissional.limite_dobras_semana
        if dobras_semana > limite:
            return f"Limite de {limite} dobras/semana será excedido ({dobras_semana} total)"

        return None

    def _check_blocks_and_preferences(self, alocacao: Alocacao) -> str | None:
        """Verifica bloqueios e preferências não respeitados (WARNING)."""
        prof = alocacao.profissional

        # Verificar indisponibilidades (bloqueios hard)
        for indisp in prof.indisponibilidades:
            if (
                indisp.get("dia_semana") == alocacao.data.weekday()
                and indisp.get("turno") == alocacao.turno
            ):
                return (
                    "Profissional indisponível neste dia/turno. "
                    "Premissa mais forte mantida para cobrir gap."
                )

        # Verificar locais proibidos
        if prof.locais_proibidos.filter(pk=alocacao.local.pk).exists():
            return (
                "Local proibido para este profissional. "
                "Premissa mais forte mantida para cobrir gap."
            )

        # Verificar preferências de turno (soft warning)
        if prof.turno_preferencial and prof.turno_preferencial != alocacao.turno:
            turno_pref = prof.get_turno_preferencial_display()
            return f"Turno diferente da preferência ({turno_pref}). Balanceamento mantido."

        return None

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Validação geral - apenas ERROS bloqueiam o salvamento."""
        instance = self.instance
        profissional = cast(
            Profissional | None, attrs.get("profissional", getattr(instance, "profissional", None))
        )
        local = cast(Local | None, attrs.get("local", getattr(instance, "local", None)))
        sala = cast(Sala | None, attrs.get("sala", getattr(instance, "sala", None)))
        data_value = cast(date | None, attrs.get("data", getattr(instance, "data", None)))
        turno_value = cast(str | None, attrs.get("turno", getattr(instance, "turno", None)))

        if (
            profissional is None
            or local is None
            or sala is None
            or data_value is None
            or turno_value is None
        ):
            return attrs

        temp_alocacao = Alocacao(
            profissional=profissional,
            local=local,
            sala=sala,
            data=data_value,
            turno=turno_value,
        )
        if instance:
            temp_alocacao.pk = instance.pk

        errors = {}

        # ERRO: Sobreposição de profissional/turno
        overlap = self._check_professional_overlap(temp_alocacao)
        if overlap:
            errors["profissional"] = f"Profissional já alocado neste horário em {overlap}"

        # ERRO: Conflitos com Google Calendar
        google_conflict = self._check_google_conflicts(temp_alocacao)
        if google_conflict:
            errors["data"] = f"Conflito com Google Calendar: {google_conflict}"

        # Verificar se sala pertence ao local
        sala = attrs.get("sala", getattr(instance, "sala", None))
        local = attrs.get("local", getattr(instance, "local", None))
        if sala and local and sala.local_id != local.id:
            errors["sala"] = "Sala não pertence ao local selecionado"

        if errors:
            raise serializers.ValidationError(errors)

        return attrs


class ExecucaoJobSerializer(serializers.ModelSerializer):
    """Serializer para ExecucaoJob."""

    class Meta:
        model = ExecucaoJob
        fields = [
            "id",
            "tipo",
            "status",
            "iniciou_em",
            "terminou_em",
            "diff_resumo",
            "log_json",
            "autor",
        ]
        read_only_fields = ["iniciou_em"]


class PromptHistorySerializer(serializers.ModelSerializer):
    """Serializer para PromptHistory."""

    class Meta:
        model = PromptHistory
        fields = [
            "id",
            "prompt_texto",
            "resposta",
            "acao",
            "diff_resumo",
            "publicada",
            "autor",
            "plataforma",
            "log_execucao",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class TrocaSerializer(serializers.ModelSerializer):
    """Serializer para Troca."""

    profissional_origem_detail = ProfissionalSerializer(
        source="profissional_origem", read_only=True
    )
    profissional_destino_detail = ProfissionalSerializer(
        source="profissional_destino", read_only=True
    )
    local_detail = LocalSerializer(source="local", read_only=True)
    sala_detail = SalaSerializer(source="sala", read_only=True)

    class Meta:
        model = Troca
        fields = [
            "id",
            "data",
            "turno",
            "local",
            "local_detail",
            "sala",
            "sala_detail",
            "profissional_origem",
            "profissional_origem_detail",
            "profissional_destino",
            "profissional_destino_detail",
            "motivo",
            "origem",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Validação: profissionais diferentes."""
        origem = attrs.get("profissional_origem")
        destino = attrs.get("profissional_destino")

        if origem and destino and origem.id == destino.id:
            raise serializers.ValidationError(
                "Profissionais de origem e destino devem ser diferentes"
            )

        return attrs


class AgendaGoogleSerializer(serializers.ModelSerializer):
    """Serializer para AgendaGoogle."""

    profissional_detail = ProfissionalSerializer(source="profissional", read_only=True)

    class Meta:
        model = AgendaGoogle
        fields = [
            "id",
            "profissional",
            "profissional_detail",
            "calendar_id",
            "nome",
            "ultima_sync",
            "source_tag",
            "pode_publicar",
            "ativa",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "ultima_sync"]


class EventoCalendarSerializer(serializers.ModelSerializer):
    """Serializer para EventoCalendar."""

    agenda_detail = AgendaGoogleSerializer(source="agenda", read_only=True)
    alocacao_detail = AlocacaoSerializer(source="alocacao", read_only=True)

    class Meta:
        model = EventoCalendar
        fields = [
            "id",
            "agenda",
            "agenda_detail",
            "alocacao",
            "alocacao_detail",
            "google_event_id",
            "titulo",
            "data_inicio",
            "data_fim",
            "status",
            "origem",
            "data_sync",
            "metadata",
        ]
        read_only_fields = ["data_sync"]
