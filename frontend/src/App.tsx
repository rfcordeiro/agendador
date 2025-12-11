import { FormEvent, useEffect, useMemo, useState } from 'react';
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

type AuthScreen = 'login' | 'reset-request' | 'reset-confirm';
type Page = 'dashboard' | 'account';
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

async function requestPasswordReset(email: string): Promise<string> {
  const csrf = await ensureCsrf();
  const response = await fetch('/api/auth/password/reset/', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({ email }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const detail = typeof data.detail === 'string' ? data.detail : null;

  if (!response.ok) {
    throw new Error(detail ?? 'Não foi possível enviar a solicitação agora.');
  }

  return detail ?? 'Se o email existir, enviaremos instruções para redefinir a senha.';
}

async function confirmPasswordReset(input: ResetToken & { newPassword: string }): Promise<string> {
  const csrf = await ensureCsrf();
  const response = await fetch('/api/auth/password/reset/confirm', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({ uid: input.uid, token: input.token, new_password: input.newPassword }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const detail = typeof data.detail === 'string' ? data.detail : null;

  if (!response.ok) {
    throw new Error(detail ?? 'Não foi possível redefinir a senha.');
  }

  return detail ?? 'Senha redefinida com sucesso.';
}

function normalizeUser(userPayload: UserPayload | undefined, fallbackUsername: string): User {
  const roles = toStringArray(userPayload?.roles);
  const permissions = toStringArray(userPayload?.permissions);
  const isStaff = Boolean(userPayload?.isStaff ?? userPayload?.is_staff);
  const isSuperuser = Boolean(userPayload?.isSuperuser ?? userPayload?.is_superuser);
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

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const userPayload = data.user as UserPayload | undefined;
  if (!userPayload) {
    throw new Error('Resposta do servidor sem usuário.');
  }

  return normalizeUser(userPayload, 'Usuário');
}

const navItems = [
  { label: 'Dashboard', icon: '📊', page: 'dashboard' as Page },
  { label: 'Profissionais', icon: '👥' },
  { label: 'Locais', icon: '🏥' },
  { label: 'Escalas', icon: '📅' },
  { label: 'Publicação', icon: '☁️' },
  { label: 'Auditoria', icon: '📝' },
  { label: 'Minha conta', icon: '👤', page: 'account' as Page },
];

const metricsCards = [
  { title: 'Próximas escalas', value: '3 semanas', detail: 'Geração automática ativa', tone: 'ok' },
  { title: 'Pendências', value: '5 itens', detail: 'Aprovar e publicar', tone: 'warn' },
  {
    title: 'Jobs de sync',
    value: '2/2',
    detail: 'Google Calendar e Redis ok',
    tone: 'ok',
  },
  { title: 'Ajustes manuais', value: '12', detail: 'Revisar Savassi/Lourdes', tone: 'info' },
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
  { label: 'Importar calendário', tone: 'secondary', permission: 'integrations.import_calendar' },
  { label: 'Ver inconsistências', tone: 'ghost' },
];

function PermissionsWidget({ roles, permissions, isStaff, isSuperuser }: PermissionWidgetProps) {
  const [query, setQuery] = useState('');
  const normalizedRoles = roles.length ? roles : ['operador'];
  const normalizedPermissions = useMemo(
    () => Array.from(new Set(permissions)).sort((a, b) => a.localeCompare(b)),
    [permissions],
  );
  const filteredPermissions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return normalizedPermissions;
    return normalizedPermissions.filter((permission) => permission.toLowerCase().includes(term));
  }, [normalizedPermissions, query]);

  const badges = [
    isSuperuser ? 'Superusuário' : null,
    isStaff && !isSuperuser ? 'Staff' : null,
  ].filter(Boolean) as string[];

  const resultsLabel = `Exibindo ${filteredPermissions.length} de ${normalizedPermissions.length} permissões`;

  return (
    <div className="permissions-widget" aria-label="Roles e permissões da sessão">
      <div className="permission-header">
        <div>
          <p className="eyebrow">Roles e permissões</p>
          <h3>Explorador de acesso</h3>
          <p className="muted">Pesquise e valide o que o usuário pode fazer na interface.</p>
        </div>
        <div className="permission-counts">
          <span className="pill pill-soft">{normalizedRoles.length} roles</span>
          <span className="pill">{normalizedPermissions.length} permissões</span>
        </div>
      </div>

      <div className="permission-meta">
        <div className="chip-row">
          {normalizedRoles.map((roleItem) => (
            <span key={roleItem} className="pill pill-soft">
              {roleItem}
            </span>
          ))}
          {badges.map((badge) => (
            <span key={badge} className="pill">
              {badge}
            </span>
          ))}
        </div>
        <div className="permission-search">
          <label className="field-label" htmlFor="permission-search">
            <span>Pesquisar permissão</span>
            <small className="muted">{resultsLabel}</small>
          </label>
          <div className="search-input">
            <span aria-hidden>🔎</span>
            <input
              id="permission-search"
              type="search"
              placeholder="Ex.: schedules.add_schedule"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredPermissions.length ? (
        <div className="permission-list" role="list">
          {filteredPermissions.map((permission) => (
            <span key={permission} className="permission-item" role="listitem">
              {permission}
            </span>
          ))}
        </div>
      ) : (
        <p className="muted permission-empty">
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

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : null;
    if (response.status === 429) {
      throw new Error(detail ?? 'Muitas tentativas de login. Aguarde um minuto e tente novamente.');
    }
    throw new Error(detail ?? 'Usuário ou senha inválidos ou serviço indisponível.');
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
    body: JSON.stringify({ old_password: input.oldPassword, new_password: input.newPassword }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const detail = typeof data.detail === 'string' ? data.detail : null;
    if (response.status === 403) {
      throw new Error(detail ?? 'Sessão expirada ou CSRF inválido. Faça login novamente.');
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

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
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

function PasswordRulesHint() {
  const [open, setOpen] = useState(false);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  const toggle = () => setOpen((value) => !value);

  return (
    <div className="tooltip" onMouseLeave={hide}>
      <button
        type="button"
        className="info-button"
        aria-label="Ver regras de senha"
        aria-expanded={open}
        aria-controls="password-rules"
        onMouseEnter={show}
        onFocus={show}
        onBlur={hide}
        onClick={toggle}
      >
        ?
      </button>
      <div
        id="password-rules"
        role="note"
        className={`tooltip-card${open ? ' visible' : ''}`}
        aria-live="polite"
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
    <div className="login-shell">
      <div className="login-card">
        <div className="login-header">
          <p className="eyebrow">Agendador · Acesso</p>
          <h1>Entre com suas credenciais</h1>
          <p className="lede">
            A autenticação usa sessão segura. Em produção, tokens ficam em cookie seguro; em dev
            usamos armazenamento local.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Usuário ou email</span>
            <input
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="seu.email@exemplo.com"
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error ? <div className="alert">{error.message}</div> : null}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>
          <div className="form-footnote">
            <button type="button" className="link-button" onClick={onForgotPassword}>
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
    <div className="login-shell">
      <div className="login-card">
        <div className="login-header">
          <p className="eyebrow">Agendador · Recuperar acesso</p>
          <h1>Esqueci a senha</h1>
          <p className="lede">
            Informe seu email. Se existir em nossa base, enviaremos instruções para redefinir a
            senha.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu.email@exemplo.com"
            />
          </label>

          {error ? <div className="alert">{error}</div> : null}
          {success ? <div className="success">{success}</div> : null}

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </button>
            <button type="button" className="ghost-button" onClick={onBack}>
              Voltar ao login
            </button>
          </div>
          <p className="muted small-print">
            Simulação: o backend registra o pedido no log/console. Ajuste SMTP para envio real.
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
        exception instanceof Error ? exception.message : 'Não foi possível redefinir a senha.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-header">
          <p className="eyebrow">Agendador · Redefinir senha</p>
          <h1>Definir nova senha</h1>
          <p className="lede">
            Crie uma nova senha para sua conta. O link expira em alguns minutos.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nova senha</span>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Sua nova senha"
            />
          </label>
          <label className="field">
            <span>Confirmar nova senha</span>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirme a nova senha"
            />
          </label>

          {error ? <div className="alert">{error}</div> : null}
          {success ? <div className="success">{success}</div> : null}
          {redirecting ? <p className="muted">Redirecionando para o login...</p> : null}

          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Salvando...' : 'Atualizar senha'}
            </button>
            <button type="button" className="ghost-button" onClick={onBack}>
              Voltar ao login
            </button>
          </div>
          <p className="muted small-print">
            Se o token estiver inválido ou expirado, peça um novo.
          </p>
        </form>
      </div>
    </div>
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
        allowed: hasPermission(user, action.permission) || user.isSuperuser || user.isStaff,
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
      const message = exception instanceof Error ? exception.message : 'Erro ao trocar a senha.';
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
        exception instanceof Error ? exception.message : 'Não foi possível atualizar o email.';
      setEmailError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Ag</span>
          <div>
            <strong>Agendador</strong>
            <small>Escalas clínicas</small>
          </div>
        </div>
        <nav className="nav">
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
        <div className="sidebar-footer">
          <p className="sidebar-user">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </p>
          <button className="ghost-button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="main">
        {page === 'dashboard' ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h1>
                  {greeting}, {user.name}
                </h1>
                <p className="lede">
                  Estado da escala, pendências e atalhos para publicar ou revisar. Animações virão
                  na próxima iteração.
                </p>
              </div>
              <div className="topbar-actions">
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
              <p className="muted">
                Ações ficam liberadas conforme permissões retornadas pelo backend (/auth/me).
              </p>
            </header>

            <section className="cards-grid">
              {metricsCards.map((card) => (
                <article key={card.title} className="card" data-tone={card.tone}>
                  <p className="card-title">{card.title}</p>
                  <h2>{card.value}</h2>
                  <p className="card-detail">{card.detail}</p>
                </article>
              ))}
            </section>

            <section className="panel">
              <div className="panel-header">
                <h2>Próximos passos</h2>
                <span className="badge">Autenticação ativa</span>
              </div>
              <ul className="bullet-list">
                {highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Minha conta</p>
                  <h2>Identidade do usuário</h2>
                  <p className="lede">Dados da sessão atual.</p>
                </div>
                <span className="badge">Sessão autenticada</span>
              </div>

              <div className="account-overview">
                <div className="profile-card">
                  <div className="avatar" aria-hidden>
                    {userInitial}
                  </div>
                  <div className="profile-text">
                    <p className="eyebrow">Usuário</p>
                    <h3>{user.name}</h3>
                    <p className="muted">{user.email || 'Email não informado'}</p>
                    <div className="chip-row">
                      <span className="pill pill-soft">Função: {user.role}</span>
                      <span className="pill pill-ghost">Autenticação ativa</span>
                    </div>
                  </div>
                </div>

                <dl className="account-details">
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
                    <dd>{user.isSuperuser ? 'Superusuário' : user.isStaff ? 'Staff' : 'Padrão'}</dd>
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

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Contato</p>
                  <h2>Atualizar email</h2>
                  <p className="lede">Mantenha seu email de recuperação sempre atualizado.</p>
                </div>
                <span className="badge">Identidade</span>
              </div>
              <form className="account-form" onSubmit={handleEmailSubmit}>
                <label className="field">
                  <span>Novo email</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    placeholder="seu.email@exemplo.com"
                  />
                </label>
                {emailError ? <div className="alert">{emailError}</div> : null}
                {emailSuccess ? <div className="success">{emailSuccess}</div> : null}
                <div className="account-actions">
                  <button type="submit" className="primary-button" disabled={emailLoading}>
                    {emailLoading ? 'Salvando...' : 'Atualizar email'}
                  </button>
                  <p className="muted small-print">
                    Se alterado, este email será usado para login e recuperação de senha.
                  </p>
                </div>
              </form>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Segurança</p>
                  <h2>Atualizar senha</h2>
                  <p className="lede">Mantenha suas credenciais fortes sem sair da sessão.</p>
                </div>
                <span className="badge">Credenciais</span>
              </div>
              <form className="account-form" onSubmit={handlePasswordSubmit}>
                <label className="field">
                  <span>Senha atual</span>
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                  />
                </label>
                <label className="field">
                  <div className="field-label">
                    <span>Nova senha</span>
                    <PasswordRulesHint />
                  </div>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Confirmar nova senha</span>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
                {passwordError ? <div className="alert">{passwordError}</div> : null}
                {passwordSuccess ? <div className="success">{passwordSuccess}</div> : null}
                <div className="account-actions">
                  <button type="submit" className="primary-button" disabled={passwordLoading}>
                    {passwordLoading ? 'Salvando...' : 'Atualizar senha'}
                  </button>
                  <button type="button" className="ghost-button" onClick={onLogout}>
                    Sair da sessão
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
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
        exception instanceof Error ? exception.message : 'Não foi possível autenticar.';
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
      <div className="login-shell">
        <div className="login-card">
          <p className="eyebrow">Carregando sessão...</p>
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
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      );
    }
    if (authScreen === 'reset-request') {
      return <PasswordResetRequestScreen onBack={() => setAuthScreen('login')} />;
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
