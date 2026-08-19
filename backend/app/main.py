import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.graph import build_graph_router
from app.config import get_settings
from app.db.neo4j import Neo4jStore
from app.services.graph_service import GraphService
from app.services.private_loader import load_private_data


settings = get_settings()
store = Neo4jStore()
for attempt in range(30):
    try:
        store.ensure_schema()
        break
    except Exception:
        if attempt == 29:
            raise
        time.sleep(2)
service = GraphService(store)

try:
    load_private_data(store, settings.private_data_dir)
except Exception:
    # 私有数据加载失败不应阻断服务启动
    pass

app = FastAPI(title="Identity Web API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(build_graph_router(service))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("shutdown")
def shutdown_event():
    store.close()
