import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { AuthProvider } from '@/contexts/AuthContext';
import { getMeServer } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: '拾光纪 — 热点事件历史',
  description: '记录热点脉络，收藏时代瞬间',
  icons: {
    icon: '/logo.svg',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getMeServer();

  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col">
        <AuthProvider initialUser={initialUser}>
          <Nav />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
