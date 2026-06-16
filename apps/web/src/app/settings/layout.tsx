import { PageHeader } from '@/components/ui/PageHeader';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="系统设置"
        description="配置数据来源、采集频率与 RSS 订阅。手动触发采集请前往采集记录页。"
        bordered={false}
      />
      {children}
    </div>
  );
}
