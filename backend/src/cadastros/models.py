from __future__ import annotations

from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class TurnoChoices(models.TextChoices):
    MANHA = "manha", _("Manhã")
    TARDE = "tarde", _("Tarde")


class ClassificacaoProfissional(models.TextChoices):
    ESTAGIARIA = "estagiaria", _("Estagiária")
    MEI = "mei", _("MEI")
    FREELANCER = "freelancer", _("Freelancer")


class DiaSemana(models.IntegerChoices):
    SEGUNDA = 0, _("Segunda-feira")
    TERCA = 1, _("Terça-feira")
    QUARTA = 2, _("Quarta-feira")
    QUINTA = 3, _("Quinta-feira")
    SEXTA = 4, _("Sexta-feira")
    SABADO = 5, _("Sábado")
    DOMINGO = 6, _("Domingo")


class Local(models.Model):
    nome = models.CharField(max_length=150)
    endereco = models.CharField(max_length=255, blank=True)
    area = models.CharField(max_length=120, blank=True, help_text="Bairro ou região")
    prioridade_cobertura = models.PositiveSmallIntegerField(default=1)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["prioridade_cobertura", "nome"]

    def __str__(self) -> str:
        return self.nome


class Profissional(models.Model):
    nome = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    turno_preferencial = models.CharField(max_length=12, choices=TurnoChoices.choices, blank=True)
    google_calendar_id = models.CharField(max_length=255, blank=True)
    classificacao = models.CharField(
        max_length=20, choices=ClassificacaoProfissional.choices, blank=True, default=""
    )
    valor_diaria = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Diária (MEI/Freelancer)"
    )
    valor_salario_mensal = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Salário (Estagiária)"
    )
    valor_vale_transporte = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Apenas estagiária"
    )
    comissao_sabado = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Comissão sobre sábados"
    )
    cpf = models.CharField(
        max_length=14,
        blank=True,
        validators=[
            RegexValidator(
                r"^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$",
                "CPF deve conter 11 dígitos.",
            )
        ],
    )
    cnpj = models.CharField(
        max_length=18,
        blank=True,
        validators=[
            RegexValidator(
                r"^\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}$",
                "CNPJ deve conter 14 dígitos.",
            )
        ],
    )
    celular = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(r"^\+55\d{10,11}$", "Use o formato +55DDxxxxxxxxx.")],
    )
    banco_nome = models.CharField(max_length=120, blank=True)
    banco_agencia = models.CharField(max_length=20, blank=True)
    banco_conta = models.CharField(max_length=30, blank=True)
    link_contrato = models.URLField(blank=True)
    nome_empresarial = models.CharField(max_length=150, blank=True)
    endereco_empresa = models.CharField(max_length=255, blank=True)
    cnae = models.CharField(max_length=20, blank=True)
    inscricao_municipal = models.CharField(max_length=30, blank=True)
    data_contrato = models.DateField(null=True, blank=True)
    indisponibilidades = models.JSONField(default=list, blank=True)
    locais_preferidos = models.ManyToManyField(
        Local, related_name="profissionais_preferidos", blank=True
    )
    locais_proibidos = models.ManyToManyField(
        Local, related_name="profissionais_proibidos", blank=True
    )
    carga_semanal_alvo = models.PositiveSmallIntegerField(
        default=40, help_text="Horas/semana desejadas (máximo recomendado 70h)."
    )
    limite_dobras_semana = models.PositiveSmallIntegerField(
        default=2, help_text="Máximo de dobras permitidas na semana."
    )
    tags = models.JSONField(default=list, blank=True)
    restricoes = models.TextField(blank=True)
    preferencias = models.TextField(blank=True)
    ativo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Sala(models.Model):
    local = models.ForeignKey(Local, on_delete=models.CASCADE, related_name="salas")
    nome = models.CharField(max_length=120)
    ativa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("local", "nome")
        ordering = ["local__nome", "nome"]

    def __str__(self) -> str:
        return f"{self.local.nome} - {self.nome}"


class CapacidadeSala(models.Model):
    sala = models.ForeignKey(Sala, on_delete=models.CASCADE, related_name="capacidades")
    dia_semana = models.PositiveSmallIntegerField(choices=DiaSemana.choices)
    turno = models.CharField(max_length=12, choices=TurnoChoices.choices)
    capacidade = models.PositiveSmallIntegerField(default=1)
    restricoes = models.TextField(blank=True)
    data_especial = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("sala", "dia_semana", "turno", "data_especial")
        ordering = ["sala__local__nome", "sala__nome", "dia_semana", "turno"]

    def __str__(self) -> str:
        dia = self.get_dia_semana_display()
        turno = self.get_turno_display()
        return f"{self.sala} - {dia} ({turno})"


class PremissasGlobais(models.Model):
    singleton = models.BooleanField(default=True, unique=True, editable=False)
    janela_planejamento_semanas = models.PositiveSmallIntegerField(default=4)
    limite_dobras_semana = models.PositiveSmallIntegerField(default=2)
    limite_horas_semana = models.PositiveSmallIntegerField(default=70)
    politica_revezamento = models.TextField(blank=True)
    confirmacao_diaria = models.BooleanField(default=True)
    observacoes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Premissas globais"
        verbose_name_plural = "Premissas globais"

    def __str__(self) -> str:
        return "Premissas Globais"
