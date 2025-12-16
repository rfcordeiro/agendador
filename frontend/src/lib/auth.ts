import { ensureCsrf, toStringArray } from './api';
export { ensureCsrf };
import {
  AuthState,
  ChangeEmailInput,
  ChangePasswordInput,
  Credentials,
  ResetToken,
  User,
  UserPayload,
} from '../types';

export function normalizeUser(
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

export function hasPermission(
  user: User,
  required?: string | string[],
): boolean {
  if (!required) return true;
  const permissionSet = new Set(user.permissions);
  if (typeof required === 'string') return permissionSet.has(required);
  return required.some((permission) => permissionSet.has(permission));
}

export async function fetchMe(): Promise<User> {
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

export async function authenticate(
  credentials: Credentials,
): Promise<AuthState> {
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

export async function changePassword(
  input: ChangePasswordInput,
): Promise<void> {
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

export async function changeEmail(input: ChangeEmailInput): Promise<User> {
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

export async function requestPasswordReset(email: string): Promise<string> {
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

export async function confirmPasswordReset(
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
