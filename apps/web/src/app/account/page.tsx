import { redirect } from 'next/navigation';
import { getMeServer } from '@/lib/auth';
import { AccountPageGuard } from './AccountPageGuard';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileForm } from './ProfileForm';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getMeServer();
  if (!user) {
    redirect('/login?next=/account');
  }

  return (
    <AccountPageGuard>
      <div className="mx-auto max-w-lg space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50 to-orange-50 px-6 py-8 shadow-sm">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-orange-200/40 blur-2xl" />
        <div className="relative">
          <p className="mb-2 text-xs font-semibold tracking-wide text-brand-700">账号设置</p>
          <h1 className="text-2xl font-black text-slate-950">我的账号</h1>
          <p className="mt-2 text-sm text-slate-600">
            登录邮箱：<span className="font-medium text-slate-800">{user.email}</span>
            {user.displayName && (
              <span className="ml-2 text-slate-500">（{user.displayName}）</span>
            )}
          </p>
        </div>
      </section>

      <div className="card px-6 py-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">个人信息</h2>
        <ProfileForm user={user} />
      </div>

      <div className="card px-6 py-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">修改密码</h2>
        <ChangePasswordForm />
      </div>
      </div>
    </AccountPageGuard>
  );
}
