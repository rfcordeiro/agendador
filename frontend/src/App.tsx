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

async function fetchMe(token: string): Promise<User> {
  const response = await fetch("/api/auth/me", {
    headers: { Authorization: `Token ${token}` },
  });

  if (!response.ok) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const userPayload = data.user as Partial<User> | undefined;
  if (!userPayload) {
    throw new Error("Resposta do backend sem usuário.");
  }

  return {
    name: userPayload.name ?? "Usuário",
    email: userPayload.email ?? "",
    role: userPayload.role ?? "operador",
  };
}

const navItems = [
  { label: "Dashboard", icon: "📊" },
  { label: "Profissionais", icon: "👥" },
  { label: "Locais", icon: "🏥" },
  { label: "Escalas", icon: "📅" },
  { label: "Publicação", icon: "☁️" },
  { label: "Auditoria", icon: "📝" },
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
  "Login vinculado ao usuário do Django/DRF.",
  "Troca de senha em Minha conta (placeholder).",
  "Permissões e publicação ficam disponíveis após autenticação.",
];

const quickActions = [
  { label: "Criar escala", tone: "primary" },
  { label: "Importar calendário", tone: "secondary" },
  { label: "Ver inconsistências", tone: "ghost" },
];

const LOCAL_TOKEN_KEY = "agendador.auth.token";

async function authenticate(credentials: Credentials): Promise<AuthState> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error("Usuário ou senha inválidos ou backend indisponível.");
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const token =
    typeof data.token === "string"
      ? data.token
      : typeof data.access === "string"
        ? data.access
        : typeof data.key === "string"
          ? data.key
          : null;

  if (!token) {
    throw new Error("Resposta do backend sem token.");
  }

  const userPayload = data.user as Partial<User> | undefined;
  const name =
    userPayload?.name ??
    (typeof data.username === "string" ? data.username : credentials.username) ??
    "Usuário";

  const user: User = {
    name,
    email: userPayload?.email ?? "",
    role: userPayload?.role ?? "operador",
  };

  return { token, user };
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
          <h1>Entre com seu usuário do Django</h1>
          <p className="lede">
            A autenticação usa os endpoints de login do backend. Em produção, tokens ficam em
            cookie seguro; em dev usamos armazenamento local.
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

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

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
            <button key={item.label} className="nav-item active">
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
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>
              {greeting}, {user.name}
            </h1>
            <p className="lede">
              Estado da escala, pendências e atalhos para publicar ou revisar. Animações virão na
              próxima iteração.
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
      </main>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(LOCAL_TOKEN_KEY);
    if (storedToken) {
      fetchMe(storedToken)
        .then((user) => setAuth({ token: storedToken, user }))
        .catch(() => {
          localStorage.removeItem(LOCAL_TOKEN_KEY);
        })
        .finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, []);

  const handleLogin = async (credentials: Credentials) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authenticate(credentials);
      localStorage.setItem(LOCAL_TOKEN_KEY, result.token);
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
    const storedToken = localStorage.getItem(LOCAL_TOKEN_KEY);
    if (storedToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Token ${storedToken}` },
      }).catch(() => {
        /* ignore logout errors */
      });
    }
    localStorage.removeItem(LOCAL_TOKEN_KEY);
    setAuth(null);
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

  return <Dashboard user={auth.user} onLogout={handleLogout} />;
}
