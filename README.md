# Event Timeline — 热点事件历史

自动聚合全球热点事件，生成结构化发展时间线，帮用户快速理解事件来龙去脉。

## 产品定位

- **目标用户**：普通大众读者
- **核心价值**：用 1–3 分钟看懂一个全球热点事件的完整脉络
- **平台**：Web + App
- **数据策略**：GDELT + RSS 自动聚合，AI 生成摘要与时间线

## 文档目录

| 文档 | 说明 |
|------|------|
| [PRD](docs/PRD.md) | 产品需求文档：用户故事、功能范围、验收标准 |
| [数据模型](docs/data-model.md) | 核心实体设计、关系、热度算法、聚类策略 |
| [数据源评估](docs/data-sources-evaluation.md) | GDELT、RSS、Wikidata 等数据源能力与版权分析 |
| [MVP 数据流](docs/mvp-flow.md) | 采集→聚类→摘要→时间线→排序完整管道设计 |
| [技术选型](docs/tech-stack.md) | 前后端、数据库、部署方案 |

## 技术栈（规划）

| 层 | 技术 |
|----|------|
| Web | Next.js 15 + Tailwind + shadcn/ui |
| App | Expo (React Native) |
| API | NestJS + Prisma |
| Worker | BullMQ 数据管道 |
| 数据库 | PostgreSQL 16 + pgvector |
| 缓存 | Redis 7 |
| LLM | OpenAI gpt-4o-mini |
| 部署 | Vercel + Railway + Neon |

## 项目结构（规划）

```
event-time-line/
├── apps/
│   ├── web/                 # Next.js 前端
│   ├── mobile/              # Expo App
│   ├── api/                 # NestJS API
│   └── worker/              # 数据管道
├── packages/
│   ├── shared/              # 共享类型与工具
│   └── database/            # SQL Schema
├── docs/                    # 需求与设计文档
└── README.md
```

## MVP 里程碑

| 阶段 | 周期 | 交付 |
|------|------|------|
| M0 需求与设计 | 1 周 | PRD、数据模型、技术选型 ✅ |
| M1 数据管道 | 2 周 | GDELT 采集、聚类、摘要 |
| M2 Web MVP | 2 周 | 首页、详情、搜索 |
| M3 App + 订阅 | 2 周 | 移动端、通知 |
| M4 优化上线 | 1 周 | 性能、合规、灰度 |

## 快速开始

```bash
# 1. 启动 PostgreSQL + Redis
docker compose up -d

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env

# 4. 数据库迁移与种子数据
pnpm db:migrate
pnpm db:seed

# 5. 运行一次数据采集（GDELT + RSS）
pnpm worker:run

# 6. 启动 API 与 Web（分别开终端）
pnpm --filter @event-time-line/api dev
pnpm --filter @event-time-line/web dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/docs

### 后台 Worker（定时任务）

```bash
pnpm --filter @event-time-line/worker dev
```

## License

Private — All rights reserved.
