# 技术选型方案

## 1. 选型原则

| 原则 | 说明 |
|------|------|
| MVP 优先 | 选择团队熟悉、生态成熟的技术 |
| 全栈 TypeScript | Web、API、App 尽量统一语言 |
| 托管优先 | 减少运维负担，快速上线 |
| 可扩展 | 数据量增长后可平滑升级 |
| 成本可控 | MVP 阶段月成本 < $100 |

---

## 2. 推荐技术栈总览

```mermaid
flowchart TB
    subgraph clients [Clients]
        Web["Web — Next.js 15"]
        App["App — Expo React Native"]
    end

    subgraph backend [Backend]
        API["API — NestJS"]
        Worker["Worker — BullMQ"]
    end

    subgraph data [Data]
        PG["PostgreSQL 16 + pgvector"]
        Redis["Redis 7"]
        S3["S3 / R2 Object Storage"]
    end

    subgraph external [External]
        GDELT[GDELT APIs]
        LLM[OpenAI / Claude API]
        Trans[DeepL / Google Translate]
    end

    Web --> API
    App --> API
    API --> PG
    API --> Redis
    Worker --> PG
    Worker --> Redis
    Worker --> GDELT
    Worker --> LLM
    Worker --> Trans
    Worker --> S3
```

---

## 3. 前端 — Web

### 3.1 框架：Next.js 15 (App Router)

| 维度 | 评估 |
|------|------|
| 版本 | Next.js 15 + React 19 |
| 理由 | SSR/SSG 利于 SEO；App Router 生态成熟；Vercel 部署简单 |
| 替代 | Nuxt 3（Vue 团队）、Remix |

### 3.2 UI 与样式

| 技术 | 用途 |
|------|------|
| Tailwind CSS 4 | 原子化样式 |
| shadcn/ui | 基础组件（Button、Card、Dialog） |
| Framer Motion | 时间线动画 |
| MapLibre GL JS | 全球热点地图 |

### 3.3 状态与数据

| 技术 | 用途 |
|------|------|
| TanStack Query | 服务端状态管理、缓存 |
| Zustand | 客户端轻量状态 |
| nuqs | URL 搜索参数同步 |

### 3.4 目录结构

```
apps/web/
├── app/
│   ├── (main)/
│   │   ├── page.tsx              # 首页
│   │   ├── events/
│   │   │   └── [slug]/page.tsx   # 事件详情
│   │   ├── search/page.tsx       # 搜索
│   │   └── topics/[slug]/page.tsx
│   ├── api/                      # BFF 路由（可选）
│   └── layout.tsx
├── components/
│   ├── event-card.tsx
│   ├── timeline.tsx
│   ├── heat-map.tsx
│   └── search-bar.tsx
├── lib/
│   ├── api.ts
│   └── utils.ts
└── package.json
```

---

## 4. 移动端 — App

### 4.1 框架：Expo (React Native)

| 维度 | 评估 |
|------|------|
| 版本 | Expo SDK 52+ |
| 理由 | 与 Web 共享 React 生态；Expo Router 文件路由；OTA 更新 |
| 替代 | Flutter（性能好但双栈）、Capacitor（Web 套壳） |

### 4.2 关键库

| 库 | 用途 |
|----|------|
| Expo Router | 文件路由 |
| TanStack Query | 数据获取（与 Web 共享） |
| React Native Reanimated | 动画 |
| react-native-maps | 地图展示 |
| expo-notifications | 推送通知（V2） |

### 4.3 代码共享策略

```
packages/
├── shared/           # 共享类型、API client、工具函数
│   ├── types/
│   ├── api/
│   └── utils/
├── ui/               # 跨端 UI 组件（可选）
apps/
├── web/
└── mobile/
```

---

## 5. 后端 API

### 5.1 框架：NestJS

| 维度 | 评估 |
|------|------|
| 版本 | NestJS 11 |
| 理由 | TypeScript 原生；模块化；装饰器风格；生态丰富 |
| 替代 | Fastify 裸写（轻量）、Hono（边缘）、Go Gin（性能） |

### 5.2 关键模块

```
apps/api/
├── src/
│   ├── events/
│   │   ├── events.controller.ts
│   │   ├── events.service.ts
│   │   └── events.module.ts
│   ├── articles/
│   ├── timeline/
│   ├── search/
│   ├── subscriptions/
│   ├── auth/
│   └── common/
│       ├── filters/
│       ├── interceptors/
│       └── guards/
├── prisma/               # 或 Drizzle
│   └── schema.prisma
└── package.json
```

### 5.3 API 规范

| 项目 | 选择 |
|------|------|
| 协议 | REST（MVP）；GraphQL（V2 按需） |
| 文档 | Swagger / OpenAPI 3.1 |
| 版本 | `/api/v1/` 前缀 |
| 认证 | JWT（订阅功能）；公开浏览无需登录 |
| 限流 | Redis + sliding window |

---

## 6. 数据管道（Worker）

### 6.1 任务队列：BullMQ

| 维度 | 评估 |
|------|------|
| 理由 | Redis 原生；延迟任务；重试/死信；NestJS 集成好 |
| 替代 | Celery（Python 栈）、Inngest（Serverless） |

### 6.2 Worker 结构

```
apps/worker/
├── src/
│   ├── fetchers/
│   │   ├── gdelt-doc.fetcher.ts
│   │   ├── gdelt-events.fetcher.ts
│   │   └── rss.fetcher.ts
│   ├── processors/
│   │   ├── normalize.processor.ts
│   │   ├── cluster.processor.ts
│   │   ├── summarize.processor.ts
│   │   └── timeline.processor.ts
│   ├── schedulers/
│   │   └── cron.service.ts
│   └── main.ts
└── package.json
```

### 6.3 调度

| 技术 | 用途 |
|------|------|
| BullMQ Repeatable Jobs | 定时采集 |
| node-cron | 备用调度 |

---

## 7. 数据库

### 7.1 主库：PostgreSQL 16

| 维度 | 评估 |
|------|------|
| 理由 | 关系型 + JSONB + 全文搜索 + pgvector 一体化 |
| 托管 | Supabase / Neon / Railway |

### 7.2 扩展

| 扩展 | 用途 |
|------|------|
| pgvector | 事件/文章 embedding 存储与相似度搜索 |
| pg_trgm | 模糊搜索 |
| TimescaleDB（可选） | 时序数据（热度历史） |

### 7.3 ORM：Prisma

| 维度 | 评估 |
|------|------|
| 理由 | 类型安全；迁移管理；生态成熟 |
| 替代 | Drizzle（更轻量）、TypeORM |

### 7.4 缓存：Redis 7

| 用途 | TTL |
|------|-----|
| 首页事件列表 | 5 min |
| 事件详情 | 2 min |
| 搜索结果 | 10 min |
| 热度排行 | 5 min |
| 会话 / JWT 黑名单 | 按需 |

---

## 8. 外部服务

### 8.1 LLM（摘要 + 时间线）

| 服务 | 模型 | 预估成本 |
|------|------|----------|
| OpenAI | gpt-4o-mini | ~$5-20/月（MVP） |
| Anthropic | claude-3-5-haiku | 备选 |
| 本地 | Ollama + Qwen | 免费但质量参差 |

**推荐：** gpt-4o-mini 用于摘要和时间线生成，成本低、质量好。

### 8.2 Embedding

| 服务 | 模型 | 用途 |
|------|------|------|
| OpenAI | text-embedding-3-small | 文章/事件聚类 |
| 本地 | multilingual-e5-small | 降本备选 |

### 8.3 翻译

| 服务 | 用途 | 成本 |
|------|------|------|
| DeepL API | 标题/摘要翻译 | 免费 50万字符/月 |
| Google Cloud Translation | 备选 | 按量 |

### 8.4 对象存储

| 服务 | 用途 |
|------|------|
| Cloudflare R2 | 媒体 Logo 缓存、封面图 |
| 替代：AWS S3 / MinIO | |

---

## 9. 部署架构

### 9.1 MVP 部署方案

```mermaid
flowchart LR
    subgraph vercel [Vercel]
        Web[Next.js_Web]
    end

    subgraph railway [Railway_or_Flyio]
        API[NestJS_API]
        Worker[BullMQ_Worker]
    end

    subgraph managed [Managed_Services]
        Neon[Neon_PostgreSQL]
        Upstash[Upstash_Redis]
        R2[Cloudflare_R2]
    end

    subgraph external [External]
        OpenAI[OpenAI_API]
        GDELT[GDELT_API]
    end

    Web --> API
    API --> Neon
    API --> Upstash
    Worker --> Neon
    Worker --> Upstash
    Worker --> OpenAI
    Worker --> GDELT
    Worker --> R2
```

### 9.2 各服务选型

| 组件 | 服务 | 月成本估算 |
|------|------|-----------|
| Web | Vercel Free / Pro | $0–20 |
| API + Worker | Railway / Fly.io | $5–15 |
| PostgreSQL | Neon Free / Pro | $0–19 |
| Redis | Upstash Free | $0 |
| R2 存储 | Cloudflare R2 | $0 |
| OpenAI | 按量 | $5–20 |
| DeepL | Free tier | $0 |
| **合计** | | **$5–75/月** |

### 9.3 CI/CD

| 工具 | 用途 |
|------|------|
| GitHub Actions | 测试、构建、部署 |
| Turborepo | Monorepo 构建缓存 |
| Docker | Worker 容器化 |

---

## 10. Monorepo 结构

```
event-time-line/
├── apps/
│   ├── web/                 # Next.js 前端
│   ├── mobile/              # Expo App
│   ├── api/                 # NestJS API
│   └── worker/              # 数据管道 Worker
├── packages/
│   ├── shared/              # 共享类型、常量、工具
│   ├── database/            # Prisma schema + migrations
│   └── tsconfig/            # 共享 TS 配置
├── docs/                    # 需求与设计文档
├── docker-compose.yml       # 本地开发环境
├── turbo.json
├── package.json
└── README.md
```

---

## 11. 开发环境

### 11.1 本地依赖

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: event_timeline
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### 11.2 环境变量

```env
# .env.example
DATABASE_URL=postgresql://dev:dev@localhost:5432/event_timeline
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
DEEPL_API_KEY=...
JWT_SECRET=...
GDELT_DOC_URL=https://api.gdeltproject.org/api/v2/doc/doc
```

---

## 12. 技术选型对比总结

### 12.1 为什么选择这套栈

| 决策 | 选择 | 原因 |
|------|------|------|
| 语言 | TypeScript 全栈 | 代码共享、类型安全、人才好找 |
| Web | Next.js | SEO 必须、生态最大 |
| App | Expo | 与 Web 技术栈统一、开发效率高 |
| API | NestJS | 结构化、适合中大型项目 |
| 数据库 | PostgreSQL + pgvector | 一库搞定关系+向量+搜索 |
| 队列 | BullMQ | 轻量、可靠、NestJS 集成好 |
| 部署 | Vercel + Railway | 零运维、成本低 |

### 12.2 不选什么 & 为什么

| 技术 | 不选原因 |
|------|----------|
| Python (Django/FastAPI) | 与前端双栈，增加协作成本 |
| MongoDB | 关系查询多，PostgreSQL 更合适 |
| Elasticsearch | MVP 阶段 pg_trgm + pgvector 够用 |
| Kubernetes | MVP 过度工程 |
| GraphQL | REST 足够简单，V2 按需引入 |
| 微服务 | 单体 + Worker 足够 MVP |

---

## 13. 技术风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| pgvector 性能 | 向量搜索慢 | 限制维度 1536；加 IVFFlat 索引 |
| LLM 成本超预期 | 预算超支 | 缓存摘要；批量处理；设月度上限 |
| Expo 地图性能 | 大量标记卡顿 | 聚合显示；按缩放级别加载 |
| Neon 冷启动 | API 首次请求慢 | 用连接池（Prisma Accelerate） |
| BullMQ 单点 | Worker 宕机丢任务 | Redis 持久化 + 任务重试 |

---

## 14. 下一步行动

1. 初始化 Monorepo（Turborepo + pnpm）
2. 创建 Prisma schema（基于 data-model.md）
3. 搭建 docker-compose 本地环境
4. 实现 GDELT DOC fetcher（第一个数据管道）
5. 搭建 Next.js 首页骨架
6. 实现事件列表 API
