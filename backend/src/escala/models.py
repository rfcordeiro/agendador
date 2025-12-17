"""Modelos de dados para gestão de escalas e alocações."""

from __future__ import annotations

from cadastros.models import Local, Profissional, Sala, TurnoChoices
from django.db import models
from django.utils.translation import gettext_lazy as _


class OrigemAlocacao(models.TextChoices):
    """Origem da alocação."""

    SISTEMA = "sistema", _("Sistema (gerado automaticamente)")
    MANUAL = "manual", _("Manual (entrada manual)")
    GOOGLE = "google", _("Google Calendar")


class StatusAlocacao(models.TextChoices):
    """Status da alocação."""

    GERADO = "gerado", _("Gerado")
    REVISADO = "revisado", _("Revisado")
    CONFIRMADO = "confirmado", _("Confirmado")
    AJUSTADO = "ajustado", _("Ajustado manualmente")
    MANUAL = "manual", _("Manual (sábados)")


class NivelInseguranca(models.TextChoices):
    """Nível de insegurança/incerteza da alocação."""

    BAIXA = "baixa", _("Baixa (semana atual)")
    MEDIA = "media", _("Média (próximas 2 semanas)")
    ALTA = "alta", _("Alta (semanas 3-4)")


class Alocacao(models.Model):
    """Alocação de profissional em local/sala/turno."""

    profissional = models.ForeignKey(
        Profissional, on_delete=models.CASCADE, related_name="alocacoes"
    )
    local = models.ForeignKey(Local, on_delete=models.CASCADE, related_name="alocacoes")
    sala = models.ForeignKey(Sala, on_delete=models.CASCADE, related_name="alocacoes")
    data = models.DateField(help_text="Data da alocação")
    turno = models.CharField(max_length=12, choices=TurnoChoices.choices)
    origem = models.CharField(
        max_length=20,
        choices=OrigemAlocacao.choices,
        default=OrigemAlocacao.SISTEMA,
        help_text="Origem da alocação",
    )
    status = models.CharField(
        max_length=20,
        choices=StatusAlocacao.choices,
        default=StatusAlocacao.GERADO,
        help_text="Status da alocação",
    )
    inseguranca = models.CharField(
        max_length=10,
        choices=NivelInseguranca.choices,
        default=NivelInseguranca.BAIXA,
        help_text="Nível de incerteza/insegurança",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Metadados: pesos da heurística, motivo, autor, etc.",
    )
    observacoes = models.TextField(blank=True, help_text="Observações adicionais")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["data", "turno", "local__nome", "sala__nome"]
        constraints = [
            models.UniqueConstraint(
                fields=["sala", "data", "turno"],
                name="unica_alocacao_sala_turno",
            ),
        ]
        indexes = [
            models.Index(fields=["data", "turno"]),
            models.Index(fields=["profissional", "data"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        turno_display = self.get_turno_display()
        return (
            f"{self.profissional.nome} - {self.local.nome}/{self.sala.nome} - "
            f"{self.data} ({turno_display})"
        )


class TipoJob(models.TextChoices):
    """Tipo de job executado."""

    GERACAO_SEMANAL = "geracao_semanal", _("Geração semanal")
    CONFIRMACAO_DIARIA = "confirmacao_diaria", _("Confirmação diária")
    SYNC_GOOGLE = "sync_google", _("Sincronização Google Calendar")
    PUBLICACAO_GOOGLE = "publicacao_google", _("Publicação no Google Calendar")
    REPLANEJAMENTO = "replanejamento", _("Replanejamento via prompt")


class StatusJob(models.TextChoices):
    """Status do job."""

    PENDENTE = "pendente", _("Pendente")
    EXECUTANDO = "executando", _("Executando")
    CONCLUIDO = "concluido", _("Concluído")
    ERRO = "erro", _("Erro")
    CANCELADO = "cancelado", _("Cancelado")


class ExecucaoJob(models.Model):
    """Registro de execução de jobs automáticos."""

    tipo = models.CharField(max_length=30, choices=TipoJob.choices)
    status = models.CharField(max_length=20, choices=StatusJob.choices, default=StatusJob.PENDENTE)
    iniciou_em = models.DateTimeField(auto_now_add=True)
    terminou_em = models.DateTimeField(null=True, blank=True)
    diff_resumo = models.TextField(
        blank=True, help_text="Resumo das mudanças propostas ou aplicadas"
    )
    log_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="Log estruturado: eventos, erros, métricas",
    )
    autor = models.CharField(max_length=100, blank=True, help_text="job/prompt/manual/usuario")

    class Meta:
        ordering = ["-iniciou_em"]
        indexes = [
            models.Index(fields=["-iniciou_em"]),
            models.Index(fields=["tipo", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_tipo_display()} - {self.get_status_display()} ({self.iniciou_em})"


class AcaoPrompt(models.TextChoices):
    """Ação do prompt."""

    GERAR = "gerar", _("Gerar escala")
    AJUSTAR = "ajustar", _("Ajustar escala existente")
    BALANCEAR = "balancear", _("Balancear horas")
    LIMPAR_FUTURO = "limpar_futuro", _("Limpar eventos futuros")
    CUSTOM = "custom", _("Comando customizado")


class PromptHistory(models.Model):
    """Histórico de prompts executados via plataforma agêntica."""

    prompt_texto = models.TextField(help_text="Texto do prompt enviado")
    resposta = models.TextField(blank=True, help_text="Resposta/resultado da execução")
    acao = models.CharField(
        max_length=20,
        choices=AcaoPrompt.choices,
        default=AcaoPrompt.CUSTOM,
        help_text="Tipo de ação do prompt",
    )
    diff_resumo = models.TextField(blank=True, help_text="Resumo das mudanças propostas")
    publicada = models.BooleanField(
        default=False, help_text="Se as mudanças foram aprovadas e publicadas"
    )
    autor = models.CharField(max_length=100, blank=True, help_text="Usuário que executou")
    plataforma = models.CharField(
        max_length=50,
        blank=True,
        help_text="Plataforma agêntica usada: codex, claude-code, opencode",
    )
    log_execucao = models.TextField(blank=True, help_text="Log da execução via SSH")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Histórico de Prompt"
        verbose_name_plural = "Histórico de Prompts"
        indexes = [
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_acao_display()} - {self.created_at} ({self.autor})"


class StatusTroca(models.TextChoices):
    """Status da troca."""

    REGISTRADA = "registrada", _("Registrada")
    APLICADA = "aplicada", _("Aplicada")
    CANCELADA = "cancelada", _("Cancelada")


class Troca(models.Model):
    """Registro de trocas entre profissionais (especialmente sábados)."""

    data = models.DateField(help_text="Data da troca")
    turno = models.CharField(max_length=12, choices=TurnoChoices.choices)
    local = models.ForeignKey(
        Local, on_delete=models.CASCADE, null=True, blank=True, related_name="trocas"
    )
    sala = models.ForeignKey(
        Sala, on_delete=models.CASCADE, null=True, blank=True, related_name="trocas"
    )
    profissional_origem = models.ForeignKey(
        Profissional,
        on_delete=models.CASCADE,
        related_name="trocas_origem",
        help_text="Profissional que estava alocado originalmente",
    )
    profissional_destino = models.ForeignKey(
        Profissional,
        on_delete=models.CASCADE,
        related_name="trocas_destino",
        help_text="Profissional que assumiu a alocação",
    )
    motivo = models.TextField(blank=True, help_text="Motivo da troca")
    origem = models.CharField(
        max_length=50,
        default="whatsapp",
        help_text="Origem da troca: whatsapp, manual, sistema",
    )
    status = models.CharField(
        max_length=20,
        choices=StatusTroca.choices,
        default=StatusTroca.REGISTRADA,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data", "turno"]
        indexes = [
            models.Index(fields=["-data"]),
        ]

    def __str__(self) -> str:
        turno_display = self.get_turno_display()
        return (
            f"Troca {self.data} ({turno_display}): "
            f"{self.profissional_origem.nome} → {self.profissional_destino.nome}"
        )


class AgendaGoogle(models.Model):
    """Configuração de agenda Google Calendar por profissional."""

    profissional = models.ForeignKey(
        Profissional,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="agendas_google",
        help_text="Profissional (null para agenda geral)",
    )
    calendar_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="ID do calendário no Google (email do calendar)",
    )
    nome = models.CharField(max_length=200, help_text='Ex: "[Tetê Araújo] Nome Profissional"')
    ultima_sync = models.DateTimeField(null=True, blank=True, help_text="Última sincronização")
    source_tag = models.CharField(
        max_length=50,
        default="agendador",
        help_text="Tag para identificar eventos criados pelo sistema",
    )
    pode_publicar = models.BooleanField(
        default=True, help_text="Se pode publicar eventos nesta agenda"
    )
    ativa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["profissional__nome"]
        verbose_name = "Agenda Google"
        verbose_name_plural = "Agendas Google"

    def __str__(self) -> str:
        return self.nome


class OrigemEvento(models.TextChoices):
    """Origem do evento."""

    SISTEMA = "sistema", _("Sistema (criado pelo agendador)")
    MANUAL = "manual", _("Manual no Google")
    GOOGLE = "google", _("Externo Google")


class StatusEvento(models.TextChoices):
    """Status do evento no Google Calendar."""

    GRAVADO = "gravado", _("Gravado no Google")
    ATUALIZADO = "atualizado", _("Atualizado")
    CONFLITO = "conflito", _("Conflito detectado")
    DELETADO = "deletado", _("Deletado")


class EventoCalendar(models.Model):
    """Registro de eventos sincronizados com Google Calendar."""

    agenda = models.ForeignKey(AgendaGoogle, on_delete=models.CASCADE, related_name="eventos")
    alocacao = models.ForeignKey(
        Alocacao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos_google",
        help_text="Alocação correspondente (se houver)",
    )
    google_event_id = models.CharField(max_length=255, help_text="ID do evento no Google")
    titulo = models.CharField(max_length=255, blank=True)
    data_inicio = models.DateTimeField()
    data_fim = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=StatusEvento.choices, default=StatusEvento.GRAVADO
    )
    origem = models.CharField(
        max_length=20, choices=OrigemEvento.choices, default=OrigemEvento.SISTEMA
    )
    data_sync = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Dados do evento Google")

    class Meta:
        ordering = ["data_inicio"]
        constraints = [
            models.UniqueConstraint(
                fields=["agenda", "google_event_id"],
                name="unico_evento_google_por_agenda",
            ),
        ]
        indexes = [
            models.Index(fields=["data_inicio"]),
            models.Index(fields=["agenda", "data_inicio"]),
        ]

    def __str__(self) -> str:
        return f"{self.titulo} - {self.agenda.nome} ({self.data_inicio})"
