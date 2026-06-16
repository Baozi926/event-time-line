import Link from 'next/link';
import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-blue-100/80 bg-gradient-to-br from-white via-blue-50 to-orange-50 px-6 py-8 shadow-sm">
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-orange-200/40 blur-2xl" />
        <div className="relative">
          <p className="mb-2 text-xs font-semibold tracking-wide text-brand-700">新朋友你好</p>
          <h1 className="text-2xl font-black text-slate-950">注册账号</h1>
          <p className="mt-2 text-sm text-slate-600">创建账号后，可以把感兴趣的热点放进自己的关注列表</p>
        </div>
      </section>

      <div className="card px-6 py-6">
        <RegisterForm />
      </div>

      <p className="text-center text-xs text-slate-400">
        <Link href="/" className="hover:text-brand-600">
          返回首页
        </Link>
      </p>
    </div>
  );
}
