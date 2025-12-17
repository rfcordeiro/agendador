import { useMemo, useState, useEffect, FormEvent } from 'react';
import logoUrl from '../../assets/logo.png';
import { User, ChangePasswordInput, ChangeEmailInput, Page } from '../../types';
import { hasPermission } from '../../lib/auth';
import { PermissionsWidget } from '../ui/PermissionsWidget';
import { PasswordRulesHint } from '../auth/PasswordRulesHint';
import { ProfissionaisPage } from '../../pages/ProfissionaisPage';
import { LocaisPage } from '../../pages/LocaisPage';
import { PremissasPage } from '../../pages/PremissasPage';

export const navItems: { label: string; page?: Page; icon: string }[] = [
  { label: 'Dashboard', page: 'dashboard', icon: '📊' },
  { label: 'Minha conta', page: 'account', icon: '👤' },
  { label: 'Profissionais', page: 'profissionais', icon: '👥' },
  { label: 'Locais e salas', page: 'locais', icon: '🏥' },
  { label: 'Premissas', page: 'premissas', icon: '⚙️' },
  { label: 'Escalas', icon: '📅' }, // TODO: Implementar
];

const quickActions = [
  { label: 'Publicar escala', tone: 'primary', permission: 'publish_schedule' },
  { label: 'Validar trocas', tone: 'neutral', permission: 'approve_swaps' },
  {
    label: 'Gerar relatórios',
    tone: 'neutral',
    permission: 'view_reports',
  },
];

const metricsCards = [
  {
    title: 'Turnos cobertos',
    value: '42/45',
    detail: 'Semana atual',
    tone: 'good',
  },
  {
    title: 'Trocas pendentes',
    value: '3',
    detail: 'Aguardando aprovação',
    tone: 'warn',
  },
  {
    title: 'Gaps de escala',
    value: '2',
    detail: 'Próxima semana',
    tone: 'critical',
  },
];

const highlights = [
  'Sistema de autenticação implementado com tokens de sessão',
  'Gestão de profissionais, locais e salas com validações',
  'Dashboard com verificação de permissões do usuário logado',
];

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onPasswordChange: (input: ChangePasswordInput) => Promise<void>;
  onEmailChange: (input: ChangeEmailInput) => Promise<User>;
  page: Page;
  onNavigate: (page: Page) => void;
}

export function Dashboard({
  user,
  onLogout,
  onPasswordChange,
  onEmailChange,
  page,
  onNavigate,
}: DashboardProps) {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 960px)');

    const syncSidebar = (matches: boolean) => setIsSidebarOpen(!matches);
    syncSidebar(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) =>
      syncSidebar(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

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
    <div className={`app-shell${isSidebarOpen ? '' : ' sidebar-closed'}`}>
      <aside
        className='sidebar'
        data-open={isSidebarOpen}
        aria-hidden={!isSidebarOpen}
        id='primary-sidebar'
      >
        <div className='brand'>
          <img src={logoUrl} alt="Agendador" className="brand-logo" />
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
        <div className='menu-toggle-tray'>
          <button
            type='button'
            className={`menu-toggle${isSidebarOpen ? ' is-open' : ''}`}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-expanded={isSidebarOpen}
            aria-controls='primary-sidebar'
            aria-label={
              isSidebarOpen ? 'Recolher menu lateral' : 'Abrir menu lateral'
            }
          >
            <span className='hamburger' aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className='menu-toggle__label'>
              {isSidebarOpen ? 'Ocultar' : 'Menu'}
            </span>
          </button>
        </div>
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
