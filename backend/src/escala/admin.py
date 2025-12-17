"""Admin para gestão de escalas."""

from django.contrib import admin

from .models import (
    AgendaGoogle,
    Alocacao,
    EventoCalendar,
    ExecucaoJob,
    PromptHistory,
    Troca,
)


@admin.register(Alocacao)
class AlocacaoAdmin(admin.ModelAdmin):
    """Admin para Alocação."""

    list_display = ["profissional", "local", "sala", "data", "turno", "status", "origem"]
    list_filter = ["status", "origem", "turno", "data", "inseguranca"]
    search_fields = ["profissional__nome", "local__nome", "sala__nome"]
    date_hierarchy = "data"
    ordering = ["-data", "turno"]


@admin.register(ExecucaoJob)
class ExecucaoJobAdmin(admin.ModelAdmin):
    """Admin para Execução de Job."""

    list_display = ["tipo", "status", "iniciou_em", "terminou_em", "autor"]
    list_filter = ["tipo", "status", "iniciou_em"]
    search_fields = ["autor", "diff_resumo"]
    date_hierarchy = "iniciou_em"
    ordering = ["-iniciou_em"]


@admin.register(PromptHistory)
class PromptHistoryAdmin(admin.ModelAdmin):
    """Admin para Histórico de Prompts."""

    list_display = ["acao", "created_at", "autor", "publicada", "plataforma"]
    list_filter = ["acao", "publicada", "plataforma", "created_at"]
    search_fields = ["prompt_texto", "resposta", "autor"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]


@admin.register(Troca)
class TrocaAdmin(admin.ModelAdmin):
    """Admin para Trocas."""

    list_display = [
        "data",
        "turno",
        "profissional_origem",
        "profissional_destino",
        "local",
        "status",
        "origem",
    ]
    list_filter = ["status", "origem", "data"]
    search_fields = [
        "profissional_origem__nome",
        "profissional_destino__nome",
        "motivo",
    ]
    date_hierarchy = "data"
    ordering = ["-data"]


@admin.register(AgendaGoogle)
class AgendaGoogleAdmin(admin.ModelAdmin):
    """Admin para Agendas Google."""

    list_display = ["nome", "profissional", "calendar_id", "ultima_sync", "pode_publicar", "ativa"]
    list_filter = ["pode_publicar", "ativa", "ultima_sync"]
    search_fields = ["nome", "calendar_id", "profissional__nome"]
    ordering = ["profissional__nome"]


@admin.register(EventoCalendar)
class EventoCalendarAdmin(admin.ModelAdmin):
    """Admin para Eventos do Calendar."""

    list_display = ["titulo", "agenda", "data_inicio", "data_fim", "status", "origem"]
    list_filter = ["status", "origem", "data_inicio"]
    search_fields = ["titulo", "google_event_id", "agenda__nome"]
    date_hierarchy = "data_inicio"
    ordering = ["-data_inicio"]
