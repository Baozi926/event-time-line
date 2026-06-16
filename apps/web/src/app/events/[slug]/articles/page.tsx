import { getEvent, getEventArticles } from '@/lib/api';
import { BackLink } from '@/components/ui/BackLink';
import { PageHeader } from '@/components/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default async function EventArticlesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, { articles }] = await Promise.all([
    getEvent(slug),
    getEventArticles(slug),
  ]);

  return (
    <div>
      <BackLink href={`/events/${slug}`}>返回事件详情</BackLink>

      <PageHeader
        title={event.title}
        description={`共 ${articles.length} 篇来源文章`}
      />

      <div className="space-y-3">
        {articles.map((a) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-hover block p-4"
          >
            <h2 className="mb-1 font-medium leading-snug text-slate-900">
              {a.title}
            </h2>
            {a.snippet && (
              <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
                {a.snippet}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span>{a.source?.name ?? '未知来源'}</span>
              <span>{a.source?.domain}</span>
              <span>{new Date(a.publishedAt).toLocaleString('zh-CN')}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
