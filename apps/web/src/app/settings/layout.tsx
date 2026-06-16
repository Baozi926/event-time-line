import { redirect } from 'next/navigation';
import { getMeServer } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getMeServer();
  if (!user) {
    redirect('/login?next=/settings');
  }
  if (user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        variant="playful"
        eyebrow="后台小管家"
        title="系统设置"
        description="配置数据来源、采集频率与 RSS 订阅；想手动采集请去采集记录页。"
        bordered={false}
      />
      {children}
    </div>
  );
}
