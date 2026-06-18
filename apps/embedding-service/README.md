# 本地 Embedding 服务

基于 `BAAI/bge-m3` 的轻量推理服务，为事件标题生成 1024 维向量。

## 推荐：随 Docker Compose 自动启动

在项目根目录执行（与 Postgres、Redis 一起启动）：

```bash
docker compose up -d
```

首次会构建镜像并下载模型（约 2GB，已配置 Hugging Face 镜像与 pip 清华源）。  
服务地址：`http://localhost:8082`

查看状态：

```bash
docker compose ps embedding-service
docker compose logs -f embedding-service
```

## 本机 Python 启动（可选）

适合需要直接占用本机 GPU、或不想走 Docker 时：

```bash
cd apps/embedding-service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
python main.py
```

## 接口

- `GET /health` — 健康检查
- `POST /v1/embeddings` — OpenAI 兼容 embedding 接口

## GPU 说明

默认 Docker 配置在容器内用 **CPU** 推理，保证 `docker compose up` 在无 NVIDIA 容器工具链时也能启动。  
若要在容器里用 GPU，可自行在 `docker-compose.override.yml` 增加 `gpus: all`（需 Docker Desktop + WSL2 + NVIDIA 驱动）。
