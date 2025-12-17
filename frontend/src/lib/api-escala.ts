/**
 * Funções de API para escalas e alocações
 */

import { ensureCsrf } from './auth';
import type {
  Alocacao,
  AlocacaoFilters,
  ExecucaoJob,
  PromptHistory,
  Troca,
  AgendaGoogle,
  EventoCalendar,
  Inconsistencia,
  DashboardMetrics,
  GerarEscalaParams,
  SyncResponse,
} from '../types/escala';

const API_BASE = '/api/escala';

//=== Alocações ===

export async function fetchAlocacoes(
  filters?: AlocacaoFilters,
): Promise<Alocacao[]> {
  const params = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(`${key}[]`, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });
  }

  const url = `${API_BASE}/alocacoes/${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar alocações: ${response.statusText}`);
  }

  return response.json();
}

export async function createAlocacao(
  data: Partial<Alocacao>,
): Promise<Alocacao> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/alocacoes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar alocação');
  }

  return response.json();
}

export async function updateAlocacao(
  id: number,
  data: Partial<Alocacao>,
): Promise<Alocacao> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/alocacoes/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao atualizar alocação');
  }

  return response.json();
}

export async function deleteAlocacao(id: number): Promise<void> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/alocacoes/${id}/`, {
    method: 'DELETE',
    headers: {
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro ao deletar alocação');
  }
}

//=== Inconsistências ===

export async function fetchInconsistencias(
  severidade?: 'ERROR' | 'WARNING',
  dataInicio?: string,
  dataFim?: string,
): Promise<Inconsistencia[]> {
  const params = new URLSearchParams();
  if (severidade) params.append('severidade', severidade);
  if (dataInicio) params.append('data_inicio', dataInicio);
  if (dataFim) params.append('data_fim', dataFim);

  const url = `${API_BASE}/alocacoes/inconsistencias/${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar inconsistências');
  }

  return response.json();
}

//=== Estatísticas ===

export async function fetchEstatisticas(
  semanas = 4,
): Promise<DashboardMetrics> {
  const response = await fetch(
    `${API_BASE}/alocacoes/estatisticas/?semanas=${semanas}`,
    {
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Erro ao buscar estatísticas');
  }

  return response.json();
}

//=== Jobs ===

export async function fetchJobs(): Promise<ExecucaoJob[]> {
  const response = await fetch(`${API_BASE}/jobs/`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar jobs');
  }

  return response.json();
}

//=== Prompts ===

export async function fetchPrompts(): Promise<PromptHistory[]> {
  const response = await fetch(`${API_BASE}/prompts/`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar prompts');
  }

  return response.json();
}

export async function submitPrompt(
  data: Partial<PromptHistory>,
): Promise<PromptHistory> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/prompts/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao enviar prompt');
  }

  return response.json();
}

//=== Trocas ===

export async function fetchTrocas(): Promise<Troca[]> {
  const response = await fetch(`${API_BASE}/trocas/`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar trocas');
  }

  return response.json();
}

export async function createTroca(data: Partial<Troca>): Promise<Troca> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/trocas/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao criar troca');
  }

  return response.json();
}

export async function aplicarTroca(
  id: number,
): Promise<{ message: string; alocacao_id: number }> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/trocas/${id}/aplicar/`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao aplicar troca');
  }

  return response.json();
}

//=== Agendas Google ===

export async function fetchAgendasGoogle(): Promise<AgendaGoogle[]> {
  const response = await fetch(`${API_BASE}/agendas-google/`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar agendas Google');
  }

  return response.json();
}

export async function syncAgendaGoogle(id: number): Promise<SyncResponse> {
  const csrf = await ensureCsrf();

  const response = await fetch(
    `${API_BASE}/agendas-google/${id}/sincronizar/`,
    {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrf,
      },
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error('Erro ao sincronizar agenda');
  }

  return response.json();
}

export async function syncAllAgendas(): Promise<SyncResponse[]> {
  const agendas = await fetchAgendasGoogle();
  const results = await Promise.all(
    agendas.filter((a) => a.ativa).map((a) => syncAgendaGoogle(a.id)),
  );
  return results;
}

//=== Eventos Calendar ===

export async function fetchEventosCalendar(): Promise<EventoCalendar[]> {
  const response = await fetch(`${API_BASE}/eventos-calendar/`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar eventos');
  }

  return response.json();
}

//=== Geração e Publicação (placeholders para Sprint 2) ===

export async function gerarEscala(
  params: GerarEscalaParams,
): Promise<{ message: string }> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/gerar/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao gerar escala');
  }

  return response.json();
}

export async function publicarEscala(
  ids: number[],
): Promise<{ message: string }> {
  const csrf = await ensureCsrf();

  const response = await fetch(`${API_BASE}/publicar/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    },
    credentials: 'include',
    body: JSON.stringify({ alocacoes_ids: ids }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao publicar escala');
  }

  return response.json();
}
