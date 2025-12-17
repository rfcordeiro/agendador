"""Configuração da app escala."""

from django.apps import AppConfig


class EscalaConfig(AppConfig):
    """Configuração da app de escalas."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "escala"
    verbose_name = "Gestão de Escalas"
