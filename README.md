# Event Timeline

Event Timeline 是一个热点事件聚合与时间线项目。它通过 GDELT、RSS、USGS 等数据源采集新闻和事件数据，经过后台 Worker 处理后，在 Web 端展示事件、候选文章、采集记录和数据源配置。

## 功能概览

- 热点事件列表与事件详情
- 候选文章管理与事件关联
- GDELT、RSS、USGS 等数据采集
- 采集任务记录与文章明细查看
- RSS 源和采集计划配置
- 后台 Worker 定时或手动执行数据管道

## 技术栈

- Monorepo：pnpm workspace + Turborepo
- Web：Next.js 15、React 19、Tailwind CSS
- API：Fastify、TypeScript
- Worker：BullMQ、ioredis、tsx
- 数据库：PostgreSQL 16 + pgvector
- 缓存 / 队列：Redis 7

## 项目结构

```text
event-time-line/
├── apps/
│   ├── web/        # Next.js 前端
│   ├── api/        # Fastify API 服务
│   └── worker/     # 数据采集与处理任务
├── packages/
│   ├── database/   # 数据库连接、迁移和种子数据
│   └── shared/     # 共享类型与工具
├── docs/           # 产品、数据模型和技术文档
├── docker-compose.yml
└── README.md
```

## 本地运行

### 环境要求

- Node.js >= 20
- pnpm 9.x
- Docker / Docker Compose

### 启动步骤

```powershell
# 1. 启动 PostgreSQL 和 Redis
docker compose up -d

# 2. 安装依赖
pnpm install

# 3. 创建本地环境变量
Copy-Item .env.example .env

# 4. 初始化数据库
pnpm db:migrate
pnpm db:seed

# 5. 启动 Web、API、Worker 开发服务
pnpm dev
```

启动后默认访问：

- Web：http://localhost:3000
- API：http://localhost:3001
- API 文档：http://localhost:3001/docs

## 数据采集

可以手动运行一轮采集任务：

```powershell
# GDELT / USGS / 热榜
pnpm worker:run fetch

# RSS
pnpm worker:run fetch-rss

# 全部任务
pnpm worker:run all
```

如果只想启动后台 Worker：

```powershell
pnpm --filter @event-time-line/worker dev
```

## 常用命令

```powershell
pnpm dev         # 启动所有开发服务
pnpm build       # 构建所有包和应用
pnpm lint        # 运行 lint
pnpm db:migrate  # 执行数据库迁移
pnpm db:seed     # 写入种子数据
pnpm worker:run  # 手动运行 Worker 任务
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改。常用变量包括：

- `DATABASE_URL`：PostgreSQL 连接地址
- `REDIS_URL`：Redis 连接地址
- `API_PORT`：API 服务端口
- `NEXT_PUBLIC_API_URL`：前端访问 API 的地址
- `GDELT_DOC_URL`：GDELT 文档接口地址
- `VALYU_API_KEY`：可选，Valyu 新闻搜索 API Key
- `USGS_EARTHQUAKE_URL`：USGS 地震数据源地址

## 相关文档

- [PRD](docs/PRD.md)
- [数据模型](docs/data-model.md)
- [筛选维度](docs/filter-dimensions.md)
- [数据采集](docs/data-collection.md)
- [数据源评估](docs/data-sources-evaluation.md)
- [MVP 数据流](docs/mvp-flow.md)
- [技术选型](docs/tech-stack.md)

## License

Private - All rights reserved.
