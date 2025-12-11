import { FormEvent, useEffect, useMemo, useState } from "react";
import "./index.css";

interface User {
  name: string;
  email: string;
  role: string;
}

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

type Page = "dashboard" | "account";

function readCsrfToken(): string | null {
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("csrftoken="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

async function ensureCsrf(): Promise<string> {
  const existing = readCsrfToken();
  if (existing) return existing;
  await fetch("/api/auth/csrf/", { credentials: "include" });
  const token = readCsrfToken();
  if (!token) {
    throw new Error("Não foi possível obter o CSRF token.");
  }
  return token;
}

async function fetchMe(): Promise<User> {
  const response = await fetch("/api/auth/me", { credentials: "include" });

  if (!response.ok) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const userPayload = data.user as Partial<User> | undefined;
  if (!userPayload) {
    throw new Error("Resposta do servidor sem usuário.");
  }

  return {
    name: userPayload.name ?? "Usuário",
    email: userPayload.email ?? "",
    role: userPayload.role ?? "operador",
  };
}

const navItems = [
  { label: "Dashboard", icon: "📊", page: "dashboard" as Page },
  { label: "Profissionais", icon: "👥" },
  { label: "Locais", icon: "🏥" },
  { label: "Escalas", icon: "📅" },
  { label: "Publicação", icon: "☁️" },
  { label: "Auditoria", icon: "📝" },
  { label: "Minha conta", icon: "👤", page: "account" as Page },
];

const metricsCards = [
  { title: "Próximas escalas", value: "3 semanas", detail: "Geração automática ativa", tone: "ok" },
  { title: "Pendências", value: "5 itens", detail: "Aprovar e publicar", tone: "warn" },
  {
    title: "Jobs de sync",
    value: "2/2",
    detail: "Google Calendar e Redis ok",
    tone: "ok",
  },
  { title: "Ajustes manuais", value: "12", detail: "Revisar Savassi/Lourdes", tone: "info" },
];

const highlights = [
  "Login vinculado ao usuário do sistema.",
  "Troca de senha em Minha conta (placeholder).",
  "Permissões e publicação ficam disponíveis após autenticação.",
];

const quickActions = [
  { label: "Criar escala", tone: "primary" },
  { label: "Importar calendário", tone: "secondary" },
  { label: "Ver inconsistências", tone: "ghost" },
];

const passwordRules = [
  "Mínimo de 8 caracteres.",
  "Use pelo menos uma letra maiúscula e uma minúscula.",
  "Inclua número ou símbolo para reforçar a segurança.",
];

async function authenticate(credentials: Credentials): Promise<AuthState> {
  const csrf = await ensureCsrf();
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error("Usuário ou senha inválidos ou serviço indisponível.");
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const userPayload = data.user as Partial<User> | undefined;
  const name =
    userPayload?.name ?? (typeof data.username === "string" ? data.username : credentials.username);

  const user: User = {
    name,
    email: userPayload?.email ?? "",
    role: userPayload?.role ?? "operador",
  };

  return { token: "session", user };
}

async function changePassword(input: ChangePasswordInput): Promise<void> {
  const csrf = await ensureCsrf();
  const response = await fetch("/api/auth/password/change", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
    body: JSON.stringify({ old_password: input.oldPassword, new_password: input.newPassword }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const detail = typeof data.detail === "string" ? data.detail : null;
    if (response.status === 403) {
      throw new Error(detail ?? "Sessão expirada ou CSRF inválido. Faça login novamente.");
    }
    throw new Error(detail ?? "Não foi possível trocar a senha.");
  }
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
        className={`tooltip-card${open ? " visible" : ""}`}
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
}: {
  onLogin: (credentials: Credentials) => Promise<void>;
  loading: boolean;
  error: AuthError | null;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

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
            {loading ? "Autenticando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({
  user,
  onLogout,
  onPasswordChange,
  page,
  onNavigate,
}: {
  user: User;
  onLogout: () => void;
  onPasswordChange: (input: ChangePasswordInput) => Promise<void>;
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);
  const userInitial = useMemo(() => {
    const source = user.name || user.email || "Usuário";
    return source.charAt(0).toUpperCase();
  }, [user.email, user.name]);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não conferem.");
      return;
    }
    setPasswordLoading(true);
    try {
      await onPasswordChange({ oldPassword, newPassword });
      setPasswordSuccess("Senha atualizada com sucesso.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (exception) {
      const message =
        exception instanceof Error ? exception.message : "Erro ao trocar a senha.";
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
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
              className={`nav-item${item.page === page ? " active" : ""}`}
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
        {page === "dashboard" ? (
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
                {quickActions.map((action) => (
                  <button key={action.label} className={`pill action-${action.tone}`}>
                    {action.label}
                  </button>
                ))}
              </div>
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
                    <p className="muted">{user.email || "Email não informado"}</p>
                    <div className="chip-row">
                      <span className="pill pill-soft">Função: {user.role}</span>
                      <span className="pill pill-ghost">Autenticação ativa</span>
                    </div>
                  </div>
                </div>

                <dl className="account-details">
                  <div>
                    <dt>Nome completo</dt>
                    <dd>{user.name}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{user.email || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Perfil de acesso</dt>
                    <dd>{user.role}</dd>
                  </div>
                </dl>
              </div>
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
                    {passwordLoading ? "Salvando..." : "Atualizar senha"}
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
  const [page, setPage] = useState<Page>("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    fetchMe()
      .then((user) => setAuth({ token: "session", user }))
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
        exception instanceof Error ? exception.message : "Não foi possível autenticar.";
      setError({ message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    ensureCsrf()
      .then((csrf) =>
        fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRFToken": csrf },
        })
      )
      .catch(() => {
        /* ignore logout errors */
      })
      .finally(() => {
        setAuth(null);
      });
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
    return <LoginScreen onLogin={handleLogin} loading={loading} error={error} />;
  }

  return (
    <Dashboard
      user={auth.user}
      onLogout={handleLogout}
      onPasswordChange={(input) => changePassword(input)}
      page={page}
      onNavigate={setPage}
    />
  );
}
