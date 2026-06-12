import { CandidateActions } from './CandidateActions';
import { getCandidates } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage() {
  let data: Awaited<ReturnType<typeof getCandidates>> | null = null;
  let error: string | null = null;

  try {
    data = await getCandidates();
  } catch (e) {
    error = e instanceof Error ? e.message : '加载失败';
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">候选热点池</h1>
        <p className="mt-1 text-sm text-slate-500">
          系统自动发现的候选事件，可手动加入关注或归档
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {data && data.candidates.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          暂无候选热点，请先运行数据采集任务
        </div>
      )}

      <div className="grid gap-4">
        {data?.candidates.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                候选
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                热度 {c.heatScore.toFixed(0)}
              </span>
              {c.categoryHint && (
                <span className="text-xs text-slate-400">{c.categoryHint}</span>
              )}
            </div>
            <h2 className="mb-2 text-lg font-semibold">{c.title}</h2>
            <div className="mb-4 flex gap-4 text-xs text-slate-400">
              <span>{c.sourceCount} 个来源</span>
              <span>{c.articleCount} 篇文章</span>
            </div>
            <CandidateActions candidateId={c.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
