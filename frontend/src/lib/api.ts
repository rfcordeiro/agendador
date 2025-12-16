import {
  ProfissionalCadastro,
  Local,
  Sala,
  CapacidadeSala,
  PremissasGlobais,
} from '../types';

export function readCsrfToken(): string | null {
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('csrftoken='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

export async function ensureCsrf(): Promise<string> {
  const existing = readCsrfToken();
  if (existing) return existing;
  await fetch('/api/auth/csrf/', { credentials: 'include' });
  const token = readCsrfToken();
  if (!token) {
    throw new Error('Não foi possível obter o CSRF token.');
  }
  return token;
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export async function apiJson<T>(
  url: string,
  options: RequestInit = {},
  { expectArray }: { expectArray?: boolean } = {},
): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      headers.set(key, value);
    });
  } else if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') headers.set(key, value);
    });
  }

  const csrf = await ensureCsrf();
  headers.set('X-CSRFToken', csrf);

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = (await response
    .json()
    .catch(() => (expectArray ? [] : {}))) as T;

  if (!response.ok) {
    const payload = data as Record<string, unknown>;
    const messages: string[] = [];
    if (typeof payload?.detail === 'string') messages.push(payload.detail);
    Object.values(payload || {}).forEach((value) => {
      if (typeof value === 'string') {
        messages.push(value);
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') messages.push(item);
        });
      }
    });
    const detail = messages.find(Boolean);
    console.error('API error', { url, status: response.status, payload });
    throw new Error(detail ?? 'Falha ao comunicar com o servidor.');
  }

  return data;
}

// Auth Helpers taken from auth.ts to keep single responsibility not too fragmented if desired,
// but since I used 'lib/auth' in imports, I should check if I should move them there.
// Wait, the previous files imported from '../lib/api' AND '../lib/auth'.
// The error messages showed imports from '../lib/api'.
// So Cadastros functions should go here.

export async function fetchProfissionais(): Promise<ProfissionalCadastro[]> {
  return apiJson<ProfissionalCadastro[]>(
    '/api/cadastros/profissionais/',
    {},
    { expectArray: true },
  );
}

export async function updateProfissional(
  id: number,
  data: Partial<ProfissionalCadastro>,
): Promise<ProfissionalCadastro> {
  return apiJson<ProfissionalCadastro>(`/api/cadastros/profissionais/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function createProfissional(
  data: Partial<ProfissionalCadastro>,
): Promise<ProfissionalCadastro> {
  return apiJson<ProfissionalCadastro>('/api/cadastros/profissionais/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchLocais(): Promise<Local[]> {
  return apiJson<Local[]>('/api/cadastros/locais/', {}, { expectArray: true });
}

export async function createLocal(data: Partial<Local>): Promise<Local> {
  return apiJson<Local>('/api/cadastros/locais/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLocal(
  id: number,
  data: Partial<Local>,
): Promise<Local> {
  return apiJson<Local>(`/api/cadastros/locais/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteLocal(id: number): Promise<void> {
  await fetch(`/api/cadastros/locais/${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': await ensureCsrf() },
  });
}

export async function fetchSalas(): Promise<Sala[]> {
  return apiJson<Sala[]>('/api/cadastros/salas/', {}, { expectArray: true });
}

export async function createSala(data: Partial<Sala>): Promise<Sala> {
  return apiJson<Sala>('/api/cadastros/salas/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSala(
  id: number,
  data: Partial<Sala>,
): Promise<Sala> {
  return apiJson<Sala>(`/api/cadastros/salas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSala(id: number): Promise<void> {
  await fetch(`/api/cadastros/salas/${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': await ensureCsrf() },
  });
}

export async function fetchCapacidades(): Promise<CapacidadeSala[]> {
  return apiJson<CapacidadeSala[]>(
    '/api/cadastros/capacidade-salas/',
    {},
    { expectArray: true },
  );
}

export async function createCapacidadeSala(
  data: Partial<CapacidadeSala>,
): Promise<CapacidadeSala> {
  return apiJson<CapacidadeSala>('/api/cadastros/capacidade-salas/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCapacidadeSala(
  id: number,
  data: Partial<CapacidadeSala>,
): Promise<CapacidadeSala> {
  return apiJson<CapacidadeSala>(`/api/cadastros/capacidade-salas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCapacidadeSala(id: number): Promise<void> {
  await fetch(`/api/cadastros/capacidade-salas/${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': await ensureCsrf() },
  });
}

export async function fetchPremissas(): Promise<PremissasGlobais | null> {
  const list = await apiJson<PremissasGlobais[]>(
    '/api/cadastros/premissas-globais/',
    {},
    { expectArray: true },
  );
  return list[0] ?? null;
}

export async function upsertPremissas(
  data: Partial<PremissasGlobais>,
): Promise<PremissasGlobais> {
  if (data.id) {
    return apiJson<PremissasGlobais>(
      `/api/cadastros/premissas-globais/${data.id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }
  return apiJson<PremissasGlobais>('/api/cadastros/premissas-globais/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
