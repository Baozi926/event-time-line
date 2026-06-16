# 1. 启动数据库和 Redis
docker compose up -d

# 2. 安装依赖（只需第一次或 package 变更后）
pnpm install

# 3. 配置环境变量（如果还没有 .env）
Copy-Item .env.example .env

# 4. 初始化数据库
pnpm db:migrate
pnpm db:seed

# 5. 跑一轮数据采集（GDELT + RSS + USGS 地震，需要联网）
#    默认策略：GDELT 8 大分类 + 7 条区域热点 + 6 个 RSS 源 + USGS
#    GDELT 全量采集默认每 2 小时，RSS 全局默认每 1 小时（Worker 每 15 分钟检查到期）
pnpm worker:run fetch        # 仅 GDELT / USGS / 热榜
pnpm worker:run fetch-rss    # 仅 RSS（强制拉取全部已启用源）
pnpm worker:run all          # 全部任务
