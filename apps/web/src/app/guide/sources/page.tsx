import Link from 'next/link';
import {
  DEFAULT_COLLECTION_SCHEDULE,
  GDELT_CATEGORIES,
  HOT_TREND_PLATFORMS,
  RSS_FEEDS,
  formatHoursLabel,
  formatMinutesLabel,
} from '@event-time-line/shared';
import { GuideNav } from '@/components/GuideNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';

const COLLECTION_METHODS = [
  {
    id: 'gdelt-doc',
    name: 'GDELT DOC 分类采集',
    status: 'active' as const,
    role: '发现热点',
    desc: '按预设主题关键词轮询 GDELT 全球新闻全文 API，覆盖政治、灾害、冲突、科技、经济等方向。',
  },
  {
    id: 'rss',
    name: 'RSS 订阅',
    status: 'active' as const,
    role: '补充报道',
    desc: '拉取主流媒体 RSS，与 GDELT 结果合并入库，提升特定媒体的覆盖与时效。',
  },
  {
    id: 'usgs',
    name: 'USGS 地震',
    status: 'active' as const,
    role: '自然灾害',
    desc: '拉取 USGS 公开地震 GeoJSON Feed，转换为可聚类的事件文章。',
  },
  {
    id: 'valyu',
    name: 'Valyu 新闻搜索',
    status: 'active' as const,
    role: '区域补充',
    desc: '配置 API Key 后启用，用于补充区域热点与冲突相关报道。',
  },
  {
    id: 'hot-trend',
    name: '多平台热榜（NewsNow）',
    status: 'active' as const,
    role: '国内热点发现',
    desc: '参考 TrendRadar，通过 NewsNow API 拉取微博、知乎、澎湃等平台热搜，作为早期信号补充 GDELT。',
  },
  {
    id: 'tracked',
    name: '关注事件定向采集',
    status: 'active' as const,
    role: '持续跟踪',
    desc: '对「关注中」的事件，用标题关键词生成 GDELT 查询，定期拉取相关报道。',
  },
  {
    id: 'gdelt-events',
    name: 'GDELT Events 结构化事件',
    status: 'planned' as const,
    role: '热点发现',
    desc: 'CSV / BigQuery 结构化事件数据，可用于地理标注与早期信号（规划中，尚未接入）。',
  },
  {
    id: 'wikidata',
    name: 'Wikidata / Wikipedia',
    status: 'planned' as const,
    role: '背景知识',
    desc: '为事件补充实体背景与历史脉络（规划中，尚未接入）。',
  },
];

const PIPELINE_STEPS = [
  {
    step: '1',
    title: '拉取原始文章',
    desc: '从 GDELT DOC、RSS、USGS、Valyu 或热榜获取标题、链接、发布时间、媒体域名等字段。',
  },
  {
    step: '2',
    title: '标准化与去重',
    desc: '统一 URL 格式，按链接哈希去重；已存在的文章不会重复入库。',
  },
  {
    step: '3',
    title: '关联媒体来源',
    desc: '按域名写入 sources 表，后续参与来源多样性、媒体权威等热度因子计算。',
  },
  {
    step: '4',
    title: '事件聚类',
    desc: '新文章与已有事件标题相似度 > 0.35 时合并，否则创建新候选事件。',
  },
];

const MANUAL_JOBS = [
  {
    job: 'fetch',
    label: '全量采集（GDELT + USGS + 可选 Valyu）',
    desc: '执行 GDELT 主题/区域查询、USGS 地震和可选 Valyu 拉取，并完成入库与聚类。',
  },
  {
    job: 'fetch-hot-trend',
    label: '多平台热榜',
    desc: '执行 NewsNow 热榜采集；是否启用、平台列表和 API 地址在数据源设置中配置。',
  },
  {
    job: 'fetch-rss',
    label: 'RSS 订阅',
    desc: '强制拉取全部已启用 RSS 源，并完成入库、聚类与候选评分。',
  },
  {
    job: 'tracked',
    label: '关注事件采集',
    desc: '仅对「关注中」事件执行 GDELT 定向查询，更新文章关联与热度。',
  },
  {
    job: 'snapshot',
    label: '每日快照',
    desc: '为关注事件生成当日热度快照，用于趋势回顾（不产生新文章）。',
  },
  {
    job: 'all',
    label: '全部任务',
    desc: '依次执行全量采集、热榜、RSS、关注采集和每日快照。',
  },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card p-5">{children}</div>;
}

export default function GuideSourcesPage() {
  const schedule = DEFAULT_COLLECTION_SCHEDULE;

  return (
    <div>
      <PageHeader
        title="信息采集"
        description="系统当前如何从外部渠道获取新闻，以及采集后的处理流程"
      />

      <GuideNav />

      <nav className="mb-8 flex flex-wrap gap-2 text-sm">
        {[
          { href: '#overview', label: '手段总览' },
          { href: '#gdelt', label: 'GDELT DOC' },
          { href: '#rss', label: 'RSS 订阅' },
          { href: '#hot-trend', label: '热榜' },
          { href: '#tracked', label: '关注采集' },
          { href: '#schedule', label: '调度与触发' },
          { href: '#pipeline', label: '入库流程' },
          { href: '#planned', label: '规划中' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-sm transition-colors hover:border-brand-500/30 hover:bg-brand-50 hover:text-brand-700"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        <Section id="overview" title="手段总览">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            拾光纪以<strong className="font-medium text-slate-800">开放数据源</strong>为主，
            通过 Worker 定时或手动触发采集任务。核心组合为 GDELT 主题/区域查询 + RSS + USGS 地震 + NewsNow 热榜；
            Valyu 为可选补充，默认不启用。热榜采集参考{' '}
            <a
              href="https://github.com/sansan0/TrendRadar"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TrendRadar
            </a>
            ，数据来自{' '}
            <a
              href="https://github.com/ourongxing/newsnow"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              NewsNow
            </a>
            。
          </p>
          <div className="overflow-x-auto card">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">手段</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">用途</th>
                  <th className="px-4 py-3">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {COLLECTION_METHODS.map((method) => (
                  <tr key={method.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {method.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={method.status === 'active' ? 'brand' : 'slate'}>
                        {method.status === 'active' ? '已接入' : '规划中'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {method.role}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{method.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="gdelt" title="GDELT DOC 分类采集">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            GDELT（Global Database of Events, Language, and Tone）DOC 2.0 API 提供全球新闻全文检索，
            覆盖 65 种语言，约 15 分钟更新一次。系统按预设分类依次查询（含 7 条区域热点 <code className="rounded bg-slate-100 px-1">conflict_*</code>），
            每类最多返回 75 篇文章，默认时间窗口为近 24 小时。
          </p>

          <Card>
            <h3 className="mb-2 font-medium text-slate-900">API 端点</h3>
            <p className="font-mono text-xs text-slate-600">
              https://api.gdeltproject.org/api/v2/doc/doc
            </p>
            <p className="mt-3 text-sm text-slate-600">
              参数：<code className="rounded bg-slate-100 px-1">mode=artlist</code>、
              <code className="rounded bg-slate-100 px-1">maxrecords=75</code>、
              <code className="rounded bg-slate-100 px-1">timespan=24h</code>、
              <code className="rounded bg-slate-100 px-1">sort=datedesc</code>
            </p>
          </Card>

          <div className="mt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">当前分类与查询词</h3>
            <div className="space-y-2">
              {Object.entries(GDELT_CATEGORIES).map(([category, query]) => (
                <div key={category} className="card px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="slate">{category}</Badge>
                    <span className="font-mono text-xs text-slate-600">{query}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            分类之间间隔约 12 秒，避免触发 GDELT 限流（429）；遇到限流会自动退避重试。
            每次采集结果写入{' '}
            <Link href="/collection" className="text-brand-600 hover:underline">
              采集记录
            </Link>{' '}
            ，run_type 为 <code className="rounded bg-slate-100 px-1">fetch_gdelt</code>。
          </p>
        </Section>

        <Section id="rss" title="RSS 订阅">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            RSS 作为 GDELT 的补充来源，直接拉取特定媒体的最新条目。
            默认列表合并了原有国际媒体与{' '}
            <a
              href="https://github.com/sansan0/TrendRadar"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TrendRadar
            </a>{' '}
            推荐源（Hacker News、雅虎财经、CNBC、TechCrunch、新华网等，共{' '}
            {RSS_FEEDS.length} 个）。
            解析失败时会最多重试 3 次，各 Feed 之间间隔约 1.5 秒。
            可在{' '}
            <Link href="/settings/sources" className="text-brand-600 hover:underline">
              设置 → 数据源
            </Link>{' '}
            增删订阅。
          </p>

          <div className="overflow-x-auto card">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">媒体</th>
                  <th className="px-4 py-3">域名</th>
                  <th className="px-4 py-3">Feed URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RSS_FEEDS.map((feed) => (
                  <tr key={feed.url}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {feed.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {feed.domain}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 break-all">
                      {feed.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            RSS 采集与 GDELT 在同一轮全量 pipeline 中执行，run_type 为{' '}
            <code className="rounded bg-slate-100 px-1">fetch_rss</code>。
          </p>
        </Section>

        <Section id="hot-trend" title="多平台热榜（NewsNow）">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            借鉴{' '}
            <a
              href="https://github.com/sansan0/TrendRadar"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              TrendRadar
            </a>
            ，通过{' '}
            <a
              href="https://github.com/ourongxing/newsnow"
              className="text-brand-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              NewsNow
            </a>{' '}
            开源 API 拉取国内主流平台热搜。热榜标题作为早期信号入库，经聚类后可与 GDELT 报道合并为同一事件。
            可通过环境变量 <code className="rounded bg-slate-100 px-1">HOT_TREND_ENABLED=false</code> 关闭，
            或自部署 NewsNow 后设置 <code className="rounded bg-slate-100 px-1">NEWSNOW_API_URL</code>。
          </p>

          <Card>
            <h3 className="mb-2 font-medium text-slate-900">API 端点</h3>
            <p className="font-mono text-xs text-slate-600">
              https://newsnow.busiyi.world/api/s?id=&#123;platform&#125;&amp;latest
            </p>
            <p className="mt-3 text-sm text-slate-600">
              各平台请求间隔约 1.2 秒；返回链接会做 HTTPS 域名校验（与 TrendRadar 相同策略）。
            </p>
          </Card>

          <div className="mt-4 overflow-x-auto card">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">平台</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">校验域名</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {HOT_TREND_PLATFORMS.map((platform) => (
                  <tr key={platform.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {platform.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {platform.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                      {platform.expectedDomain}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            热榜采集 run_type 为{' '}
            <code className="rounded bg-slate-100 px-1">fetch_hot_trend</code>，source_type 为{' '}
            <code className="rounded bg-slate-100 px-1">hot_trend</code>。
          </p>
        </Section>

        <Section id="tracked" title="关注事件定向采集">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            对处于「关注中」状态的事件，系统会从标题提取关键词并生成 GDELT 查询词，存入{' '}
            <code className="rounded bg-slate-100 px-1">event_queries</code> 表。
            也可在{' '}
            <Link href="/candidates" className="text-brand-600 hover:underline">
              候选池
            </Link>{' '}
            手动将事件加入关注。
          </p>

          <Card>
            <h3 className="mb-2 font-medium text-slate-900">关键词与查询词生成规则</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              <li>从标题去除标点，按空格分词</li>
              <li>保留长度 &gt; 4 的单词，最多取 5 个</li>
              <li>单个关键词：<code className="rounded bg-slate-100 px-1">&quot;keyword&quot;</code></li>
              <li>
                多个关键词：
                <code className="rounded bg-slate-100 px-1">
                  (&quot;word1&quot; OR &quot;word2&quot; OR …)
                </code>
              </li>
            </ul>
          </Card>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                时间窗口
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">近 7 天</p>
              <p className="mt-1 text-sm text-slate-600">timespan=7d，比分类采集更广</p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                采集后动作
              </p>
              <p className="mt-1 text-sm text-slate-600">
                新文章关联到事件、更新统计、重算热度，并记录 run_type{' '}
                <code className="rounded bg-slate-100 px-1">fetch_tracked</code>
              </p>
            </Card>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            「已归档」事件（7 天无新报道）不再参与定向采集。
          </p>
        </Section>

        <Section id="schedule" title="调度与手动触发">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            Worker 通过 BullMQ 定时队列执行采集任务，频率可在{' '}
            <Link href="/settings" className="text-brand-600 hover:underline">
              系统设置
            </Link>{' '}
            页配置；修改后约 30 秒内生效。
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <Badge variant="brand">全量采集</Badge>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatMinutesLabel(schedule.fetchIntervalMinutes)}
              </p>
              <p className="mt-1 text-sm text-slate-600">GDELT + USGS + 可选 Valyu；热榜独立调度</p>
            </Card>
            <Card>
              <Badge variant="brand">关注采集</Badge>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatMinutesLabel(schedule.trackedIntervalMinutes)}
              </p>
              <p className="mt-1 text-sm text-slate-600">对所有关注中事件定向查询</p>
            </Card>
            <Card>
              <Badge variant="brand">每日快照</Badge>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatHoursLabel(schedule.snapshotIntervalHours)}
              </p>
              <p className="mt-1 text-sm text-slate-600">记录热度历史，不拉取新文章</p>
            </Card>
          </div>

          <div className="mt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">手动触发任务</h3>
            <div className="space-y-2">
              {MANUAL_JOBS.map((item) => (
                <div key={item.job} className="card px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-slate-900">{item.label}</span>
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
                      job={item.job}
                    </code>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="pipeline" title="入库与聚类流程">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            无论来自哪个采集源，文章都经过同一套入库与聚类流程后再进入事件体系：
          </p>
          <div className="space-y-3">
            {PIPELINE_STEPS.map((item) => (
              <div key={item.step} className="flex gap-4 card px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {item.step}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="planned" title="规划中的数据源">
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            以下数据源在{' '}
            <span className="text-slate-700">docs/data-sources-evaluation.md</span>{' '}
            中已评估，但尚未写入代码。接入后可增强热点发现、地理标注与背景知识：
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <h3 className="font-medium text-slate-900">GDELT Events 2.0</h3>
              <p className="mt-2 text-sm text-slate-600">
                结构化事件 CSV / BigQuery，含 Actor、地点、GoldsteinScale 等字段，
                适合作为热点发现的早期信号，并与 DOC 文章 URL 关联。
              </p>
            </Card>
            <Card>
              <h3 className="font-medium text-slate-900">Wikidata / Wikipedia</h3>
              <p className="mt-2 text-sm text-slate-600">
                SPARQL 查询实体背景，Current Events 页面补充历史脉络，
                用于事件详情页的 enrich 阶段。
              </p>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}
