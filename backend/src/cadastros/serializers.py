from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from django.core.validators import validate_email
from django.db import transaction
from rest_framework import serializers

from .models import (
    CapacidadeSala,
    ClassificacaoProfissional,
    DiaSemana,
    Local,
    PremissasGlobais,
    Profissional,
    Sala,
    TurnoChoices,
)


def _normalize_string_list(raw: Any) -> list[str]:
    if not isinstance(raw, Iterable) or isinstance(raw, (str, bytes)):  # noqa: UP038
        return []
    normalized: list[str] = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            normalized.append(item.strip())
    return normalized


class LocalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Local
        fields = [
            "id",
            "nome",
            "endereco",
            "area",
            "observacao",
            "prioridade_cobertura",
            "ativo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_prioridade_cobertura(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Prioridade deve ser pelo menos 1.")
        return value


class SalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sala
        fields = [
            "id",
            "local",
            "nome",
            "ativa",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class CapacidadeSalaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CapacidadeSala
        fields = [
            "id",
            "sala",
            "dia_semana",
            "turno",
            "capacidade",
            "restricoes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
        extra_kwargs = {
            "restricoes": {"required": False, "allow_blank": True},
        }

    def validate_capacidade(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Capacidade deve ser pelo menos 1.")
        return value

    def validate_dia_semana(self, value: int | None) -> int | None:
        if value is None:
            return None
        dias_validos = {choice.value for choice in DiaSemana}
        if value not in dias_validos:
            raise serializers.ValidationError("Dia da semana inválido.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        dia_semana = attrs.get("dia_semana", getattr(self.instance, "dia_semana", None))
        if dia_semana is None:
            raise serializers.ValidationError(
                "Dia da semana é obrigatório para recorrência semanal."
            )
        return attrs


class ProfissionalSerializer(serializers.ModelSerializer):
    locais_preferidos = serializers.PrimaryKeyRelatedField(
        queryset=Local.objects.all(), many=True, required=False, allow_empty=True
    )
    locais_proibidos = serializers.PrimaryKeyRelatedField(
        queryset=Local.objects.all(), many=True, required=False, allow_empty=True
    )

    class Meta:
        model = Profissional
        fields = [
            "id",
            "nome",
            "email",
            "turno_preferencial",
            "google_calendar_id",
            "classificacao",
            "valor_diaria",
            "valor_salario_mensal",
            "valor_vale_transporte",
            "comissao_sabado",
            "cpf",
            "cnpj",
            "celular",
            "banco_nome",
            "banco_agencia",
            "banco_conta",
            "link_contrato",
            "nome_empresarial",
            "endereco_empresa",
            "cnae",
            "inscricao_municipal",
            "data_contrato",
            "indisponibilidades",
            "locais_preferidos",
            "locais_proibidos",
            "carga_semanal_alvo",
            "limite_dobras_semana",
            "tags",
            "restricoes",
            "preferencias",
            "ativo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_email(self, value: str) -> str:
        try:
            validate_email(value)
        except Exception as exc:  # noqa: BLE001
            raise serializers.ValidationError("Email inválido.") from exc
        return value.lower()

    def validate_carga_semanal_alvo(self, value: int) -> int:
        if value > 70:
            raise serializers.ValidationError("Carga semanal alvo deve ser no máximo 70 horas.")
        return value

    def validate_limite_dobras_semana(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Limite de dobras não pode ser negativo.")
        if value > 14:
            raise serializers.ValidationError("Limite de dobras por semana é excessivo.")
        return value

    def validate_indisponibilidades(self, value: Any) -> list[dict[str, Any]]:
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Indisponibilidades devem ser uma lista.")

        normalized: list[dict[str, Any]] = []
        turnos_validos = {choice.value for choice in TurnoChoices}
        dias_validos = {choice.value for choice in DiaSemana}

        for entry in value:
            if not isinstance(entry, Mapping):
                raise serializers.ValidationError("Formato inválido de indisponibilidade.")
            dia_semana = entry.get("dia_semana")
            turno = entry.get("turno")
            if dia_semana not in dias_validos or turno not in turnos_validos:
                raise serializers.ValidationError("Dia/turno inválido em indisponibilidades.")
            normalized.append({"dia_semana": dia_semana, "turno": turno})

        return normalized

    def validate_tags(self, value: Any) -> list[str]:
        return _normalize_string_list(value)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        preferidos = set(attrs.get("locais_preferidos") or [])
        proibidos = set(attrs.get("locais_proibidos") or [])
        if preferidos & proibidos:
            raise serializers.ValidationError(
                "Um local não pode ser ao mesmo tempo preferido e proibido."
            )
        classificacao = attrs.get("classificacao") or getattr(self.instance, "classificacao", "")
        valor_diaria = attrs.get("valor_diaria")
        valor_salario = attrs.get("valor_salario_mensal")
        if valor_diaria and valor_salario:
            raise serializers.ValidationError("Informe apenas diária ou salário, não ambos.")
        if classificacao == ClassificacaoProfissional.ESTAGIARIA:
            if valor_diaria:
                raise serializers.ValidationError("Estagiária não utiliza valor de diária.")
            if valor_salario is None:
                raise serializers.ValidationError("Estagiária deve ter salário mensal.")
            if attrs.get("cnpj"):
                raise serializers.ValidationError("Estagiária não deve informar CNPJ.")
        if classificacao in (
            ClassificacaoProfissional.MEI,
            ClassificacaoProfissional.FREELANCER,
        ):
            if valor_salario:
                raise serializers.ValidationError("MEI/Freelancer usa diária, não salário.")
            if valor_diaria is None:
                raise serializers.ValidationError("Informe o valor da diária.")
        return attrs

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> Profissional:
        preferidos = validated_data.pop("locais_preferidos", [])
        proibidos = validated_data.pop("locais_proibidos", [])
        profissional = Profissional.objects.create(**validated_data)
        if preferidos:
            profissional.locais_preferidos.set(preferidos)
        if proibidos:
            profissional.locais_proibidos.set(proibidos)
        return profissional

    @transaction.atomic
    def update(self, instance: Profissional, validated_data: dict[str, Any]) -> Profissional:
        preferidos = validated_data.pop("locais_preferidos", None)
        proibidos = validated_data.pop("locais_proibidos", None)
        tags = validated_data.pop("tags", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if tags is not None:
            instance.tags = _normalize_string_list(tags)

        instance.save()

        if preferidos is not None:
            instance.locais_preferidos.set(preferidos)
        if proibidos is not None:
            instance.locais_proibidos.set(proibidos)

        return instance


class PremissasGlobaisSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremissasGlobais
        fields = [
            "id",
            "janela_planejamento_semanas",
            "limite_dobras_semana",
            "limite_horas_semana",
            "politica_revezamento",
            "confirmacao_diaria",
            "observacoes",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_janela_planejamento_semanas(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Janela de planejamento deve ser positiva.")
        if value > 12:
            raise serializers.ValidationError("Janela de planejamento não pode exceder 12 semanas.")
        return value

    def validate_limite_horas_semana(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Limite de horas deve ser positivo.")
        if value > 84:
            raise serializers.ValidationError("Limite de horas semanais é alto demais.")
        return value

    def validate_limite_dobras_semana(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Limite de dobras não pode ser negativo.")
        if value > 14:
            raise serializers.ValidationError("Limite de dobras por semana é alto demais.")
        return value

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> PremissasGlobais:
        instance, _ = PremissasGlobais.objects.get_or_create(singleton=True)
        return self.update(instance, validated_data)
