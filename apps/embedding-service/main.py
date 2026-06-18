"""Local embedding service using BAAI/bge-m3 (1024 dimensions)."""

from __future__ import annotations

import os
from typing import List, Union

import torch
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv('EMBEDDING_MODEL', 'BAAI/bge-m3')
HOST = os.getenv('EMBEDDING_HOST', '0.0.0.0')
PORT = int(os.getenv('EMBEDDING_PORT', '8082'))

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f'[embedding-service] loading {MODEL_NAME} on {device}...')
model = SentenceTransformer(MODEL_NAME, device=device)
print('[embedding-service] model ready')

app = FastAPI(title='Event Timeline Embedding Service')


class EmbeddingRequest(BaseModel):
    input: Union[str, List[str]]
    model: str = Field(default='bge-m3')
    dimensions: int | None = Field(default=1024)


class EmbeddingDataItem(BaseModel):
    object: str = 'embedding'
    embedding: List[float]
    index: int


class EmbeddingResponse(BaseModel):
    object: str = 'list'
    data: List[EmbeddingDataItem]
    model: str
    usage: dict


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'model': MODEL_NAME, 'device': device}


@app.post('/v1/embeddings', response_model=EmbeddingResponse)
def create_embeddings(req: EmbeddingRequest) -> EmbeddingResponse:
    texts = [req.input] if isinstance(req.input, str) else req.input
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    data = [
        EmbeddingDataItem(embedding=vector.tolist(), index=index)
        for index, vector in enumerate(vectors)
    ]

    return EmbeddingResponse(
        data=data,
        model=req.model,
        usage={'prompt_tokens': sum(len(text.split()) for text in texts), 'total_tokens': 0},
    )


if __name__ == '__main__':
    uvicorn.run('main:app', host=HOST, port=PORT, reload=False)
