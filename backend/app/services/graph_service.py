from typing import Any, Dict, List

from app.db.neo4j import Neo4jStore


class GraphService:
    def __init__(self, store: Neo4jStore) -> None:
        self.store = store

    @staticmethod
    def normalize_node(payload: Dict[str, Any]) -> Dict[str, Any]:
        node = {
            "id": payload["id"],
            "kind": payload["kind"],
            "name": payload["name"],
            "display_name": payload.get("display_name"),
            "platform": payload.get("platform"),
            "username": payload.get("username"),
            "nickname": payload.get("nickname"),
            "email": payload.get("email"),
            "phone": payload.get("phone"),
            "uid": payload.get("uid"),
            "url": payload.get("url"),
            "status": payload.get("status"),
            "notes": payload.get("notes"),
            "tags": payload.get("tags", []),
            "extra": payload.get("extra", {}),
        }
        return node

    @staticmethod
    def normalize_relationship(payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": payload["id"],
            "source": payload["source"],
            "target": payload["target"],
            "relation_type": payload["relation_type"],
            "label": payload.get("label") or payload["relation_type"],
            "status": payload.get("status"),
            "notes": payload.get("notes"),
            "extra": payload.get("extra", {}),
        }

    def import_graph(self, nodes: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> Dict[str, int]:
        node_count = 0
        rel_count = 0
        for node in nodes:
            self.store.upsert_node(self.normalize_node(node))
            node_count += 1
        for rel in relationships:
            self.store.upsert_relationship(self.normalize_relationship(rel))
            rel_count += 1
        return {"nodes": node_count, "relationships": rel_count}

