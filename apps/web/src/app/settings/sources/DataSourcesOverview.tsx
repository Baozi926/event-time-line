import Link from 'next/link';
import { GDELT_CATEGORIES } from '@event-time-line/shared';
import { Badge } from '@/components/ui/Badge';

const CATEGORY_LABELS: Record<string, string> = {
  politics: '政治',
  disaster: '灾害',
  conflict: '冲突',
  tech: '科技',
  economy: '经济',
  society: '社会',
  health: '健康',
  environment: '环境',
  sports: '运动',
  conflict_ukraine: '乌克兰',
  conflict_gaza: '加沙',
  conflict_redsea: '红海',
  conflict_sudan: '苏丹',
  conflict_taiwan: '台海',
  conflict_dprk: '朝鲜',
  conflict_nuclear: '核威胁',
};

export function DataSourcesOverview() {
  return (
    <section className="card">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">数据源概览</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          全量采集（fetch）会从以下渠道拉取文章并合并入库
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">GDELT DOC API</span>
            <Badge variant="green">主数据源</Badge>
            <Badge variant="blue">系统内置</Badge>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            按分类关键词轮询 GDELT 全球新闻全文 API，是热点发现的主要来源。分类与关键词目前为系统预设，暂不支持在线修改。
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.keys(GDELT_CATEGORIES).map((key) => (
              <li
                key={key}
                className="rounded-md bg-slate-50 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200/60"
              >
                {CATEGORY_LABELS[key] ?? key}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">RSS 订阅</span>
            <Badge variant="orange">补充数据源</Badge>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            从主流媒体 RSS 补充高质量报道，可在下方管理订阅列表。系统内置源仅可停用，不可删除。
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <Link
          href="/guide/sources"
          className="text-xs text-brand-600 hover:underline"
        >
          查看完整数据源说明 →
        </Link>
      </div>
    </section>
  );
}
