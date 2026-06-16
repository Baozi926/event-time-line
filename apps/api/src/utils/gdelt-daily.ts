import { GDELT_CATEGORIES } from '@event-time-line/shared';
import type {
  GdeltCategoryDailyStats,
  GdeltCollectionDailySummary,
} from '@event-time-line/shared';

function emptyStats(category: string): GdeltCategoryDailyStats {
  return {
    category,
    todayRuns: 0,
    successCount: 0,
    failCount: 0,
    todayArticlesFound: 0,
    todayArticlesNew: 0,
  };
}

export function buildGdeltDailySummary(
  runs: Array<{
    category: string;
    startedAt: Date;
    status: string;
    articlesFound: number;
    articlesNew: number;
    errorMessage?: string;
  }>,
  pipelineRuns: number,
): GdeltCollectionDailySummary {
  const statsMap = new Map<string, GdeltCategoryDailyStats>();

  for (const category of Object.keys(GDELT_CATEGORIES)) {
    statsMap.set(category, emptyStats(category));
  }

  for (const run of runs) {
    const category = run.category;
    if (!category) continue;

    let stat = statsMap.get(category);
    if (!stat) {
      stat = emptyStats(category);
      statsMap.set(category, stat);
    }

    const startedAt = run.startedAt.toISOString();
    stat.todayRuns += 1;

    if (run.status === 'completed') {
      stat.successCount += 1;
      stat.todayArticlesFound += run.articlesFound;
      stat.todayArticlesNew += run.articlesNew;
    }
    if (run.status === 'failed') {
      stat.failCount += 1;
    }

    stat.lastStatus = run.status === 'failed' ? 'failed' : 'completed';
    stat.lastAt = startedAt;
    stat.lastArticlesFound = run.articlesFound;
    stat.lastError = run.errorMessage;
  }

  const categoryList = [...statsMap.values()].sort((a, b) =>
    a.category.localeCompare(b.category, 'zh-CN'),
  );

  const todayArticlesFound = categoryList.reduce(
    (sum, cat) => sum + cat.todayArticlesFound,
    0,
  );
  const todayArticlesNew = categoryList.reduce(
    (sum, cat) => sum + cat.todayArticlesNew,
    0,
  );

  const today = new Date();
  const date = today.toLocaleDateString('sv-SE');

  return {
    date,
    pipelineRuns,
    todayArticlesFound,
    todayArticlesNew,
    categories: categoryList,
  };
}
