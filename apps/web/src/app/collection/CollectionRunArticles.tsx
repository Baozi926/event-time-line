import type { CollectionRunArticle } from '@event-time-line/shared';

export function ArticleList({
  articles,
  className = '',
  compact = false,
}: {
  articles: CollectionRunArticle[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <ul
      className={`overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 ${
        compact ? 'space-y-1.5' : 'space-y-2 p-3'
      } ${className}`}
    >
      {articles.map((article) => (
        <li
          key={article.id}
          className={compact ? 'text-xs leading-snug' : 'text-sm leading-snug'}
        >
          <div className="flex items-start gap-1.5">
            {article.isNew && (
              <span className="shrink-0 rounded bg-emerald-100 px-1 py-px text-[10px] font-medium text-emerald-700">
                新
              </span>
            )}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              {article.title}
            </a>
          </div>
          {!compact && (
            <div className="mt-0.5 text-xs text-slate-400">{article.domain}</div>
          )}
          {compact && (
            <div className="mt-px truncate text-[10px] text-slate-400">
              {article.domain}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
