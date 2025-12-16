import { FormEvent, useState } from 'react';
import { AuthError, Credentials } from '../../types';

export function LoginScreen({
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
