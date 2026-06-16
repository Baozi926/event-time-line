import type { CandidateArticleSummary } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';
import {
  categoryLabel,
  countryLabel,
  formatArticleDateGroup,
  formatCandidateTime,
  languageLabel,
} from './candidateLabels';

function ExternalLinkIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function dedupeArticles(
  articles: CandidateArticleSummary[],
): CandidateArticleSummary[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.url || article.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupArticlesByDate(
  articles: CandidateArticleSummary[],
): Array<{ label: string; articles: CandidateArticleSummary[] }> {
  const groups = new Map<string, CandidateArticleSummary[]>();

  for (const article of articles) {
    const label = formatArticleDateGroup(article.publishedAt);
    const list = groups.get(label) ?? [];
    list.push(article);
    groups.set(label, list);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    articles: items,
  }));
}

export function CandidateArticleList({
  articles,
  fallbackCategory,
  totalCount,
  variant = 'compact',
}: {
  articles: CandidateArticleSummary[];
  fallbackCategory?: string;
  totalCount: number;
  variant?: 'compact' | 'full';
}) {
  const uniqueArticles = dedupeArticles(articles);
  if (uniqueArticles.length === 0) return null;

  const isFull = variant === 'full';
  const groups = isFull ? groupArticlesByDate(uniqueArticles) : null;
  const showDateGroups = isFull && groups && groups.length > 1;

  return (
    <div className={isFull ? undefined : 'mt-4 border-t border-slate-100 pt-4'}>
      {!isFull && (
        <p className="mb-2 text-xs font-medium text-slate-500">
          相关新闻
          {totalCount > uniqueArticles.length && (
            <span className="font-normal text-slate-400">
              {' '}
              （展示 {uniqueArticles.length} / {totalCount} 篇）
            </span>
          )}
        </p>
      )}

      {isFull && totalCount > uniqueArticles.length && (
        <p className="mb-3 text-xs text-slate-400">
          展示最近 {uniqueArticles.length} 篇，共 {totalCount} 篇
        </p>
      )}

      {isFull && groups ? (
        <div className={showDateGroups ? 'space-y-4' : 'space-y-2'}>
          {groups.map((group) => (
            <div key={group.label}>
              {showDateGroups && (
                <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  {group.label}
                  <span className="h-px flex-1 bg-slate-200" />
                </h3>
              )}
              <ul className="space-y-2">
                {group.articles.map((article) => (
                  <ArticleItem
                    key={article.id}
                    article={article}
                    fallbackCategory={fallbackCategory}
                    isFull
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {uniqueArticles.map((article) => (
            <ArticleItem
              key={article.id}
              article={article}
              fallbackCategory={fallbackCategory}
              isFull={false}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArticleItem({
  article,
  fallbackCategory,
  isFull,
}: {
  article: CandidateArticleSummary;
  fallbackCategory?: string;
  isFull: boolean;
}) {
  const category = article.categoryHint ?? fallbackCategory;
  const source = article.sourceName ?? article.sourceDomain ?? '未知来源';

  return (
    <li
      className={
        isFull
          ? 'group relative rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2.5 transition-colors hover:border-brand-100 hover:bg-brand-50/30 sm:px-3.5 sm:py-3'
          : 'rounded-lg border border-slate-100 bg-slate-50/80 p-3'
      }
    >
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-start gap-2 font-medium leading-snug text-slate-900 hover:text-brand-600 ${
          isFull ? 'text-[15px]' : 'mb-2 text-sm'
        }`}
      >
        <span className="min-w-0 flex-1">{article.title}</span>
        {isFull && <ExternalLinkIcon />}
      </a>

      {article.snippet && article.snippet !== article.title && (
        <p
          className={`leading-relaxed text-slate-500 ${
            isFull
              ? 'mt-1 line-clamp-2 text-sm'
              : 'mb-3 line-clamp-2 text-xs'
          }`}
        >
          {article.snippet}
        </p>
      )}

      <div
        className={`flex flex-wrap items-center justify-between gap-2 ${
          isFull ? 'mt-2' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-md bg-white px-2 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200/60 ${
              isFull ? 'text-xs' : 'text-[11px]'
            }`}
          >
            {source}
          </span>
          {category && (
            <Badge variant="slate">{categoryLabel(category)}</Badge>
          )}
          {article.countryCode && (
            <Badge variant="blue">{countryLabel(article.countryCode)}</Badge>
          )}
          {article.language && (
            <Badge variant="slate">{languageLabel(article.language)}</Badge>
          )}
        </div>
        <time
          dateTime={article.publishedAt}
          className={`shrink-0 tabular-nums text-slate-400 ${
            isFull ? 'text-xs' : 'text-[11px]'
          }`}
        >
          {formatCandidateTime(article.publishedAt)}
        </time>
      </div>
    </li>
  );
}
