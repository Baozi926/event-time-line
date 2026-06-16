'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/ui/Alert';

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        email,
        password,
        displayName: displayName.trim() || undefined,
      });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="warning">{error}</Alert>}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          邮箱
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-slate-700">
          昵称（可选）
        </label>
        <input
          id="displayName"
          type="text"
          maxLength={100}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          密码
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        />
        <p className="mt-1 text-xs text-slate-500">至少 6 位</p>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
        {loading ? '注册中…' : '注册'}
      </button>

      <p className="text-center text-sm text-slate-500">
        已有账号？{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          登录
        </Link>
      </p>
    </form>
  );
}
