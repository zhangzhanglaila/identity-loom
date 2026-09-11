import json

from fastapi import APIRouter, HTTPException, Query, Response
from app.services.csv_importer import parse_csv_graph

from app.models.schemas import (
    GraphOverview,
    NodeCreate,
    NodeUpdate,
    RelationshipCreate,
    RelationshipUpdate,
)
from app.services.graph_service import GraphService


def build_graph_router(service: GraphService) -> APIRouter:
    router = APIRouter(prefix="/api", tags=["graph"])

    @router.get("/graph/overview", response_model=GraphOverview)
    def get_overview(limit: int = Query(default=500, ge=1, le=5000)):
        return service.store.overview(limit=limit)

    @router.get("/nodes/{node_id}")
    def get_node(node_id: str):
        node = service.store.get_node(node_id)
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        return node

    @router.get("/nodes/{node_id}/neighbors")
    def get_neighbors(node_id: str, depth: int = Query(default=1, ge=1, le=3)):
        node = service.store.get_node(node_id)
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        return service.store.neighbors(node_id, depth)

    @router.post("/nodes")
    def create_node(payload: NodeCreate):
        return service.store.upsert_node(payload.model_dump())

    @router.patch("/nodes/{node_id}")
    def patch_node(node_id: str, payload: NodeUpdate):
        updated = service.store.update_node(node_id, payload.model_dump(exclude_none=True))
        if not updated:
            raise HTTPException(status_code=404, detail="Node not found")
        return updated

    @router.delete("/nodes/{node_id}")
    def remove_node(node_id: str):
        deleted = service.store.delete_node(node_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Node not found")
        return {"deleted": deleted}

    @router.post("/relationships")
    def create_relationship(payload: RelationshipCreate):
        return service.store.upsert_relationship(payload.model_dump())

    @router.patch("/relationships/{relationship_id}")
    def patch_relationship(relationship_id: str, payload: RelationshipUpdate):
        updated = service.store.update_relationship(
            relationship_id,
            payload.model_dump(exclude_none=True),
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Relationship not found")
        return updated

    @router.delete("/relationships/{relationship_id}")
    def remove_relationship(relationship_id: str):
        deleted = service.store.delete_relationship(relationship_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Relationship not found")
        return {"deleted": deleted}

    @router.get("/search")
    def search(q: str = Query(default="", min_length=1)):
        return service.store.search_nodes(q)

    @router.get("/stats")
    def stats():
        return service.store.stats()

    @router.get("/export/json")
    def export_json():
        data = service.store.export_all()
        content = json.dumps(data, ensure_ascii=False, indent=2)
        return Response(
            content=content,
            media_type="application/json; charset=utf-8",
            headers={
                "Content-Disposition": 'attachment; filename="identity-loom-backup.json"'
            },
        )

    @router.post("/import/json")
    def import_json(payload: dict):
        nodes = payload.get("nodes", [])
        relationships = payload.get("relationships", [])
        return service.import_graph(nodes, relationships)

    @router.post("/import/csv")
    def import_csv(payload: dict):
        csv_text = payload.get("csv_text", "")
        graph = parse_csv_graph(csv_text)
        return service.import_graph(graph["nodes"], graph["relationships"])

    return router
