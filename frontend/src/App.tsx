import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import './index.css';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  isStaff: boolean;
  isSuperuser: boolean;
}

type UserPayload = Partial<User> & {
  is_staff?: boolean;
  is_superuser?: boolean;
  roles?: unknown;
  permissions?: unknown;
};

interface AuthState {
  token: string;
  user: User;
}

interface AuthError {
  message: string;
}

interface Credentials {
  username: string;
  password: string;
}

interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

interface ChangeEmailInput {
  email: string;
}

interface ResetToken {
  uid: string;
  token: string;
}

interface Local {
  id: number;
  nome: string;
  area: string;
  endereco: string;
  observacao: string;
  prioridade_cobertura: number;
  ativo: boolean;
}

interface Sala {
  id: number;
  local: number;
  nome: string;
  ativa: boolean;
}

interface CapacidadeSala {
  id: number;
  sala: number;
  dia_semana: number | null;
  turno: string;
  capacidade: number;
  restricoes?: string;
}

interface CapacityGridRow {
  dia_semana: number;
  manha: string;
  tarde: string;
}

interface ProfissionalCadastro {
  id: number;
  nome: string;
  email: string;
  turno_preferencial: string;
  google_calendar_id: string;
  classificacao: string;
  valor_diaria: number | null;
  valor_salario_mensal: number | null;
  valor_vale_transporte: number | null;
  comissao_sabado: number | null;
  cpf: string;
  cnpj: string;
  celular: string;
  banco_nome: string;
  banco_agencia: string;
  banco_conta: string;
  link_contrato: string;
  nome_empresarial: string;
  endereco_empresa: string;
  cnae: string;
  inscricao_municipal: string;
  data_contrato: string | null;
  carga_semanal_alvo: number;
  limite_dobras_semana: number;
  tags: string[];
  locais_preferidos: number[];
  locais_proibidos: number[];
}

interface ProfissionalFormState {
  nome: string;
  email: string;
  turno_preferencial: string;
  classificacao: string;
  valor_diaria: string;
  valor_salario_mensal: string;
  valor_vale_transporte: string;
  comissao_sabado: string;
  cpf: string;
  cnpj: string;
  celular: string;
  banco_nome: string;
  banco_agencia: string;
  banco_conta: string;
  link_contrato: string;
  nome_empresarial: string;
  endereco_empresa: string;
  cnae: string;
  inscricao_municipal: string;
  data_contrato: string;
  carga_semanal_alvo: number;
  limite_dobras_semana: number;
  google_calendar_id: string;
  tags: string;
  locais_preferidos: number[];
  locais_proibidos: number[];
}

interface PremissasGlobais {
  id?: number;
  janela_planejamento_semanas: number;
  limite_dobras_semana: number;
  limite_horas_semana: number;
  politica_revezamento: string;
  confirmacao_diaria: boolean;
  observacoes: string;
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  description?: string;
}

type AuthScreen = 'login' | 'reset-request' | 'reset-confirm';
type Page = 'dashboard' | 'account' | 'profissionais' | 'locais' | 'premissas';
type QuickActionTone = 'primary' | 'secondary' | 'ghost';

interface QuickAction {
  label: string;
  tone: QuickActionTone;
  permission?: string | string[];
}

interface PermissionWidgetProps {
  roles: string[];
  permissions: string[];
  isStaff: boolean;
  isSuperuser: boolean;
}

function readCsrfToken(): string | null {
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('csrftoken='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

async function ensureCsrf(): Promise<string> {
  const existing = readCsrfToken();
  if (existing) return existing;
  await fetch('/api/auth/csrf/', { credentials: 'include' });
  const token = readCsrfToken();
  if (!token) {
    throw new Error('Não foi possível obter o CSRF token.');
  }
  return token;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function getSalaLabel(sala: Sala, locaisById: Record<number, Local>): string {
  const local = locaisById[sala.local];
  return `${local ? `${local.nome} - ` : ''}${sala.nome}`;
}

async function apiJson<T>(
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

async function requestPasswordReset(email: string): Promise<string> {
  const csrf = await ensureCsrf();
  const response = await fetch('/api/auth/password/reset/', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({ email }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const detail = typeof data.detail === 'string' ? data.detail : null;

  if (!response.ok) {
    throw new Error(detail ?? 'Não foi possível enviar a solicitação agora.');
  }

  return (
    detail ??
    'Se o email existir, enviaremos instruções para redefinir a senha.'
  );
}

async function confirmPasswordReset(
  input: ResetToken & { newPassword: string },
): Promise<string> {
  const csrf = await ensureCsrf();
  const response = await fetch('/api/auth/password/reset/confirm', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({
      uid: input.uid,
      token: input.token,
      new_password: input.newPassword,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const detail = typeof data.detail === 'string' ? data.detail : null;

  if (!response.ok) {
    throw new Error(detail ?? 'Não foi possível redefinir a senha.');
  }

  return detail ?? 'Senha redefinida com sucesso.';
}

function normalizeUser(
  userPayload: UserPayload | undefined,
  fallbackUsername: string,
): User {
  const roles = toStringArray(userPayload?.roles);
  const permissions = toStringArray(userPayload?.permissions);
  const isStaff = Boolean(userPayload?.isStaff ?? userPayload?.is_staff);
  const isSuperuser = Boolean(
    userPayload?.isSuperuser ?? userPayload?.is_superuser,
  );
  const rawUsername =
    typeof userPayload?.username === 'string' && userPayload.username.trim()
      ? userPayload.username
      : fallbackUsername;
  const username = rawUsername || 'usuario';
  const baseRole = isStaff || isSuperuser ? 'admin' : 'operador';
  const primaryRole = userPayload?.role ?? roles[0] ?? baseRole;

  return {
    id: typeof userPayload?.id === 'number' ? userPayload.id : 0,
    username,
    name: userPayload?.name ?? username,
    email: userPayload?.email ?? '',
    role: primaryRole,
    roles: roles.length ? roles : [primaryRole],
    permissions,
    isStaff,
    isSuperuser,
  };
}

function hasPermission(user: User, required?: string | string[]): boolean {
  if (!required) return true;
  const permissionSet = new Set(user.permissions);
  if (typeof required === 'string') return permissionSet.has(required);
  return required.some((permission) => permissionSet.has(permission));
}

async function fetchMe(): Promise<User> {
  const response = await fetch('/api/auth/me', { credentials: 'include' });

  if (!response.ok) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const userPayload = data.user as UserPayload | undefined;
  if (!userPayload) {
    throw new Error('Resposta do servidor sem usuário.');
  }

  return normalizeUser(userPayload, 'Usuário');
}

const navItems = [
  { label: 'Dashboard', icon: '📊', page: 'dashboard' as Page },
  { label: 'Profissionais', icon: '👥', page: 'profissionais' as Page },
  { label: 'Locais', icon: '🏥', page: 'locais' as Page },
  { label: 'Premissas', icon: '⚙️', page: 'premissas' as Page },
  { label: 'Escalas', icon: '📅' },
  { label: 'Publicação', icon: '☁️' },
  { label: 'Auditoria', icon: '📝' },
  { label: 'Minha conta', icon: '👤', page: 'account' as Page },
];

const metricsCards = [
  {
    title: 'Próximas escalas',
    value: '3 semanas',
    detail: 'Geração automática ativa',
    tone: 'ok',
  },
  {
    title: 'Pendências',
    value: '5 itens',
    detail: 'Aprovar e publicar',
    tone: 'warn',
  },
  {
    title: 'Jobs de sync',
    value: '2/2',
    detail: 'Google Calendar e Redis ok',
    tone: 'ok',
  },
  {
    title: 'Ajustes manuais',
    value: '12',
    detail: 'Revisar Savassi/Lourdes',
    tone: 'info',
  },
];

const highlights = [
  'Login vinculado ao usuário do sistema.',
  '/auth/me retorna role e permissões para o layout.',
  'Troca de senha em Minha conta (placeholder).',
  'Permissões e publicação ficam disponíveis após autenticação.',
];

const quickActions: QuickAction[] = [
  {
    label: 'Criar escala',
    tone: 'primary',
    permission: ['schedules.add_schedule', 'escala.add_escala'],
  },
  {
    label: 'Importar calendário',
    tone: 'secondary',
    permission: 'integrations.import_calendar',
  },
  { label: 'Ver inconsistências', tone: 'ghost' },
];

const diasSemana = [
  { label: 'Seg', value: 0 },
  { label: 'Ter', value: 1 },
  { label: 'Qua', value: 2 },
  { label: 'Qui', value: 3 },
  { label: 'Sex', value: 4 },
  { label: 'Sáb', value: 5 },
  { label: 'Dom', value: 6 },
];

const classificacoes = [
  { value: 'estagiaria', label: 'Estagiária', badgeClass: 'badge-estagiaria' },
  { value: 'mei', label: 'MEI', badgeClass: 'badge-mei' },
  { value: 'freelancer', label: 'Freelancer', badgeClass: 'badge-freelancer' },
];

function Modal({ open, title, onClose, children, description }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className='modal-backdrop'
      role='dialog'
      aria-modal='true'
      aria-label={title}
    >
      <div className='modal-card'>
        <div className='modal-header'>
          <div>
            <p className='eyebrow'>Cadastro</p>
            <h3>{title}</h3>
            {description ? <p className='muted'>{description}</p> : null}
          </div>
          <button
            className='ghost-button'
            type='button'
            onClick={onClose}
            aria-label='Fechar'
          >
            ✕
          </button>
        </div>
        <div className='modal-body'>{children}</div>
      </div>
    </div>
  );
}

function PermissionsWidget({
  roles,
  permissions,
  isStaff,
  isSuperuser,
}: PermissionWidgetProps) {
  const [query, setQuery] = useState('');
  const normalizedRoles = roles.length ? roles : ['operador'];
  const normalizedPermissions = useMemo(
    () => Array.from(new Set(permissions)).sort((a, b) => a.localeCompare(b)),
    [permissions],
  );
  const filteredPermissions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return normalizedPermissions;
    return normalizedPermissions.filter((permission) =>
      permission.toLowerCase().includes(term),
    );
  }, [normalizedPermissions, query]);

  const badges = [
    isSuperuser ? 'Superusuário' : null,
    isStaff && !isSuperuser ? 'Staff' : null,
  ].filter(Boolean) as string[];

  const resultsLabel = `Exibindo ${filteredPermissions.length} de ${normalizedPermissions.length} permissões`;

  return (
    <div
      className='permissions-widget'
      aria-label='Roles e permissões da sessão'
    >
      <div className='permission-header'>
        <div>
          <p className='eyebrow'>Roles e permissões</p>
          <h3>Explorador de acesso</h3>
          <p className='muted'>
            Pesquise e valide o que o usuário pode fazer na interface.
          </p>
        </div>
        <div className='permission-counts'>
          <span className='pill pill-soft'>{normalizedRoles.length} roles</span>
          <span className='pill'>
            {normalizedPermissions.length} permissões
          </span>
        </div>
      </div>

      <div className='permission-meta'>
        <div className='chip-row'>
          {normalizedRoles.map((roleItem) => (
            <span key={roleItem} className='pill pill-soft'>
              {roleItem}
            </span>
          ))}
          {badges.map((badge) => (
            <span key={badge} className='pill'>
              {badge}
            </span>
          ))}
        </div>
        <div className='permission-search'>
          <label className='field-label' htmlFor='permission-search'>
            <span>Pesquisar permissão</span>
            <small className='muted'>{resultsLabel}</small>
          </label>
          <div className='search-input'>
            <span aria-hidden>🔎</span>
            <input
              id='permission-search'
              type='search'
              placeholder='Ex.: schedules.add_schedule'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredPermissions.length ? (
        <div className='permission-list' role='list'>
          {filteredPermissions.map((permission) => (
            <span key={permission} className='permission-item' role='listitem'>
              {permission}
            </span>
          ))}
        </div>
      ) : (
        <p className='muted permission-empty'>
          {query
            ? 'Nenhuma permissão encontrada para este filtro.'
            : 'Nenhuma permissão informada.'}
        </p>
      )}
    </div>
  );
}

const passwordRules = [
  'Mínimo de 8 caracteres.',
  'Use pelo menos uma letra maiúscula e uma minúscula.',
  'Inclua número ou símbolo para reforçar a segurança.',
];

async function authenticate(credentials: Credentials): Promise<AuthState> {
  const csrf = await ensureCsrf();
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify(credentials),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : null;
    if (response.status === 429) {
      throw new Error(
        detail ??
          'Muitas tentativas de login. Aguarde um minuto e tente novamente.',
      );
    }
    throw new Error(
      detail ?? 'Usuário ou senha inválidos ou serviço indisponível.',
    );
  }
  const userPayload = data.user as UserPayload | undefined;
  const user = normalizeUser(userPayload, credentials.username);

  return { token: 'session', user };
}

async function changePassword(input: ChangePasswordInput): Promise<void> {
  const csrf = await ensureCsrf();
  const response = await fetch('/api/auth/password/change', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({
      old_password: input.oldPassword,
      new_password: input.newPassword,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const detail = typeof data.detail === 'string' ? data.detail : null;
    if (response.status === 403) {
      throw new Error(
        detail ?? 'Sessão expirada ou CSRF inválido. Faça login novamente.',
      );
    }
    throw new Error(detail ?? 'Não foi possível trocar a senha.');
  }
}

async function changeEmail(input: ChangeEmailInput): Promise<User> {
  const csrf = await ensureCsrf();
  const response = await fetch('/api/auth/email/change', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({ email: input.email }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const detail = typeof data.detail === 'string' ? data.detail : null;
  const userPayload = data.user as UserPayload | undefined;

  if (!response.ok) {
    throw new Error(detail ?? 'Não foi possível atualizar o email.');
  }
  if (!userPayload) {
    throw new Error('Resposta do servidor sem usuário.');
  }

  return normalizeUser(userPayload, input.email);
}

async function fetchLocais(): Promise<Local[]> {
  return apiJson<Local[]>('/api/cadastros/locais/', undefined, {
    expectArray: true,
  });
}

async function createLocal(payload: Partial<Local>): Promise<Local> {
  const csrf = await ensureCsrf();
  return apiJson<Local>('/api/cadastros/locais/', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function updateLocal(
  id: number,
  payload: Partial<Local>,
): Promise<Local> {
  const csrf = await ensureCsrf();
  return apiJson<Local>(`/api/cadastros/locais/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function fetchSalas(): Promise<Sala[]> {
  return apiJson<Sala[]>('/api/cadastros/salas/', undefined, {
    expectArray: true,
  });
}

async function createSala(payload: Partial<Sala>): Promise<Sala> {
  const csrf = await ensureCsrf();
  return apiJson<Sala>('/api/cadastros/salas/', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function updateSala(id: number, payload: Partial<Sala>): Promise<Sala> {
  const csrf = await ensureCsrf();
  return apiJson<Sala>(`/api/cadastros/salas/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function deleteSala(id: number): Promise<void> {
  const csrf = await ensureCsrf();
  await apiJson(`/api/cadastros/salas/${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': csrf },
  });
}

async function createCapacidadeSala(
  payload: Partial<CapacidadeSala>,
): Promise<CapacidadeSala> {
  const csrf = await ensureCsrf();
  const normalized = {
    restricoes: '',
    ...payload,
  };
  return apiJson<CapacidadeSala>('/api/cadastros/capacidade-salas/', {
    method: 'POST',
    body: JSON.stringify(normalized),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function updateCapacidadeSala(
  id: number,
  payload: Partial<CapacidadeSala>,
): Promise<CapacidadeSala> {
  const csrf = await ensureCsrf();
  const normalized = {
    restricoes: '',
    ...payload,
  };
  return apiJson<CapacidadeSala>(`/api/cadastros/capacidade-salas/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(normalized),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function deleteCapacidadeSala(id: number): Promise<void> {
  const csrf = await ensureCsrf();
  await apiJson(`/api/cadastros/capacidade-salas/${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': csrf },
  });
}

async function deleteLocal(id: number): Promise<void> {
  const csrf = await ensureCsrf();
  await apiJson(`/api/cadastros/locais/${id}/`, {
    method: 'DELETE',
    headers: { 'X-CSRFToken': csrf },
  });
}

async function fetchCapacidades(): Promise<CapacidadeSala[]> {
  const data = await apiJson<CapacidadeSala[]>(
    '/api/cadastros/capacidade-salas/',
    undefined,
    {
      expectArray: true,
    },
  );
  return data.map((item) => ({
    ...item,
    restricoes: item.restricoes ?? '',
    dia_semana: item.dia_semana ?? null,
  }));
}

async function fetchProfissionais(): Promise<ProfissionalCadastro[]> {
  return apiJson<ProfissionalCadastro[]>(
    '/api/cadastros/profissionais/',
    undefined,
    {
      expectArray: true,
    },
  );
}

async function createProfissional(
  payload: Partial<ProfissionalCadastro>,
): Promise<ProfissionalCadastro> {
  const csrf = await ensureCsrf();
  const normalized = {
    ...payload,
    tags: payload.tags ?? [],
    locais_preferidos: payload.locais_preferidos ?? [],
    locais_proibidos: payload.locais_proibidos ?? [],
  };
  return apiJson<ProfissionalCadastro>('/api/cadastros/profissionais/', {
    method: 'POST',
    body: JSON.stringify(normalized),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function updateProfissional(
  id: number,
  payload: Partial<ProfissionalCadastro>,
): Promise<ProfissionalCadastro> {
  const csrf = await ensureCsrf();
  const normalized = {
    ...payload,
    tags: payload.tags ?? [],
    locais_preferidos: payload.locais_preferidos ?? [],
    locais_proibidos: payload.locais_proibidos ?? [],
  };
  return apiJson<ProfissionalCadastro>(`/api/cadastros/profissionais/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(normalized),
    headers: { 'X-CSRFToken': csrf },
  });
}

async function fetchPremissas(): Promise<PremissasGlobais | null> {
  const data = await apiJson<PremissasGlobais[]>(
    '/api/cadastros/premissas-globais/',
    undefined,
    {
      expectArray: true,
    },
  );
  return data[0] ?? null;
}

async function upsertPremissas(
  payload: PremissasGlobais,
): Promise<PremissasGlobais> {
  const csrf = await ensureCsrf();
  if (payload.id) {
    return apiJson<PremissasGlobais>(
      `/api/cadastros/premissas-globais/${payload.id}/`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'X-CSRFToken': csrf },
      },
    );
  }
  return apiJson<PremissasGlobais>('/api/cadastros/premissas-globais/', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'X-CSRFToken': csrf },
  });
}

function PasswordRulesHint() {
  const [open, setOpen] = useState(false);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  const toggle = () => setOpen((value) => !value);

  return (
    <div className='tooltip' onMouseLeave={hide}>
      <button
        type='button'
        className='info-button'
        aria-label='Ver regras de senha'
        aria-expanded={open}
        aria-controls='password-rules'
        onMouseEnter={show}
        onFocus={show}
        onBlur={hide}
        onClick={toggle}
      >
        ?
      </button>
      <div
        id='password-rules'
        role='note'
        className={`tooltip-card${open ? ' visible' : ''}`}
        aria-live='polite'
      >
        <p>Regras recomendadas:</p>
        <ul>
          {passwordRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LoginScreen({
  onLogin,
  loading,
  error,
  onForgotPassword,
}: {
  onLogin: (credentials: Credentials) => Promise<void>;
  loading: boolean;
  error: AuthError | null;
  onForgotPassword: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onLogin({ username, password });
  };

  return (
    <div className='login-shell'>
      <div className='login-card'>
        <div className='login-header'>
          <p className='eyebrow'>Agendador · Acesso</p>
          <h1>Entre com suas credenciais</h1>
          <p className='lede'>
            A autenticação usa sessão segura. Em produção, tokens ficam em
            cookie seguro; em dev usamos armazenamento local.
          </p>
        </div>

        <form className='login-form' onSubmit={handleSubmit}>
          <label className='field'>
            <span>Usuário ou email</span>
            <input
              required
              autoComplete='username'
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder='seu.email@exemplo.com'
            />
          </label>

          <label className='field'>
            <span>Senha</span>
            <input
              required
              type='password'
              autoComplete='current-password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder='••••••••'
            />
          </label>

          {error ? <div className='alert'>{error.message}</div> : null}

          <button type='submit' className='primary-button' disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>
          <div className='form-footnote'>
            <button
              type='button'
              className='link-button'
              onClick={onForgotPassword}
            >
              Esqueci a senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordResetRequestScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const detail = await requestPasswordReset(email);
      setSuccess(detail);
      setEmail('');
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Não foi possível enviar a solicitação agora.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='login-shell'>
      <div className='login-card'>
        <div className='login-header'>
          <p className='eyebrow'>Agendador · Recuperar acesso</p>
          <h1>Esqueci a senha</h1>
          <p className='lede'>
            Informe seu email. Se existir em nossa base, enviaremos instruções
            para redefinir a senha.
          </p>
        </div>

        <form className='login-form' onSubmit={handleSubmit}>
          <label className='field'>
            <span>Email</span>
            <input
              required
              type='email'
              autoComplete='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder='seu.email@exemplo.com'
            />
          </label>

          {error ? <div className='alert'>{error}</div> : null}
          {success ? <div className='success'>{success}</div> : null}

          <div className='form-actions'>
            <button type='submit' className='primary-button' disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
            <button type='button' className='ghost-button' onClick={onBack}>
              Voltar ao login
            </button>
          </div>
          <p className='muted small-print'>
            Simulação: o backend registra o pedido no log/console. Ajuste SMTP
            para envio real.
          </p>
        </form>
      </div>
    </div>
  );
}

function PasswordResetConfirmScreen({
  onBack,
  resetToken,
}: {
  onBack: () => void;
  resetToken: ResetToken;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    try {
      const detail = await confirmPasswordReset({
        uid: resetToken.uid,
        token: resetToken.token,
        newPassword,
      });
      setSuccess(detail);
      setRedirecting(true);
      setTimeout(() => {
        onBack();
      }, 1200);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Não foi possível redefinir a senha.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='login-shell'>
      <div className='login-card'>
        <div className='login-header'>
          <p className='eyebrow'>Agendador · Redefinir senha</p>
          <h1>Definir nova senha</h1>
          <p className='lede'>
            Crie uma nova senha para sua conta. O link expira em alguns minutos.
          </p>
        </div>

        <form className='login-form' onSubmit={handleSubmit}>
          <label className='field'>
            <span>Nova senha</span>
            <input
              required
              type='password'
              autoComplete='new-password'
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder='Sua nova senha'
            />
          </label>
          <label className='field'>
            <span>Confirmar nova senha</span>
            <input
              required
              type='password'
              autoComplete='new-password'
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder='Confirme a nova senha'
            />
          </label>

          {error ? <div className='alert'>{error}</div> : null}
          {success ? <div className='success'>{success}</div> : null}
          {redirecting ? (
            <p className='muted'>Redirecionando para o login...</p>
          ) : null}

          <div className='form-actions'>
            <button type='submit' className='primary-button' disabled={loading}>
              {loading ? 'Salvando...' : 'Atualizar senha'}
            </button>
            <button type='button' className='ghost-button' onClick={onBack}>
              Voltar ao login
            </button>
          </div>
          <p className='muted small-print'>
            Se o token estiver inválido ou expirado, peça um novo.
          </p>
        </form>
      </div>
    </div>
  );
}

function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<ProfissionalCadastro[]>(
    [],
  );
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfissionalFormState>({
    nome: '',
    email: '',
    turno_preferencial: '',
    classificacao: 'estagiaria',
    valor_diaria: '',
    valor_salario_mensal: '',
    valor_vale_transporte: '',
    comissao_sabado: '',
    cpf: '',
    cnpj: '',
    celular: '',
    banco_nome: '',
    banco_agencia: '',
    banco_conta: '',
    link_contrato: '',
    nome_empresarial: '',
    endereco_empresa: '',
    cnae: '',
    inscricao_municipal: '',
    data_contrato: '',
    carga_semanal_alvo: 40,
    limite_dobras_semana: 2,
    google_calendar_id: '',
    tags: '',
    locais_preferidos: [] as number[],
    locais_proibidos: [] as number[],
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editing, setEditing] = useState<ProfissionalCadastro | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profissionaisData, locaisData] = await Promise.all([
        fetchProfissionais(),
        fetchLocais(),
      ]);
      setProfissionais(profissionaisData);
      setLocais(locaisData);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao carregar cadastros.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const classificacaoByValue = useMemo(
    () =>
      classificacoes.reduce<
        Record<string, { label: string; badgeClass: string }>
      >((accumulator, item) => {
        accumulator[item.value] = {
          label: item.label,
          badgeClass: item.badgeClass,
        };
        return accumulator;
      }, {}),
    [],
  );
  const isEstagiaria = form.classificacao === 'estagiaria';
  const isMeiOuFreelancer =
    form.classificacao === 'mei' || form.classificacao === 'freelancer';
  const salarioDisabled = isMeiOuFreelancer || Boolean(form.valor_diaria);
  const diariaDisabled = isEstagiaria || Boolean(form.valor_salario_mensal);
  const contratoLink = form.link_contrato?.trim() || '';

  useEffect(() => {
    if (isEstagiaria) {
      setForm((prev) => ({
        ...prev,
        valor_diaria: '',
        cnpj: '',
        nome_empresarial: '',
        endereco_empresa: '',
        cnae: '',
        inscricao_municipal: '',
      }));
    }
    if (isMeiOuFreelancer) {
      setForm((prev) => ({
        ...prev,
        valor_salario_mensal: '',
        valor_vale_transporte: '',
      }));
    }
  }, [isEstagiaria, isMeiOuFreelancer]);

  const handleMultiSelect = (
    options: HTMLCollectionOf<HTMLOptionElement>,
  ): number[] =>
    Array.from(options)
      .filter((option) => option.selected)
      .map((option) => Number(option.value));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const toNumberOrNull = (value: string) => {
        if (value === null || value === undefined) return null;
        const trimmed = value.toString().trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
      };

      const payload: Partial<ProfissionalCadastro> = {
        ...form,
        valor_diaria: toNumberOrNull(form.valor_diaria),
        valor_salario_mensal: toNumberOrNull(form.valor_salario_mensal),
        valor_vale_transporte: toNumberOrNull(form.valor_vale_transporte),
        comissao_sabado: toNumberOrNull(form.comissao_sabado),
        data_contrato: form.data_contrato || null,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      if (editing) {
        const updated = await updateProfissional(editing.id, payload);
        setProfissionais((prev) =>
          prev.map((prof) => (prof.id === updated.id ? updated : prof)),
        );
        setSuccess('Profissional atualizado.');
        setEditing(null);
      } else {
        const created = await createProfissional(payload);
        setProfissionais((prev) => [...prev, created]);
        setSuccess('Profissional cadastrado.');
      }
      setForm({
        nome: '',
        email: '',
        turno_preferencial: '',
        classificacao: 'estagiaria',
        valor_diaria: '',
        valor_salario_mensal: '',
        valor_vale_transporte: '',
        comissao_sabado: '',
        cpf: '',
        cnpj: '',
        celular: '',
        banco_nome: '',
        banco_agencia: '',
        banco_conta: '',
        link_contrato: '',
        nome_empresarial: '',
        endereco_empresa: '',
        cnae: '',
        inscricao_municipal: '',
        data_contrato: '',
        carga_semanal_alvo: 40,
        limite_dobras_semana: 2,
        google_calendar_id: '',
        tags: '',
        locais_preferidos: [],
        locais_proibidos: [],
      });
      setShowModal(false);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao salvar profissional.';
      setError(message);
    }
  };

  return (
    <section className='panel'>
      <div className='panel-header'>
        <div>
          <p className='eyebrow'>Cadastros</p>
          <h2>Profissionais</h2>
          <p className='lede'>
            Tabela com um profissional por linha. Edição virá em ações por
            registro.
          </p>
        </div>
        <div className='panel-actions'>
          <button
            className='primary-button'
            type='button'
            onClick={() => setShowModal(true)}
          >
            + Adicionar
          </button>
          <button
            className='ghost-button small'
            type='button'
            onClick={() => setShowHelp(true)}
          >
            ?
          </button>
        </div>
      </div>
      {error ? <div className='alert'>{error}</div> : null}
      {success ? <div className='success'>{success}</div> : null}
      {loading ? (
        <p className='muted'>Carregando profissionais...</p>
      ) : (
        <div className='table-card'>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Classificação</th>
                <th>Turno pref.</th>
                <th>Carga alvo (h)</th>
                <th>Dobras/semana</th>
                <th>Tags</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {profissionais.map((profissional) => (
                <tr key={profissional.id}>
                  <td>{profissional.nome}</td>
                  <td className='muted'>{profissional.email}</td>
                  <td>
                    {profissional.classificacao ? (
                      <span
                        className={`badge-class ${
                          classificacaoByValue[profissional.classificacao]
                            ?.badgeClass ?? ''
                        }`}
                      >
                        {classificacaoByValue[profissional.classificacao]
                          ?.label ?? 'Outro'}
                      </span>
                    ) : (
                      <span className='muted'>—</span>
                    )}
                  </td>
                  <td>{profissional.turno_preferencial || '—'}</td>
                  <td>{profissional.carga_semanal_alvo}</td>
                  <td>{profissional.limite_dobras_semana}</td>
                  <td>
                    {profissional.tags?.length ? (
                      <div className='chip-row inline-chips'>
                        {profissional.tags.map((tag) => (
                          <span key={tag} className='pill pill-soft'>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className='muted'>—</span>
                    )}
                  </td>
                  <td>
                    <button
                      className='ghost-button small'
                      type='button'
                      onClick={() => {
                        setEditing(profissional);
                        setForm({
                          nome: profissional.nome,
                          email: profissional.email,
                          turno_preferencial: profissional.turno_preferencial,
                          classificacao:
                            profissional.classificacao || 'estagiaria',
                          valor_diaria:
                            profissional.valor_diaria !== null &&
                            profissional.valor_diaria !== undefined
                              ? String(profissional.valor_diaria)
                              : '',
                          valor_salario_mensal:
                            profissional.valor_salario_mensal !== null &&
                            profissional.valor_salario_mensal !== undefined
                              ? String(profissional.valor_salario_mensal)
                              : '',
                          valor_vale_transporte:
                            profissional.valor_vale_transporte !== null &&
                            profissional.valor_vale_transporte !== undefined
                              ? String(profissional.valor_vale_transporte)
                              : '',
                          comissao_sabado:
                            profissional.comissao_sabado !== null &&
                            profissional.comissao_sabado !== undefined
                              ? String(profissional.comissao_sabado)
                              : '',
                          cpf: profissional.cpf || '',
                          cnpj: profissional.cnpj || '',
                          celular: profissional.celular || '',
                          banco_nome: profissional.banco_nome || '',
                          banco_agencia: profissional.banco_agencia || '',
                          banco_conta: profissional.banco_conta || '',
                          link_contrato: profissional.link_contrato || '',
                          nome_empresarial: profissional.nome_empresarial || '',
                          endereco_empresa: profissional.endereco_empresa || '',
                          cnae: profissional.cnae || '',
                          inscricao_municipal:
                            profissional.inscricao_municipal || '',
                          data_contrato: profissional.data_contrato || '',
                          carga_semanal_alvo: profissional.carga_semanal_alvo,
                          limite_dobras_semana:
                            profissional.limite_dobras_semana,
                          google_calendar_id: profissional.google_calendar_id,
                          tags: (profissional.tags || []).join(', '),
                          locais_preferidos:
                            profissional.locais_preferidos || [],
                          locais_proibidos: profissional.locais_proibidos || [],
                        });
                        setShowModal(true);
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {!profissionais.length ? (
                <tr>
                  <td colSpan={8} className='muted'>
                    Nenhum profissional cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title='Como cadastrar profissionais'
        description='Campos essenciais e como serão usados.'
      >
        <ul className='help-list'>
          <li>
            Profissional é a pessoa que atende; nome e email são usados para
            login e notificações.
          </li>
          <li>
            Turno preferencial é opcional; carga alvo até 70h e limite de dobras
            evitam excesso de alocação.
          </li>
          <li>
            Classificação diferencia Estagiária, MEI ou Freelancer para regras
            de alocação e fica visível nos badges da tabela.
          </li>
          <li>
            Diária é usada para MEI/Freelancer; salário e vale transporte são
            para Estagiária. Preencher um zera o outro campo automaticamente.
          </li>
          <li>
            CPF sempre é aceito; CNPJ e dados empresariais só se forem
            MEI/Freelancer.
          </li>
          <li>
            Link do contrato aceita URL do Drive com atalho para visualizar o
            PDF.
          </li>
          <li>
            Tags descrevem perfis (ex.: treinador, júnior, sábado) e ajudam nos
            filtros/heurística.
          </li>
          <li>
            Locais preferidos/proibidos guiam o revezamento; um local não pode
            estar nas duas listas.
          </li>
          <li>
            ID da agenda Google é o calendarId usado para publicar eventos e ler
            conflitos.
          </li>
        </ul>
      </Modal>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        title={editing ? 'Editar profissional' : 'Cadastrar profissional'}
        description='Nome, email, turno preferencial e limites de carga.'
      >
        <form className='account-form' onSubmit={handleSubmit}>
          <div className='two-cols'>
            <label className='field'>
              <span>Nome</span>
              <input
                required
                value={form.nome}
                onChange={(event) =>
                  setForm({ ...form, nome: event.target.value })
                }
                placeholder='Nome completo'
              />
            </label>
            <label className='field'>
              <span>Email</span>
              <input
                required
                type='email'
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder='pessoa@exemplo.com'
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Turno preferencial</span>
              <select
                value={form.turno_preferencial}
                onChange={(event) =>
                  setForm({ ...form, turno_preferencial: event.target.value })
                }
              >
                <option value=''>Sem preferência</option>
                <option value='manha'>Manhã</option>
                <option value='tarde'>Tarde</option>
              </select>
            </label>
            <label className='field'>
              <span>Classificação</span>
              <select
                value={form.classificacao}
                onChange={(event) =>
                  setForm({ ...form, classificacao: event.target.value })
                }
              >
                {classificacoes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Carga semanal alvo (h)</span>
              <input
                type='number'
                min={1}
                max={70}
                value={form.carga_semanal_alvo}
                onChange={(event) =>
                  setForm({
                    ...form,
                    carga_semanal_alvo: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className='field'>
              <span>Limite de dobras/semana</span>
              <input
                type='number'
                min={0}
                max={14}
                value={form.limite_dobras_semana}
                onChange={(event) =>
                  setForm({
                    ...form,
                    limite_dobras_semana: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <label className='field'>
            <span>ID Agenda Google</span>
            <input
              value={form.google_calendar_id}
              onChange={(event) =>
                setForm({ ...form, google_calendar_id: event.target.value })
              }
              placeholder='calendar-id'
            />
          </label>
          <div className='two-cols'>
            <label className='field'>
              <span>Valor da diária (MEI/Freelancer)</span>
              <input
                type='number'
                step='0.01'
                min={0}
                value={form.valor_diaria}
                disabled={diariaDisabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    valor_diaria: event.target.value,
                    valor_salario_mensal: event.target.value
                      ? ''
                      : prev.valor_salario_mensal,
                  }))
                }
                placeholder='0,00'
              />
            </label>
            <label className='field'>
              <span>Salário mensal (Estagiária)</span>
              <input
                type='number'
                step='0.01'
                min={0}
                value={form.valor_salario_mensal}
                disabled={salarioDisabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    valor_salario_mensal: event.target.value,
                    valor_diaria: event.target.value ? '' : prev.valor_diaria,
                  }))
                }
                placeholder='0,00'
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Comissão de sábado</span>
              <input
                type='number'
                step='0.01'
                min={0}
                value={form.comissao_sabado}
                onChange={(event) =>
                  setForm({ ...form, comissao_sabado: event.target.value })
                }
                placeholder='Ex.: 50,00'
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>CPF</span>
              <input
                value={form.cpf}
                onChange={(event) =>
                  setForm({ ...form, cpf: event.target.value })
                }
                placeholder='000.000.000-00'
              />
            </label>
            <label className='field'>
              <span>CNPJ (MEI/Freelancer)</span>
              <input
                value={form.cnpj}
                disabled={!isMeiOuFreelancer}
                onChange={(event) =>
                  setForm({ ...form, cnpj: event.target.value })
                }
                placeholder='00.000.000/0000-00'
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Celular (+55...)</span>
              <input
                type='tel'
                value={form.celular}
                onChange={(event) =>
                  setForm({ ...form, celular: event.target.value })
                }
                placeholder='+5511987654321'
              />
            </label>
            <label className='field'>
              <span>Data do contrato</span>
              <input
                type='date'
                value={form.data_contrato}
                onChange={(event) =>
                  setForm({ ...form, data_contrato: event.target.value })
                }
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Banco</span>
              <input
                value={form.banco_nome}
                onChange={(event) =>
                  setForm({ ...form, banco_nome: event.target.value })
                }
                placeholder='Banco/Instituição'
              />
            </label>
            <div className='two-cols tight-gap'>
              <label className='field'>
                <span>Agência</span>
                <input
                  value={form.banco_agencia}
                  onChange={(event) =>
                    setForm({ ...form, banco_agencia: event.target.value })
                  }
                  placeholder='0000-0'
                />
              </label>
              <label className='field'>
                <span>Conta</span>
                <input
                  value={form.banco_conta}
                  onChange={(event) =>
                    setForm({ ...form, banco_conta: event.target.value })
                  }
                  placeholder='000000-0'
                />
              </label>
            </div>
          </div>
          <label className='field'>
            <span>
              Link para contrato (Drive)
              {contratoLink ? (
                <a
                  className='pill pill-soft inline-pill'
                  href={contratoLink}
                  target='_blank'
                  rel='noreferrer'
                >
                  Ver PDF
                </a>
              ) : null}
            </span>
            <input
              value={form.link_contrato}
              onChange={(event) =>
                setForm({ ...form, link_contrato: event.target.value })
              }
              placeholder='https://drive.google.com/...'
            />
          </label>
          <div className='two-cols'>
            <label className='field'>
              <span>Nome empresarial (MEI/Freelancer)</span>
              <input
                value={form.nome_empresarial}
                disabled={!isMeiOuFreelancer}
                onChange={(event) =>
                  setForm({ ...form, nome_empresarial: event.target.value })
                }
                placeholder='Razão social'
              />
            </label>
            <label className='field'>
              <span>Endereço da empresa (MEI/Freelancer)</span>
              <input
                value={form.endereco_empresa}
                disabled={!isMeiOuFreelancer}
                onChange={(event) =>
                  setForm({ ...form, endereco_empresa: event.target.value })
                }
                placeholder='Rua, número, bairro'
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>CNAE</span>
              <input
                value={form.cnae}
                disabled={!isMeiOuFreelancer}
                onChange={(event) =>
                  setForm({ ...form, cnae: event.target.value })
                }
                placeholder='0000-0/00'
              />
            </label>
            <label className='field'>
              <span>Inscrição Municipal</span>
              <input
                value={form.inscricao_municipal}
                disabled={!isMeiOuFreelancer}
                onChange={(event) =>
                  setForm({ ...form, inscricao_municipal: event.target.value })
                }
                placeholder='Opcional'
              />
            </label>
          </div>
          <label className='field'>
            <span>Vale transporte (estagiária)</span>
            <input
              type='number'
              step='0.01'
              min={0}
              value={form.valor_vale_transporte}
              disabled={!isEstagiaria}
              onChange={(event) =>
                setForm({ ...form, valor_vale_transporte: event.target.value })
              }
              placeholder='0,00'
            />
          </label>
          <label className='field'>
            <span>Tags</span>
            <input
              value={form.tags}
              onChange={(event) =>
                setForm({ ...form, tags: event.target.value })
              }
              placeholder='treinador, júnior, sábado'
            />
          </label>
          <div className='two-cols'>
            <label className='field'>
              <span>Locais preferidos</span>
              <select
                multiple
                value={form.locais_preferidos.map(String)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    locais_preferidos: handleMultiSelect(
                      event.currentTarget.options,
                    ),
                  })
                }
              >
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className='field'>
              <span>Locais proibidos</span>
              <select
                multiple
                value={form.locais_proibidos.map(String)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    locais_proibidos: handleMultiSelect(
                      event.currentTarget.options,
                    ),
                  })
                }
              >
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className='account-actions'>
            <button className='primary-button' type='submit'>
              Salvar profissional
            </button>
            <button
              className='ghost-button'
              type='button'
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function LocaisPage() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [capacidades, setCapacidades] = useState<CapacidadeSala[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localForm, setLocalForm] = useState({
    nome: '',
    area: '',
    endereco: '',
    observacao: '',
    prioridade_cobertura: 1,
  });
  const [salaForm, setSalaForm] = useState({ local: 0, nome: '' });
  const [capTargetSala, setCapTargetSala] = useState<Sala | null>(null);
  const [expandedLocais, setExpandedLocais] = useState<Set<number>>(new Set());
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [showSalaModal, setShowSalaModal] = useState(false);
  const [showCapModal, setShowCapModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [editingSala, setEditingSala] = useState<Sala | null>(null);
  const [capacityGrid, setCapacityGrid] = useState<CapacityGridRow[]>(
    diasSemana.map((dia) => ({ dia_semana: dia.value, manha: '', tarde: '' })),
  );

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [locaisData, salasData, capacidadesData] = await Promise.all([
        fetchLocais(),
        fetchSalas(),
        fetchCapacidades(),
      ]);
      setLocais(locaisData);
      setSalas(salasData);
      setCapacidades(capacidadesData);
      setExpandedLocais(new Set(locaisData.map((item) => item.id)));
      if (locaisData.length) {
        setSalaForm((prev) => ({
          ...prev,
          local: prev.local || locaisData[0].id,
        }));
      }
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao carregar locais.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const capacidadesSemanais = useMemo(() => capacidades, [capacidades]);

  const handleLocalSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (editingLocal) {
        const updated = await updateLocal(editingLocal.id, localForm);
        setLocais((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSuccess('Local atualizado.');
        setEditingLocal(null);
      } else {
        const created = await createLocal(localForm);
        setLocais((prev) => [...prev, created]);
        setExpandedLocais((prev) => {
          const next = new Set(prev);
          next.add(created.id);
          return next;
        });
        setSuccess('Local cadastrado.');
      }
      setLocalForm({
        nome: '',
        area: '',
        endereco: '',
        observacao: '',
        prioridade_cobertura: 1,
      });
      setShowLocalModal(false);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao cadastrar local.';
      setError(message);
    }
  };

  const handleSalaSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!salaForm.local && locais.length) {
      setSalaForm((prev) => ({ ...prev, local: locais[0].id }));
    }
    setError(null);
    setSuccess(null);
    try {
      if (editingSala) {
        const updated = await updateSala(editingSala.id, salaForm);
        setSalas((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        setEditingSala(null);
        setSuccess('Sala atualizada.');
      } else {
        const created = await createSala(salaForm);
        setSalas((prev) => [...prev, created]);
        const defaultCaps = diasSemana
          .filter((dia) => dia.value <= 4)
          .flatMap((dia) => [
            createCapacidadeSala({
              sala: created.id,
              dia_semana: dia.value,
              turno: 'manha',
              capacidade: 1,
            }),
            createCapacidadeSala({
              sala: created.id,
              dia_semana: dia.value,
              turno: 'tarde',
              capacidade: 1,
            }),
          ]);
        await Promise.all(defaultCaps);
        const capacidadesAtualizadas = await fetchCapacidades();
        setCapacidades(capacidadesAtualizadas);
        setSuccess('Sala adicionada com capacidade padrão Seg-Sex.');
      }
      setSalaForm((prev) => ({ ...prev, nome: '' }));
      setShowSalaModal(false);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao cadastrar sala.';
      setError(message);
    }
  };

  const handleCapSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!capTargetSala) {
      setError('Selecione uma sala para registrar capacidade.');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const operations: Promise<unknown>[] = [];
      capacityGrid.forEach((row) => {
        (['manha', 'tarde'] as const).forEach((turno) => {
          const raw = turno === 'manha' ? row.manha : row.tarde;
          const value = Number.parseInt(raw, 10);
          const key = `${row.dia_semana}-${turno}`;
          const existing = capacidadesByKey[key];

          if (Number.isFinite(value) && value > 0) {
            if (existing) {
              operations.push(
                updateCapacidadeSala(existing.id, {
                  ...existing,
                  capacidade: value,
                }),
              );
            } else {
              operations.push(
                createCapacidadeSala({
                  sala: capTargetSala.id,
                  dia_semana: row.dia_semana,
                  turno,
                  capacidade: value,
                }),
              );
            }
          } else if (existing) {
            operations.push(deleteCapacidadeSala(existing.id));
          }
        });
      });

      await Promise.all(operations);
      const capacidadesAtualizadas = await fetchCapacidades();
      setCapacidades(capacidadesAtualizadas);
      setSuccess('Capacidade registrada para a sala selecionada.');
      setShowCapModal(false);
      setCapacityGrid(
        diasSemana.map((dia) => ({
          dia_semana: dia.value,
          manha: '',
          tarde: '',
        })),
      );
      setCapTargetSala(null);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao salvar capacidade.';
      setError(message);
    }
  };

  const salasPorLocal = useMemo(() => {
    const mapping: Record<number, Sala[]> = {};
    salas.forEach((sala) => {
      mapping[sala.local] = mapping[sala.local]
        ? [...mapping[sala.local], sala]
        : [sala];
    });
    return mapping;
  }, [salas]);
  const locaisById = useMemo(() => {
    const mapping: Record<number, Local> = {};
    locais.forEach((local) => {
      mapping[local.id] = local;
    });
    return mapping;
  }, [locais]);
  const selectedSala = capTargetSala;
  const selectedLocal = useMemo(
    () => (selectedSala ? locaisById[selectedSala.local] : null),
    [locaisById, selectedSala],
  );
  const capacidadeSemana = useMemo(
    () =>
      capacityGrid.reduce((total, row) => {
        const manha = Number.parseInt(row.manha, 10);
        const tarde = Number.parseInt(row.tarde, 10);
        const valores = [manha, tarde].filter(
          (value) => Number.isFinite(value) && value > 0,
        );
        return total + valores.reduce((acc, value) => acc + value, 0);
      }, 0),
    [capacityGrid],
  );
  const capacidadeSalvaSemana = useMemo(
    () =>
      capacidadesSemanais
        .filter((item) => item.sala === (capTargetSala?.id ?? 0))
        .reduce((total, item) => total + (item.capacidade || 0), 0),
    [capTargetSala?.id, capacidadesSemanais],
  );
  const capacidadesByKey = useMemo(() => {
    const map: Record<string, CapacidadeSala> = {};
    capacidadesSemanais
      .filter((item) => item.sala === (capTargetSala?.id ?? 0))
      .forEach((item) => {
        const key = `${item.dia_semana}-${item.turno}`;
        map[key] = item;
      });
    return map;
  }, [capTargetSala?.id, capacidadesSemanais]);

  const fillDefaultCapacity = () => {
    setCapacityGrid(
      diasSemana.map((dia) => ({
        dia_semana: dia.value,
        manha: dia.value <= 4 ? '1' : '',
        tarde: dia.value <= 4 ? '1' : '',
      })),
    );
  };

  const clearCapacityGrid = () => {
    setCapacityGrid(
      diasSemana.map((dia) => ({
        dia_semana: dia.value,
        manha: '',
        tarde: '',
      })),
    );
  };

  const resumoGlobal = useMemo(() => {
    const totalPorDia = diasSemana.map((dia) => {
      const capsDia = capacidadesSemanais.filter(
        (cap) => cap.dia_semana === dia.value,
      );
      const manha = capsDia
        .filter((cap) => cap.turno === 'manha')
        .reduce((total, cap) => total + (cap.capacidade || 0), 0);
      const tarde = capsDia
        .filter((cap) => cap.turno === 'tarde')
        .reduce((total, cap) => total + (cap.capacidade || 0), 0);
      return { dia: dia.value, manha, tarde };
    });
    const totalSemanal = totalPorDia.reduce(
      (acc, value) => acc + value.manha + value.tarde,
      0,
    );
    return { totalPorDia, totalSemanal };
  }, [capacidadesSemanais]);

  return (
    <section className='panel'>
      <div className='panel-header'>
        <div>
          <p className='eyebrow'>Cadastros</p>
          <h2>Locais e salas</h2>
          <p className='lede'>
            Tabela de locais. Cadastre locais, salas e capacidades via modais.
          </p>
        </div>
        <div className='panel-actions'>
          <button
            className='primary-button'
            type='button'
            onClick={() => {
              setEditingLocal(null);
              setLocalForm({
                nome: '',
                area: '',
                endereco: '',
                observacao: '',
                prioridade_cobertura: 1,
              });
              setShowLocalModal(true);
            }}
          >
            + Local
          </button>
          <button
            className='ghost-button small'
            type='button'
            onClick={() => setShowHelp(true)}
          >
            ?
          </button>
        </div>
      </div>
      {error ? <div className='alert'>{error}</div> : null}
      {success ? <div className='success'>{success}</div> : null}
      <div className='global-summary'>
        <p className='muted small-print'>Resumo geral (todos os locais)</p>
        <div className='global-summary-row'>
          <div className='dia-summary'>
            {diasSemana.map((dia, index) => (
              <span
                key={`global-${dia.value}`}
                className='day-chip day-chip--global'
                data-day={dia.value}
              >
                <span
                  className='day-icon day-icon--large'
                  data-day={dia.value}
                />
                <span className='day-label'>{dia.label}</span>
                <span
                  className={`day-badge${
                    resumoGlobal.totalPorDia[index].manha === 0 &&
                    resumoGlobal.totalPorDia[index].tarde === 0
                      ? ' badge-empty'
                      : ''
                  }`}
                >
                  {resumoGlobal.totalPorDia[index].manha}/
                  {resumoGlobal.totalPorDia[index].tarde}
                </span>
              </span>
            ))}
          </div>
          <span className='metric-pill metric-pill--right'>
            <span className='pill-title'>Turnos/semana</span>
            <span className='day-badge'>{resumoGlobal.totalSemanal}</span>
          </span>
        </div>
      </div>
      {loading ? (
        <p className='muted'>Carregando locais...</p>
      ) : (
        <div className='local-list'>
          {locais.map((local) => {
            const salasDoLocal = salasPorLocal[local.id] || [];
            const totalLocal = capacidadesSemanais
              .filter((cap) =>
                salasDoLocal.some((sala) => sala.id === cap.sala),
              )
              .reduce((total, cap) => total + (cap.capacidade || 0), 0);
            return (
              <article key={local.id} className='local-card'>
                <div className='local-head'>
                  <div>
                    <p className='eyebrow'>Local</p>
                    <h3>{local.nome}</h3>
                    <p className='muted small-print'>
                      {local.area || 'Área não informada'} · Prioridade{' '}
                      {local.prioridade_cobertura}
                    </p>
                    <p className='muted small-print'>
                      {local.endereco || 'Endereço não informado'}
                    </p>
                    {local.observacao ? (
                      <p className='muted small-print'>
                        Obs.: {local.observacao}
                      </p>
                    ) : null}
                  </div>
                  <div className='local-total'>
                    <div className='metric-pill'>
                      <span className='pill-title'>Salas</span>
                      <span className='day-badge'>{salasDoLocal.length}</span>
                    </div>
                    <div className='metric-pill'>
                      <span className='pill-title'>Turnos/semana</span>
                      <span className='day-badge'>{totalLocal}</span>
                    </div>
                  </div>
                  <div className='local-actions'>
                    <button
                      className='ghost-button small soft'
                      type='button'
                      onClick={() => {
                        setEditingLocal(local);
                        setLocalForm({
                          nome: local.nome,
                          area: local.area,
                          endereco: local.endereco,
                          observacao: local.observacao,
                          prioridade_cobertura: local.prioridade_cobertura,
                        });
                        setShowLocalModal(true);
                      }}
                    >
                      ✏️ Editar local
                    </button>
                    <button
                      className='ghost-button small danger filled'
                      type='button'
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Remover o local ${local.nome}? As salas vinculadas também serão removidas.`,
                          )
                        ) {
                          try {
                            const salasDoLocalToRemove = salas.filter(
                              (sala) => sala.local === local.id,
                            );
                            await deleteLocal(local.id);
                            setLocais((prev) =>
                              prev.filter((item) => item.id !== local.id),
                            );
                            setSalas((prev) =>
                              prev.filter((sala) => sala.local !== local.id),
                            );
                            setCapacidades((prev) =>
                              prev.filter(
                                (cap) =>
                                  !salasDoLocalToRemove.some(
                                    (sala) => sala.id === cap.sala,
                                  ),
                              ),
                            );
                            setSuccess('Local removido.');
                          } catch (exception) {
                            const message =
                              exception instanceof Error
                                ? exception.message
                                : 'Erro ao remover local.';
                            setError(message);
                          }
                        }
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <div className='local-body'>
                  <div className='sala-list'>
                    <div className='sala-list__header'>
                      <div className='dia-summary local-summary'>
                        {diasSemana.map((dia) => {
                          const totalDiaLocal = capacidadesSemanais
                            .filter(
                              (cap) =>
                                (salasPorLocal[local.id] || []).some(
                                  (sala) => sala.id === cap.sala,
                                ) && cap.dia_semana === dia.value,
                            )
                            .reduce(
                              (total, cap) => total + (cap.capacidade || 0),
                              0,
                            );
                          return (
                            <span
                              key={`local-${local.id}-${dia.value}`}
                              className='day-chip day-chip--local'
                              data-day={dia.value}
                            >
                              <span className='day-dot' data-day={dia.value} />
                              <span className='day-label'>{dia.label}</span>
                              <span
                                className={`day-badge${totalDiaLocal === 0 ? ' badge-empty' : ''}`}
                              >
                                {totalDiaLocal}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                      <div className='sala-list__actions'>
                        <button
                          className='ghost-button small soft'
                          type='button'
                          onClick={() => {
                            const salasDoLocal = salasPorLocal[local.id] || [];
                            const numeros = salasDoLocal
                              .map((sala) =>
                                Number.parseInt(
                                  sala.nome.replace(/\D/g, ''),
                                  10,
                                ),
                              )
                              .filter((n) => Number.isFinite(n));
                            const nextNumber =
                              numeros.length > 0
                                ? Math.max(...numeros) + 1
                                : salasDoLocal.length + 1;
                            setSalaForm({
                              local: local.id,
                              nome: `Sala ${nextNumber}`,
                            });
                            setEditingSala(null);
                            setShowSalaModal(true);
                            setExpandedLocais((prev) =>
                              new Set(prev).add(local.id),
                            );
                          }}
                        >
                          ➕ Adicionar sala
                        </button>
                        {salasDoLocal.length ? (
                          <button
                            className='ghost-button small soft'
                            type='button'
                            onClick={() =>
                              setExpandedLocais((prev) => {
                                const next = new Set(prev);
                                if (next.has(local.id)) {
                                  next.delete(local.id);
                                } else {
                                  next.add(local.id);
                                }
                                return next;
                              })
                            }
                          >
                            {expandedLocais.has(local.id)
                              ? '⬆️ Ocultar salas'
                              : '⬇️ Mostrar salas'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {expandedLocais.has(local.id) && salasDoLocal.length
                      ? salasDoLocal.map((sala) => {
                          const resumoDias = diasSemana.map((dia) => {
                            const totalDia = capacidadesSemanais
                              .filter(
                                (cap) =>
                                  cap.sala === sala.id &&
                                  cap.dia_semana === dia.value,
                              )
                              .reduce(
                                (total, cap) => total + (cap.capacidade || 0),
                                0,
                              );
                            return {
                              label: dia.label,
                              total: totalDia,
                              value: dia.value,
                            };
                          });

                          return (
                            <div key={sala.id} className='sala-item'>
                              <div className='sala-main'>
                                <div>
                                  <strong>
                                    {getSalaLabel(sala, locaisById)}
                                  </strong>
                                  <div className='dia-summary'>
                                    {resumoDias.map((dia) => (
                                      <span
                                        key={`${sala.id}-${dia.value}`}
                                        className={`day-chip day-chip--sala${
                                          dia.total === 0
                                            ? ' day-chip--empty'
                                            : ''
                                        }`}
                                        data-day={dia.value}
                                      >
                                        <span className='day-label'>
                                          {dia.label}
                                        </span>
                                        <span
                                          className={`day-badge${dia.total === 0 ? ' badge-empty' : ''}`}
                                        >
                                          {dia.total}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className='sala-actions'>
                                  <button
                                    className='ghost-button small soft'
                                    type='button'
                                    onClick={() => {
                                      setEditingSala(sala);
                                      setSalaForm({
                                        local: sala.local,
                                        nome: sala.nome,
                                      });
                                      setShowSalaModal(true);
                                    }}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    className='ghost-button small soft'
                                    type='button'
                                    onClick={async () => {
                                      if (
                                        window.confirm(
                                          `Remover a sala ${getSalaLabel(sala, locaisById)}?`,
                                        )
                                      ) {
                                        try {
                                          await deleteSala(sala.id);
                                          setSalas((prev) =>
                                            prev.filter(
                                              (item) => item.id !== sala.id,
                                            ),
                                          );
                                          setCapacidades((prev) =>
                                            prev.filter(
                                              (cap) => cap.sala !== sala.id,
                                            ),
                                          );
                                          setSuccess('Sala removida.');
                                        } catch (exception) {
                                          const message =
                                            exception instanceof Error
                                              ? exception.message
                                              : 'Erro ao remover sala.';
                                          setError(message);
                                        }
                                      }
                                    }}
                                  >
                                    🗑️ Remover
                                  </button>
                                  <button
                                    className='ghost-button small primary-ghost'
                                    type='button'
                                    onClick={() => {
                                      setCapTargetSala(sala);
                                      setShowCapModal(true);
                                      setCapacityGrid(
                                        diasSemana.map((dia) => {
                                          const manhaExistente =
                                            capacidadesSemanais.find(
                                              (cap) =>
                                                cap.sala === sala.id &&
                                                cap.dia_semana === dia.value &&
                                                cap.turno === 'manha',
                                            );
                                          const tardeExistente =
                                            capacidadesSemanais.find(
                                              (cap) =>
                                                cap.sala === sala.id &&
                                                cap.dia_semana === dia.value &&
                                                cap.turno === 'tarde',
                                            );
                                          return {
                                            dia_semana: dia.value,
                                            manha: manhaExistente
                                              ? String(
                                                  manhaExistente.capacidade ??
                                                    '',
                                                )
                                              : '',
                                            tarde: tardeExistente
                                              ? String(
                                                  tardeExistente.capacidade ??
                                                    '',
                                                )
                                              : '',
                                          };
                                        }),
                                      );
                                    }}
                                  >
                                    📊 Semana
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      : null}
                  </div>
                </div>
              </article>
            );
          })}
          {!locais.length ? (
            <p className='muted'>Nenhum local cadastrado.</p>
          ) : null}
        </div>
      )}

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title='Como cadastrar locais e salas'
        description='Passos para montar a infraestrutura de escala.'
      >
        <ul className='help-list'>
          <li>
            Local é a clínica/unidade (ex.: Savassi, Lourdes). Informe
            área/região e prioridade.
          </li>
          <li>
            Sala é um espaço físico dentro do local; cada sala recebe uma
            profissional por turno.
          </li>
          <li>
            Capacidade por dia/turno define quando a sala opera (geralmente 1).
            Marque disponibilidade.
          </li>
          <li>
            Recorrências aqui são apenas semanais; exceções pontuais entram nas
            agendas.
          </li>
          <li>
            Esses cadastros alimentam a geração de escala e a detecção de gaps
            por local/turno.
          </li>
        </ul>
      </Modal>

      <Modal
        open={showLocalModal}
        onClose={() => {
          setShowLocalModal(false);
          setEditingLocal(null);
        }}
        title={editingLocal ? 'Editar local' : 'Cadastrar local'}
        description='Inclua nome, área/região, prioridade de cobertura e observações.'
      >
        <form className='account-form' onSubmit={handleLocalSubmit}>
          <label className='field'>
            <span>Nome</span>
            <input
              required
              value={localForm.nome}
              onChange={(event) =>
                setLocalForm({ ...localForm, nome: event.target.value })
              }
              placeholder='Savassi, Lourdes...'
            />
          </label>
          <div className='two-cols'>
            <label className='field'>
              <span>Área/Região</span>
              <input
                value={localForm.area}
                onChange={(event) =>
                  setLocalForm({ ...localForm, area: event.target.value })
                }
              />
            </label>
            <label className='field'>
              <span>Prioridade de cobertura</span>
              <input
                type='number'
                min={1}
                value={localForm.prioridade_cobertura}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    prioridade_cobertura: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <label className='field'>
            <span>Endereço</span>
            <input
              value={localForm.endereco}
              onChange={(event) =>
                setLocalForm({ ...localForm, endereco: event.target.value })
              }
            />
          </label>
          <label className='field'>
            <span>Observação</span>
            <textarea
              rows={3}
              value={localForm.observacao}
              onChange={(event) =>
                setLocalForm({ ...localForm, observacao: event.target.value })
              }
              placeholder='Notas internas ou restrições específicas deste local.'
            />
          </label>
          <div className='account-actions'>
            <button className='primary-button' type='submit'>
              Salvar local
            </button>
            <button
              className='ghost-button'
              type='button'
              onClick={() => setShowLocalModal(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showSalaModal}
        onClose={() => {
          setShowSalaModal(false);
          setEditingSala(null);
        }}
        title={editingSala ? 'Editar sala' : 'Cadastrar sala'}
        description='Salas novas recebem capacidade padrão (Seg-Sex, manhã e tarde).'
      >
        <form className='account-form' onSubmit={handleSalaSubmit}>
          <div className='two-cols'>
            <label className='field'>
              <span>Local</span>
              <select
                value={salaForm.local}
                onChange={(event) =>
                  setSalaForm({
                    ...salaForm,
                    local: Number(event.target.value),
                  })
                }
              >
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className='field'>
              <span>Nome da sala</span>
              <input
                required
                value={salaForm.nome}
                onChange={(event) =>
                  setSalaForm({ ...salaForm, nome: event.target.value })
                }
                placeholder='Sala 1'
              />
            </label>
          </div>
          <div className='account-actions'>
            <button className='primary-button' type='submit'>
              {editingSala ? 'Salvar sala' : 'Adicionar sala'}
            </button>
            <button
              className='ghost-button'
              type='button'
              onClick={() => {
                setShowSalaModal(false);
                setEditingSala(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showCapModal}
        onClose={() => {
          setShowCapModal(false);
          setCapTargetSala(null);
        }}
        title='Capacidade por dia/turno'
        description='Marque a disponibilidade da sala em cada turno.'
      >
        <form className='account-form' onSubmit={handleCapSubmit}>
          <div className='capacity-headline'>
            <div className='capacity-summary'>
              <p className='muted small-print'>Sala selecionada</p>
              <strong>
                {selectedSala
                  ? getSalaLabel(selectedSala, locaisById)
                  : 'Nenhuma sala'}
              </strong>
              <span className='muted'>
                {selectedLocal
                  ? `${selectedLocal.nome} · ${selectedLocal.area || 'Sem área definida'}`
                  : 'Escolha uma sala para ver o local'}
              </span>
            </div>
            {selectedSala ? (
              <div className='capacity-stats-card'>
                <p className='muted small-print'>Resumo rápido</p>
                <div className='capacity-stats'>
                  <span
                    className={`pill-soft${
                      capacidadeSemana !== capacidadeSalvaSemana
                        ? ' pill-warn'
                        : ''
                    }`}
                  >
                    Preenchido: {capacidadeSemana} turnos
                  </span>
                  <span className='pill-soft'>
                    Salvo: {capacidadeSalvaSemana} turnos
                  </span>
                </div>
              </div>
            ) : (
              <div className='capacity-stats-card muted'>
                Nenhuma sala selecionada.
              </div>
            )}
          </div>
          {selectedSala && capacidadeSemana !== capacidadeSalvaSemana ? (
            <div className='capacity-warning inline'>
              ⚠️ Preenchido diferente do salvo — registre para aplicar.
            </div>
          ) : null}
          {!selectedSala ? (
            <div className='alert'>
              Selecione uma sala a partir da lista de locais.
            </div>
          ) : null}
          <div className='capacity-wrapper'>
            <div className='capacity-legend'>
              <div className='capacity-copy'>
                <span className='muted small-print'>
                  Preencha quantas profissionais cabem por turno. Deixe em
                  branco para ignorar.
                </span>
                <span className='muted small-print'>
                  Dica: use o atalho padrão ou limpe antes de salvar novos
                  valores.
                </span>
              </div>
              <div className='capacity-quick'>
                <button
                  className='ghost-button small soft'
                  type='button'
                  onClick={fillDefaultCapacity}
                  disabled={!selectedSala}
                >
                  🔄 Seg-Sex 1/turno
                </button>
                <button
                  className='ghost-button small'
                  type='button'
                  onClick={clearCapacityGrid}
                  disabled={!selectedSala}
                >
                  🧹 Limpar
                </button>
              </div>
            </div>
            <div className='capacity-grid'>
              <div className='capacity-grid__header'>
                <span>Turno</span>
                {diasSemana.map((dia) => (
                  <span key={dia.value}>{dia.label}</span>
                ))}
              </div>
              {['manha', 'tarde'].map((turno) => (
                <div key={turno} className='capacity-grid__row'>
                  <span className='capacity-grid__day'>
                    {turno === 'manha' ? 'Manhã' : 'Tarde'}
                  </span>
                  {diasSemana.map((dia) => {
                    const index = capacityGrid.findIndex(
                      (row) => row.dia_semana === dia.value,
                    );
                    const currentRow = index >= 0 ? capacityGrid[index] : null;
                    const value =
                      turno === 'manha'
                        ? (currentRow?.manha ?? '')
                        : (currentRow?.tarde ?? '');
                    return (
                      <input
                        key={`${turno}-${dia.value}`}
                        type='number'
                        min={0}
                        value={value}
                        onChange={(event) => {
                          const next = event.target.value;
                          setCapacityGrid((prev) =>
                            prev.map((row) =>
                              row.dia_semana === dia.value
                                ? { ...row, [turno]: next }
                                : row,
                            ),
                          );
                        }}
                        placeholder='0'
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className='account-actions'>
            <button
              className='primary-button'
              type='submit'
              disabled={!selectedSala}
            >
              Registrar capacidade
            </button>
            <button
              className='ghost-button'
              type='button'
              onClick={() => setShowCapModal(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function PremissasPage() {
  const [premissas, setPremissas] = useState<PremissasGlobais | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPremissas();
      setPremissas(
        data ?? {
          janela_planejamento_semanas: 4,
          limite_dobras_semana: 2,
          limite_horas_semana: 70,
          politica_revezamento: '',
          confirmacao_diaria: true,
          observacoes: '',
        },
      );
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao carregar premissas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!premissas) return;
    setError(null);
    setSuccess(null);
    try {
      const saved = await upsertPremissas(premissas);
      setPremissas(saved);
      setSuccess('Premissas atualizadas.');
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao salvar premissas.';
      setError(message);
    }
  };

  if (loading) {
    return (
      <section className='panel'>
        <p className='eyebrow'>Premissas globais</p>
        <p className='muted'>Carregando...</p>
      </section>
    );
  }

  if (!premissas) {
    return (
      <section className='panel'>
        <p className='eyebrow'>Premissas globais</p>
        <div className='alert'>Não foi possível carregar premissas.</div>
      </section>
    );
  }

  return (
    <section className='panel'>
      <div className='panel-header'>
        <div>
          <p className='eyebrow'>Cadastros</p>
          <h2>Premissas globais</h2>
          <p className='lede'>Janela de planejamento e revezamento padrão.</p>
        </div>
        <div className='panel-actions'>
          <button
            className='ghost-button small'
            type='button'
            onClick={() => setShowHelp(true)}
          >
            ?
          </button>
        </div>
      </div>
      {error ? <div className='alert'>{error}</div> : null}
      {success ? <div className='success'>{success}</div> : null}
      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title='Como preencher premissas'
        description='Parâmetros gerais que guiam a geração.'
      >
        <ul className='help-list'>
          <li>Janela em semanas define o horizonte da escala (default 4).</li>
          <li>
            Limites de horas e dobras por semana protegem contra excesso de
            carga.
          </li>
          <li>
            Política de revezamento documenta as regras de rotação entre locais.
          </li>
          <li>
            Confirmação diária liga a rotina que lê Google Calendar e marca
            conflitos.
          </li>
          <li>
            Use observações para registrar decisões temporárias (ex.: meta de
            60h).
          </li>
        </ul>
      </Modal>
      <form className='account-form' onSubmit={handleSubmit}>
        <div className='two-cols'>
          <label className='field'>
            <span>Janela (semanas)</span>
            <input
              type='number'
              min={1}
              max={12}
              value={premissas.janela_planejamento_semanas}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  janela_planejamento_semanas: Number(event.target.value),
                })
              }
            />
          </label>
          <label className='field'>
            <span>Limite de horas/semana</span>
            <input
              type='number'
              min={1}
              max={84}
              value={premissas.limite_horas_semana}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  limite_horas_semana: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
        <div className='two-cols'>
          <label className='field'>
            <span>Limite de dobras/semana</span>
            <input
              type='number'
              min={0}
              max={14}
              value={premissas.limite_dobras_semana}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  limite_dobras_semana: Number(event.target.value),
                })
              }
            />
          </label>
          <label className='field checkbox-field'>
            <input
              type='checkbox'
              checked={premissas.confirmacao_diaria}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  confirmacao_diaria: event.target.checked,
                })
              }
            />
            <span>Confirmação diária ativa</span>
          </label>
        </div>
        <label className='field'>
          <span>Política de revezamento</span>
          <textarea
            rows={3}
            value={premissas.politica_revezamento}
            onChange={(event) =>
              setPremissas({
                ...premissas,
                politica_revezamento: event.target.value,
              })
            }
          />
        </label>
        <label className='field'>
          <span>Observações</span>
          <textarea
            rows={3}
            value={premissas.observacoes}
            onChange={(event) =>
              setPremissas({ ...premissas, observacoes: event.target.value })
            }
          />
        </label>
        <button className='primary-button' type='submit'>
          Salvar premissas
        </button>
      </form>
    </section>
  );
}

function Dashboard({
  user,
  onLogout,
  onPasswordChange,
  onEmailChange,
  page,
  onNavigate,
}: {
  user: User;
  onLogout: () => void;
  onPasswordChange: (input: ChangePasswordInput) => Promise<void>;
  onEmailChange: (input: ChangeEmailInput) => Promise<User>;
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);
  const userInitial = useMemo(() => {
    const source = user.name || user.email || 'Usuário';
    return source.charAt(0).toUpperCase();
  }, [user.email, user.name]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState(user.email);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  useEffect(() => {
    setEmailInput(user.email);
  }, [user.email]);
  const gatedActions = useMemo(
    () =>
      quickActions.map((action) => ({
        ...action,
        allowed:
          hasPermission(user, action.permission) ||
          user.isSuperuser ||
          user.isStaff,
      })),
    [user],
  );

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não conferem.');
      return;
    }
    setPasswordLoading(true);
    try {
      await onPasswordChange({ oldPassword, newPassword });
      setPasswordSuccess('Senha atualizada com sucesso.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao trocar a senha.';
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    setEmailLoading(true);
    try {
      const updatedUser = await onEmailChange({ email: emailInput });
      setEmailSuccess('Email atualizado com sucesso.');
      setEmailInput(updatedUser.email);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Não foi possível atualizar o email.';
      setEmailError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className='app-shell'>
      <aside className='sidebar'>
        <div className='brand'>
          <span className='brand-mark'>Ag</span>
          <div>
            <strong>Agendador</strong>
            <small>Escalas clínicas</small>
          </div>
        </div>
        <nav className='nav'>
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item${item.page === page ? ' active' : ''}`}
              onClick={() => (item.page ? onNavigate(item.page) : undefined)}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className='sidebar-footer'>
          <p className='sidebar-user'>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </p>
          <button className='ghost-button' onClick={onLogout}>
            Sair
          </button>
        </div>
      </aside>

      <main className='main'>
        {page === 'dashboard' ? (
          <>
            <header className='topbar'>
              <div>
                <p className='eyebrow'>Dashboard</p>
                <h1>
                  {greeting}, {user.name}
                </h1>
                <p className='lede'>
                  Estado da escala, pendências e atalhos para publicar ou
                  revisar. Animações virão na próxima iteração.
                </p>
              </div>
              <div className='topbar-actions'>
                {gatedActions.map((action) => (
                  <button
                    key={action.label}
                    className={`pill action-${action.tone}`}
                    disabled={!action.allowed}
                    aria-disabled={!action.allowed}
                    title={
                      action.allowed
                        ? undefined
                        : 'Bloqueado para este usuário (controle via permissão/role).'
                    }
                  >
                    {action.label}
                    {!action.allowed ? ' · Bloqueado' : ''}
                  </button>
                ))}
              </div>
              <p className='muted'>
                Ações ficam liberadas conforme permissões retornadas pelo
                backend (/auth/me).
              </p>
            </header>

            <section className='cards-grid'>
              {metricsCards.map((card) => (
                <article
                  key={card.title}
                  className='card'
                  data-tone={card.tone}
                >
                  <p className='card-title'>{card.title}</p>
                  <h2>{card.value}</h2>
                  <p className='card-detail'>{card.detail}</p>
                </article>
              ))}
            </section>

            <section className='panel'>
              <div className='panel-header'>
                <h2>Próximos passos</h2>
                <span className='badge'>Autenticação ativa</span>
              </div>
              <ul className='bullet-list'>
                {highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </>
        ) : null}

        {page === 'account' ? (
          <>
            <section className='panel'>
              <div className='panel-header'>
                <div>
                  <p className='eyebrow'>Minha conta</p>
                  <h2>Identidade do usuário</h2>
                  <p className='lede'>Dados da sessão atual.</p>
                </div>
                <span className='badge'>Sessão autenticada</span>
              </div>

              <div className='account-overview'>
                <div className='profile-card'>
                  <div className='avatar' aria-hidden>
                    {userInitial}
                  </div>
                  <div className='profile-text'>
                    <p className='eyebrow'>Usuário</p>
                    <h3>{user.name}</h3>
                    <p className='muted'>
                      {user.email || 'Email não informado'}
                    </p>
                    <div className='chip-row'>
                      <span className='pill pill-soft'>
                        Função: {user.role}
                      </span>
                      <span className='pill pill-ghost'>
                        Autenticação ativa
                      </span>
                    </div>
                  </div>
                </div>

                <dl className='account-details'>
                  <div>
                    <dt>ID</dt>
                    <dd>{user.id}</dd>
                  </div>
                  <div>
                    <dt>Usuário</dt>
                    <dd>{user.username}</dd>
                  </div>
                  <div>
                    <dt>Nome completo</dt>
                    <dd>{user.name}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{user.email || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Perfil de acesso</dt>
                    <dd>{user.role}</dd>
                  </div>
                  <div>
                    <dt>Privilégios</dt>
                    <dd>
                      {user.isSuperuser
                        ? 'Superusuário'
                        : user.isStaff
                          ? 'Staff'
                          : 'Padrão'}
                    </dd>
                  </div>
                </dl>
              </div>

              <PermissionsWidget
                roles={user.roles}
                permissions={user.permissions}
                isStaff={user.isStaff}
                isSuperuser={user.isSuperuser}
              />
            </section>

            <section className='panel'>
              <div className='panel-header'>
                <div>
                  <p className='eyebrow'>Contato</p>
                  <h2>Atualizar email</h2>
                  <p className='lede'>
                    Mantenha seu email de recuperação sempre atualizado.
                  </p>
                </div>
                <span className='badge'>Identidade</span>
              </div>
              <form className='account-form' onSubmit={handleEmailSubmit}>
                <label className='field'>
                  <span>Novo email</span>
                  <input
                    required
                    type='email'
                    autoComplete='email'
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    placeholder='seu.email@exemplo.com'
                  />
                </label>
                {emailError ? <div className='alert'>{emailError}</div> : null}
                {emailSuccess ? (
                  <div className='success'>{emailSuccess}</div>
                ) : null}
                <div className='account-actions'>
                  <button
                    type='submit'
                    className='primary-button'
                    disabled={emailLoading}
                  >
                    {emailLoading ? 'Salvando...' : 'Atualizar email'}
                  </button>
                  <p className='muted small-print'>
                    Se alterado, este email será usado para login e recuperação
                    de senha.
                  </p>
                </div>
              </form>
            </section>

            <section className='panel'>
              <div className='panel-header'>
                <div>
                  <p className='eyebrow'>Segurança</p>
                  <h2>Atualizar senha</h2>
                  <p className='lede'>
                    Mantenha suas credenciais fortes sem sair da sessão.
                  </p>
                </div>
                <span className='badge'>Credenciais</span>
              </div>
              <form className='account-form' onSubmit={handlePasswordSubmit}>
                <label className='field'>
                  <span>Senha atual</span>
                  <input
                    required
                    type='password'
                    autoComplete='current-password'
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                  />
                </label>
                <label className='field'>
                  <div className='field-label'>
                    <span>Nova senha</span>
                    <PasswordRulesHint />
                  </div>
                  <input
                    required
                    type='password'
                    autoComplete='new-password'
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
                <label className='field'>
                  <span>Confirmar nova senha</span>
                  <input
                    required
                    type='password'
                    autoComplete='new-password'
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
                {passwordError ? (
                  <div className='alert'>{passwordError}</div>
                ) : null}
                {passwordSuccess ? (
                  <div className='success'>{passwordSuccess}</div>
                ) : null}
                <div className='account-actions'>
                  <button
                    type='submit'
                    className='primary-button'
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Salvando...' : 'Atualizar senha'}
                  </button>
                  <button
                    type='button'
                    className='ghost-button'
                    onClick={onLogout}
                  >
                    Sair da sessão
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : null}

        {page === 'profissionais' ? <ProfissionaisPage /> : null}
        {page === 'locais' ? <LocaisPage /> : null}
        {page === 'premissas' ? <PremissasPage /> : null}
      </main>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [resetToken, setResetToken] = useState<ResetToken | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const token = params.get('token');
    if (uid && token) {
      setResetToken({ uid, token });
      setAuthScreen('reset-confirm');
    }
    fetchMe()
      .then((user) => setAuth({ token: 'session', user }))
      .catch(() => {
        /* not logged */
      })
      .finally(() => setBooting(false));
  }, []);

  const handleLogin = async (credentials: Credentials) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authenticate(credentials);
      setAuth(result);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Não foi possível autenticar.';
      setError({ message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    ensureCsrf()
      .then((csrf) =>
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-CSRFToken': csrf },
        }),
      )
      .catch(() => {
        /* ignore logout errors */
      })
      .finally(() => {
        setAuth(null);
      });
  };

  const handleEmailChange = async (input: ChangeEmailInput) => {
    const updatedUser = await changeEmail(input);
    setAuth((prev) => (prev ? { ...prev, user: updatedUser } : prev));
    return updatedUser;
  };

  if (booting) {
    return (
      <div className='login-shell'>
        <div className='login-card'>
          <p className='eyebrow'>Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    if (authScreen === 'reset-confirm' && resetToken) {
      return (
        <PasswordResetConfirmScreen
          resetToken={resetToken}
          onBack={() => {
            setAuthScreen('login');
            setResetToken(null);
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname,
            );
          }}
        />
      );
    }
    if (authScreen === 'reset-request') {
      return (
        <PasswordResetRequestScreen onBack={() => setAuthScreen('login')} />
      );
    }
    return (
      <LoginScreen
        onLogin={handleLogin}
        loading={loading}
        error={error}
        onForgotPassword={() => setAuthScreen('reset-request')}
      />
    );
  }

  return (
    <Dashboard
      user={auth.user}
      onLogout={handleLogout}
      onPasswordChange={(input) => changePassword(input)}
      onEmailChange={handleEmailChange}
      page={page}
      onNavigate={setPage}
    />
  );
}
