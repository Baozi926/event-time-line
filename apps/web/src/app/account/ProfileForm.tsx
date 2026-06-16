'use client';

import { useState } from 'react';
import type { User } from '@event-time-line/shared';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/ui/Alert';

const LOCALE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
] as const;

export function ProfileForm({ user }: { user: User }) {
  const { updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [locale, setLocale] = useState(user.locale || 'zh-CN');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        locale,
      });
      setSuccess('个人信息已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="warning">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          登录邮箱
        </label>
        <input
          id="email"
          type="email"
          value={user.email}
          disabled
          className="w-full cursor-not-allowed rounded-xl border border-blue-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">邮箱暂不支持自助修改。</p>
      </div>

      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-slate-700">
          昵称
        </label>
        <input
          id="displayName"
          type="text"
          maxLength={100}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="给自己取个好记的名字"
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="locale" className="mb-1.5 block text-sm font-medium text-slate-700">
          界面语言
        </label>
        <select
          id="locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        >
          {LOCALE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
        {loading ? '保存中…' : '保存个人信息'}
      </button>
    </form>
  );
}
