# 拾光纪

拾光纪是一个热点事件聚合、追踪与订阅项目。系统通过 Worker 从 GDELT、RSS、USGS、可选 Valyu 和 NewsNow 热榜采集新闻，经入库、聚类、评分后生成候选事件；管理员确认追踪后，登录用户可以把事件订阅到「我的关注」。

## 功能概览

- 我的关注：登录用户订阅已追踪事件，首页查看关注列表和更新
- 热点与候选池：浏览热榜、候选事件和事件详情
- 管理员追踪：从候选池或热榜把事件加入追踪，也可归档事件
- 数据采集：GDELT、RSS、USGS、可选 Valyu、NewsNow 多平台热榜
- 采集管理：查看采集记录、明细、RSS 日状态、GDELT 日状态并手动触发任务
- 系统设置：配置数据源、RSS 源和采集计划
- 认证与权限：Cookie Session 登录，区分访客、登录用户和管理员

## 技术栈

- Monorepo：pnpm workspace + Turborepo
- Web：Next.js 15、React 19、Tailwind CSS
- API：Fastify、TypeScript
- Worker：BullMQ、ioredis、tsx
- 数据库：PostgreSQL 16 + pgvector
- 缓存 / 队列：Redis 7

## 当前系统逻辑

```text
外部数据源
  → Worker 采集
  → 文章入库与去重
  → 相似文章聚类为事件
  → 候选事件热度评分
  → 管理员追踪
  → 用户订阅到我的关注
```

- `candidate`：新发现事件，显示在候选池，热度分用于排序和判断优先级。
- `tracking`：管理员追踪后的事件，会生成补采关键词并持续补充报道，用户可订阅。
- `archived`：长期无更新或被管理员取消追踪的事件，不再主动补采。

权限分层：

- 访客：可浏览热点、候选池和事件详情。
- 登录用户：可订阅 / 取消订阅已追踪事件，并在首页查看「我的关注」。
- 管理员：可追踪 / 归档事件、追踪热榜条目、触发采集、修改数据源与采集计划。

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
# GDELT / USGS / 可选 Valyu
pnpm worker:run fetch

# NewsNow 多平台热榜
pnpm worker:run fetch-hot-trend

# RSS
pnpm worker:run fetch-rss

# 全部任务：GDELT/USGS/Valyu + 热榜 + RSS + 追踪补采 + 快照
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
pnpm db:patch    # 对已有数据库执行增量补丁
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需修改。常用变量包括：

- `DATABASE_URL`：PostgreSQL 连接地址
- `REDIS_URL`：Redis 连接地址
- `API_PORT`：API 服务端口
- `NEXT_PUBLIC_API_URL`：前端访问 API 的地址
- `WEB_ORIGIN`：允许携带 Cookie 访问 API 的前端源
- `SESSION_SECRET`：Cookie Session 签名密钥
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`：`pnpm db:seed` 创建的初始管理员
- `GDELT_DOC_URL`：GDELT 文档接口地址
- `VALYU_API_KEY`：可选，Valyu 新闻搜索 API Key
- `USGS_EARTHQUAKE_URL`：USGS 地震数据源地址
- `NEWSNOW_API_URL`：NewsNow 热榜接口地址；热榜启用状态和平台列表在「系统设置 → 数据源」中配置

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
