import Link from 'next/link';
import { getEvent, getEventArticles } from '@/lib/api';

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
      <Link
        href={`/events/${slug}`}
        className="mb-4 inline-block text-sm text-brand-600 hover:underline"
      >
        ← 返回事件详情
      </Link>

      <h1 className="mb-2 text-2xl font-bold">{event.title}</h1>
      <p className="mb-6 text-sm text-slate-500">共 {articles.length} 篇来源文章</p>

      <div className="space-y-3">
        {articles.map((a) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-brand-500"
          >
            <h2 className="mb-1 font-medium text-slate-900">{a.title}</h2>
            {a.snippet && (
              <p className="mb-2 line-clamp-2 text-sm text-slate-500">{a.snippet}</p>
            )}
            <div className="flex gap-3 text-xs text-slate-400">
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
