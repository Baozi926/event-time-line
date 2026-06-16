'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { changePassword } from '@/lib/auth';
import { Alert } from '@/components/ui/Alert';

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess('密码已更新，正在跳转到登录页…');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.setTimeout(() => {
        router.replace('/login');
        router.refresh();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="warning">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
          当前密码
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
          新密码
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
          确认新密码
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 transition focus:border-brand-300 focus:ring-2"
        />
      </div>

      <button type="submit" disabled={loading || Boolean(success)} className="btn-primary w-full justify-center py-2.5">
        {loading ? '保存中…' : '更新密码'}
      </button>
    </form>
  );
}
