import type { AuthMeResponse, User } from '@event-time-line/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function authFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; res: Response }> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { data, res };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: User }> {
  const { data, res } = await authFetch<{ user: User; error?: string }>(
    '/api/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );
  if (!res.ok) {
    throw new Error(data.error ?? '登录失败');
  }
  return { user: data.user };
}

export async function register(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ user: User }> {
  const { data, res } = await authFetch<{ user: User; error?: string }>(
    '/api/v1/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    throw new Error(data.error ?? '注册失败');
  }
  return { user: data.user };
}

export async function logout(): Promise<void> {
  await authFetch('/api/v1/auth/logout', { method: 'POST' });
}

export async function updateProfile(input: {
  displayName?: string;
  locale: string;
}): Promise<{ user: User }> {
  const { data, res } = await authFetch<{ user: User; error?: string }>(
    '/api/v1/auth/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    throw new Error(data.error ?? '保存个人信息失败');
  }
  return { user: data.user };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const { data, res } = await authFetch<{ success?: boolean; error?: string }>(
    '/api/v1/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    throw new Error(data.error ?? '修改密码失败');
  }
}

export async function getMeClient(): Promise<User | null> {
  const { data, res } = await authFetch<AuthMeResponse & { error?: string }>(
    '/api/v1/auth/me',
  );
  if (res.status === 401) return null;
  if (!res.ok) {
    throw new Error(data.error ?? '获取用户信息失败');
  }
  return data.user;
}

export async function getMeServer(): Promise<User | null> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) return null;

  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as AuthMeResponse;
  return data.user;
}
