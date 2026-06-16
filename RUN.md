# 1. 启动数据库和 Redis
docker compose up -d

# 2. 安装依赖（只需第一次或 package 变更后）
pnpm install

# 3. 配置环境变量（如果还没有 .env）
Copy-Item .env.example .env

# 4. 初始化数据库
pnpm db:migrate
pnpm db:seed

# 5. 跑一轮数据采集（需要联网）
#    fetch：GDELT 主题/区域查询 + USGS 地震 + 可选 Valyu
#    fetch-hot-trend：NewsNow 多平台热榜（是否启用、平台列表在系统设置 → 数据源配置）
#    fetch-rss：RSS（强制拉取全部已启用源）
#    默认调度：GDELT/USGS/Valyu 每 2 小时，热榜每 1 小时，RSS 全局默认每 1 小时
#    Worker 每 15 分钟检查 RSS 到期；追踪补采默认 12 小时，每日快照默认 24 小时
pnpm worker:run fetch
pnpm worker:run fetch-hot-trend
pnpm worker:run fetch-rss
pnpm worker:run all          # 全部任务：fetch + 热榜 + RSS + 追踪补采 + 快照
