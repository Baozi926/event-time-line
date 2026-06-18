FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    -i https://pypi.tuna.tsinghua.edu.cn/simple -i https://pypi.tuna.tsinghua.edu.cn/simple

COPY main.py .

ENV EMBEDDING_HOST=0.0.0.0
ENV EMBEDDING_PORT=8082
ENV EMBEDDING_MODEL=BAAI/bge-m3

EXPOSE 8082

CMD ["python", "main.py"]
