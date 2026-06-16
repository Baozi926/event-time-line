'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@event-time-line/shared';
import {
  getMeClient,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
} from '@/lib/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  updateProfile: (input: {
    displayName?: string;
    locale: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(initialUser === undefined);

  const refresh = useCallback(async () => {
    try {
      const me = await getMeClient();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (initialUser === undefined) {
      void refresh().finally(() => setLoading(false));
    }
  }, [initialUser, refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: next } = await apiLogin(email, password);
    setUser(next);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; displayName?: string }) => {
      const { user: next } = await apiRegister(input);
      setUser(next);
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.replace('/login');
    router.refresh();
  }, [router]);

  const updateProfile = useCallback(
    async (input: { displayName?: string; locale: string }) => {
      const { user: next } = await apiUpdateProfile(input);
      setUser(next);
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      updateProfile,
      logout,
      refresh,
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, login, register, updateProfile, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
