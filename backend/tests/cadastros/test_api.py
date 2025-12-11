from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient

from cadastros.models import CapacidadeSala, Local, PremissasGlobais, Profissional


@pytest.fixture()
def client() -> APIClient:
    cache.clear()
    user = User.objects.create_user(username="admin", password="secret123")  # noqa: S106
    api_client = APIClient()
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
def test_profissional_blocks_conflicting_locais(client: APIClient) -> None:
    local = Local.objects.create(nome="Savassi", prioridade_cobertura=1)

    response = client.post(
        "/api/cadastros/profissionais/",
        {
            "nome": "Ana",
            "email": "ana@example.com",
            "carga_semanal_alvo": 40,
            "locais_preferidos": [local.id],
            "locais_proibidos": [local.id],
        },
        format="json",
    )

    assert response.status_code == 400
    assert "preferido e proibido" in str(response.data["non_field_errors"][0])
    assert Profissional.objects.count() == 0


@pytest.mark.django_db
def test_profissional_validates_carga_semanal(client: APIClient) -> None:
    response = client.post(
        "/api/cadastros/profissionais/",
        {
            "nome": "Beatriz",
            "email": "bia@example.com",
            "carga_semanal_alvo": 90,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "70 horas" in str(response.data["carga_semanal_alvo"][0])


@pytest.mark.django_db
def test_local_sala_and_capacidade_flow(client: APIClient) -> None:
    local_resp = client.post(
        "/api/cadastros/locais/",
        {"nome": "Lourdes", "prioridade_cobertura": 1, "area": "Centro"},
        format="json",
    )
    assert local_resp.status_code == 201
    local_id = local_resp.data["id"]

    sala_resp = client.post(
        "/api/cadastros/salas/",
        {"local": local_id, "nome": "Sala 1"},
        format="json",
    )
    assert sala_resp.status_code == 201
    sala_id = sala_resp.data["id"]

    cap_resp = client.post(
        "/api/cadastros/capacidade-salas/",
        {
            "sala": sala_id,
            "dia_semana": 0,
            "turno": "manha",
            "capacidade": 1,
        },
        format="json",
    )
    assert cap_resp.status_code == 201
    assert CapacidadeSala.objects.filter(sala_id=sala_id).count() == 1


@pytest.mark.django_db
def test_premissas_globais_singleton(client: APIClient) -> None:
    first = client.post(
        "/api/cadastros/premissas-globais/",
        {"janela_planejamento_semanas": 4, "limite_horas_semana": 70},
        format="json",
    )
    assert first.status_code == 201
    assert PremissasGlobais.objects.count() == 1

    second = client.post(
        "/api/cadastros/premissas-globais/",
        {"janela_planejamento_semanas": 6, "limite_horas_semana": 60},
        format="json",
    )
    assert second.status_code == 201
    assert PremissasGlobais.objects.count() == 1
    premissas = PremissasGlobais.objects.get(singleton=True)
    assert premissas.janela_planejamento_semanas == 6
    assert premissas.limite_horas_semana == 60
