import { FormEvent, useState } from 'react';
import { ResetToken } from '../../types';
import { requestPasswordReset, confirmPasswordReset } from '../../lib/auth';

export function PasswordResetRequestScreen({ onBack }: { onBack: () => void }) {
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

export function PasswordResetConfirmScreen({
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
