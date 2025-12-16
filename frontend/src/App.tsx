import { useEffect, useState } from 'react';
import './App.css';
import {
  AuthState,
  Page,
  AuthError,
  AuthScreen,
  ResetToken,
  Credentials,
  ChangeEmailInput,
} from './types';
import {
  fetchMe,
  authenticate,
  ensureCsrf,
  changePassword,
  changeEmail,
} from './lib/auth';
import { LoginScreen } from './components/auth/LoginScreen';
import {
  PasswordResetRequestScreen,
  PasswordResetConfirmScreen,
} from './components/auth/ResetPasswordScreens';
import { Dashboard } from './components/layout/Dashboard';

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
