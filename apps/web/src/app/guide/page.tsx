import Link from 'next/link';
import { HEAT_WEIGHTS } from '@event-time-line/shared';
import { GuideNav } from '@/components/GuideNav';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import {
  GuideCallout,
  GuideCard,
  GuideSection,
} from './components/GuideSection';
import { GuideToc, GuideTocMobile } from './components/GuideToc';

const PIPELINE_STEPS = [
  {
    title: '采集',
    desc: 'GDELT / RSS / USGS / 热榜',
    href: '/guide/sources',
  },
  {
    title: '聚类',
    desc: '相似标题合成事件',
  },
  {
    title: '评分',
    desc: '计算热度分数',
  },
  {
    title: '晋升',
    desc: '管理员确认追踪',
    href: '#promote',
  },
  {
    title: '订阅',
    desc: '用户加入我的关注',
    href: '/',
  },
] as const;

const HEAT_FACTORS = [
  {
    key: 'sourceDiversity',
    name: '来源多样性',
    weight: HEAT_WEIGHTS.sourceDiversity,
    desc: '有多少不同媒体在报道。10 家及以上满分。',
  },
  {
    key: 'articleVelocity',
    name: '报道增速',
    weight: HEAT_WEIGHTS.articleVelocity,
    desc: '近 1 小时 vs 近 6 小时的文章比，越高说明越「正在发酵」。',
  },
  {
    key: 'recencyDecay',
    name: '时间衰减',
    weight: HEAT_WEIGHTS.recencyDecay,
    desc: '多久没有新报道。约 24 小时无更新时大幅降分。',
  },
  {
    key: 'sourceTier',
    name: '媒体权威',
    weight: HEAT_WEIGHTS.sourceTier,
    desc: '关联来源的可信度加权平均。',
  },
  {
    key: 'geographicSpread',
    name: '地理传播',
    weight: HEAT_WEIGHTS.geographicSpread,
    desc: '报道覆盖多少国家。5 国及以上满分。',
  },
] as const;

const EVENT_STAGES = [
  {
    status: 'candidate',
    label: '候选',
    color: 'bg-slate-100 text-slate-700 ring-slate-200',
    desc: '新发现的事件，先进入候选池观察',
    page: { href: '/candidates', label: '候选池' },
  },
  {
    status: 'tracking',
    label: '关注中',
    color: 'bg-brand-50 text-brand-700 ring-brand-200',
    desc: '管理员追踪后持续补采，可被用户订阅',
    page: { href: '/hot', label: '热点页' },
  },
  {
    status: 'archived',
    label: '已归档',
    color: 'bg-slate-50 text-slate-500 ring-slate-200',
    desc: '7 天无新报道，停止主动采集',
  },
] as const;

const COLLECTION_SOURCES = [
  {
    name: 'GDELT DOC',
    tag: '主数据源',
    desc: '按主题分类和区域冲突查询批量检索全球新闻',
  },
  {
    name: 'RSS 订阅',
    tag: '补充',
    desc: '按全局或单源频率拉取已启用媒体 Feed',
  },
  {
    name: 'USGS 地震',
    tag: '事件源',
    desc: '拉取公开地震数据，转成可聚类的事件文章',
  },
  {
    name: '多平台热榜',
    tag: '热榜',
    desc: '从 NewsNow 获取微博、知乎、百度等中文热榜',
  },
  {
    name: 'Valyu 新闻搜索',
    tag: '可选',
    desc: '配置 API Key 后作为区域热点的补充新闻源',
  },
  {
    name: '关注事件查询',
    tag: '定向',
    desc: '对已追踪事件用专属关键词持续补充报道',
  },
] as const;

const ROLE_CAPABILITIES = [
  {
    role: '访客',
    desc: '可以浏览热点、候选池和事件详情；首页会提示登录后订阅。',
  },
  {
    role: '登录用户',
    desc: '可以把已追踪事件加入「我的关注」，并在首页查看订阅列表和更新。',
  },
  {
    role: '管理员',
    desc: '可以晋升/归档候选、追踪热榜事件、触发采集、调整数据源和采集计划。',
  },
] as const;

const SOURCE_TIERS = [
  { tier: 'tier1', score: 1.0, label: '主流权威媒体', bar: 'w-full bg-emerald-500' },
  { tier: 'tier2', score: 0.7, label: '知名媒体', bar: 'w-[70%] bg-emerald-400' },
  { tier: 'tier3', score: 0.4, label: '一般来源', bar: 'w-[40%] bg-amber-400' },
  { tier: 'unknown', score: 0.3, label: '未分级', bar: 'w-[30%] bg-slate-300' },
] as const;

function WeightBar({ weight }: { weight: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-500 transition-all"
        style={{ width: `${weight * 100}%` }}
      />
    </div>
  );
}

export default function GuidePage() {
  return (
    <div>
      <PageHeader
        title="系统说明"
        description="用几分钟了解：新闻如何变成事件、热度怎么算、候选如何被追踪和订阅"
      />

      <GuideNav />
      <GuideTocMobile />

      <div className="lg:grid lg:grid-cols-[11rem_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <GuideToc />
          </div>
        </aside>

        <div className="min-w-0 space-y-12">
          {/* 一图看懂 */}
          <section id="overview" className="scroll-mt-24">
            <GuideCard className="bg-gradient-to-br from-brand-50/50 to-white">
              <h2 className="text-base font-semibold text-slate-900">
                一图看懂：从新闻到我的关注
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Worker 定时或手动运行采集管道，把外部新闻整理成候选事件；管理员确认追踪后，登录用户可以订阅到首页。
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={step.title} className="flex items-center gap-2 sm:gap-3">
                    {i > 0 && (
                      <span className="hidden text-slate-300 sm:inline" aria-hidden>
                        →
                      </span>
                    )}
                    {step.href ? (
                      <Link
                        href={step.href}
                        className="rounded-xl border border-brand-200/60 bg-white px-3 py-2 shadow-sm transition-colors hover:border-brand-400 hover:bg-brand-50/50 sm:px-4"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-500">{step.desc}</p>
                      </Link>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-4">
                        <p className="text-sm font-medium text-slate-900">
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-500">{step.desc}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-xs">
                <Link
                  href="/collection"
                  className="text-brand-600 hover:underline"
                >
                  查看采集记录 →
                </Link>
                <Link
                  href="/settings"
                  className="text-brand-600 hover:underline"
                >
                  调整采集频率 →
                </Link>
              </div>
            </GuideCard>
          </section>

          {/* 1. 生命周期 */}
          <GuideSection
            id="lifecycle"
            step={1}
            title="事件生命周期"
            summary="每个事件只会处于三种状态之一，决定它出现在哪个页面。"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              {EVENT_STAGES.map((stage, i) => (
                <div key={stage.status} className="flex flex-1 items-center gap-2">
                  {i > 0 && (
                    <span
                      className="hidden shrink-0 text-lg text-slate-300 sm:block"
                      aria-hidden
                    >
                      →
                    </span>
                  )}
                  <GuideCard className="flex-1">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${stage.color}`}
                    >
                      {stage.label}
                    </span>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {stage.desc}
                    </p>
                    {stage.page && (
                      <Link
                        href={stage.page.href}
                        className="mt-2 inline-block text-xs font-medium text-brand-600 hover:underline"
                      >
                        前往{stage.page.label} →
                      </Link>
                    )}
                  </GuideCard>
                </div>
              ))}
            </div>

            <GuideCallout title="聚类规则" variant="tip" className="mt-4">
              新文章若与已有事件标题足够相似（相似度 &gt; 0.35），则合并进该事件；
              否则创建新的<strong className="font-medium">候选</strong>事件。
            </GuideCallout>
          </GuideSection>

          {/* 2. 热度 */}
          <GuideSection
            id="heat"
            step={2}
            title="热度怎么算"
            summary="热度是 0–100 的综合分，用于候选池、热点和我的关注排序，不是简单的文章计数。"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {HEAT_FACTORS.map((f) => (
                <GuideCard key={f.key}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{f.name}</p>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-600">
                      {(f.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <WeightBar weight={f.weight} />
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {f.desc}
                  </p>
                </GuideCard>
              ))}
            </div>

            <GuideCallout title="算例" className="mt-4">
              某事件有 6 家媒体、近 1h 3 篇 / 近 6h 8 篇、12 小时前有更新、
              平均来源 tier 0.7、覆盖 2 国 → 热度约{' '}
              <strong className="font-semibold">52 分</strong>。
            </GuideCallout>

            <p className="mt-4 text-xs text-slate-400">
              重算时机：全量采集后、新文章并入事件时、关注事件采集后、生成每日快照时。
            </p>
          </GuideSection>

          {/* 3. 晋升 */}
          <GuideSection
            id="promote"
            step={3}
            title="候选如何进入「关注中」"
            summary="当前逻辑以人工确认为主：管理员负责追踪事件，登录用户负责订阅自己关心的事件。"
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <GuideCard className="border-brand-100 bg-brand-50/30">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    A
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">
                    管理员追踪
                  </h3>
                  <Badge variant="slate">候选池 / 热榜</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  管理员在候选池点击「加入关注」，或在热榜里点击追踪后，事件会从候选状态变为关注中，并写入后续补采关键词。
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  热度分、媒体数和近期文章量用于辅助判断，但不会绕过管理员确认。
                </p>
              </GuideCard>

              <GuideCard>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
                    B
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">
                    用户订阅
                  </h3>
                  <Badge variant="slate">登录后</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  登录用户可以把已追踪事件订阅到「我的关注」。首页默认展示个人订阅列表，管理员还可以切换查看追踪历史。
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  打开我的关注 →
                </Link>
              </GuideCard>
            </div>
          </GuideSection>

          {/* 4. 权限 */}
          <GuideSection
            id="roles"
            step={4}
            title="谁能做什么"
            summary="系统按访客、登录用户和管理员分层，写操作都需要对应身份。"
          >
            <div className="grid gap-3 lg:grid-cols-3">
              {ROLE_CAPABILITIES.map((item) => (
                <GuideCard key={item.role}>
                  <p className="text-sm font-semibold text-slate-900">{item.role}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </GuideCard>
              ))}
            </div>
          </GuideSection>

          {/* 5. 采集 */}
          <GuideSection
            id="collection"
            step={5}
            title="数据从哪来"
            summary="多种数据源由 Worker 定时或手动触发；热榜有独立任务，也可以在设置里开关。"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {COLLECTION_SOURCES.map((src) => (
                <GuideCard key={src.name}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {src.name}
                    </p>
                    <Badge variant="slate">{src.tag}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {src.desc}
                  </p>
                </GuideCard>
              ))}
            </div>

            <Link
              href="/guide/sources"
              className="mt-4 card block p-4 transition-colors hover:border-brand-500/30 hover:bg-brand-50/50"
            >
              <p className="text-sm font-medium text-slate-900">
                查看采集细节（API 参数、RSS 列表、调度策略）→
              </p>
            </Link>
          </GuideSection>

          {/* 6. 来源分级 */}
          <GuideSection
            id="sources"
            step={6}
            title="媒体可信度分级"
            summary="每条新闻关联一个媒体域名，分级影响热度中的「媒体权威」因子。"
          >
            <div className="space-y-3">
              {SOURCE_TIERS.map((row) => (
                <div
                  key={row.tier}
                  className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3"
                >
                  <div className="w-16 shrink-0">
                    <p className="font-mono text-xs text-slate-400">{row.tier}</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-900">
                      {row.score}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{row.label}</p>
                    <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${row.bar}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GuideSection>
        </div>
      </div>
    </div>
  );
}
