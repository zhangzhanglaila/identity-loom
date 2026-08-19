import json
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from neo4j import GraphDatabase

from app.config import get_settings


class Neo4jStore:
    def __init__(self) -> None:
        settings = get_settings()
        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        self.database = settings.neo4j_database

    def close(self) -> None:
        self._driver.close()

    @contextmanager
    def session(self):
        with self._driver.session(database=self.database) as session:
            yield session

    def ensure_schema(self) -> None:
        statements = [
            "CREATE CONSTRAINT graph_node_id IF NOT EXISTS FOR (n:GraphNode) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT graph_rel_id IF NOT EXISTS FOR ()-[r:LINK]-() REQUIRE r.id IS UNIQUE",
            "CREATE INDEX graph_node_kind IF NOT EXISTS FOR (n:GraphNode) ON (n.kind)",
            "CREATE INDEX graph_node_name IF NOT EXISTS FOR (n:GraphNode) ON (n.name)",
        ]
        with self.session() as session:
            for statement in statements:
                session.run(statement)

    def upsert_node(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        payload = dict(payload)
        if isinstance(payload.get("extra"), dict):
            payload["extra"] = json.dumps(payload["extra"], ensure_ascii=False)
        with self.session() as session:
            record = session.run(
                """
                MERGE (n:GraphNode {id: $id})
                ON CREATE SET n.created_at = timestamp()
                SET n.kind = $kind,
                    n.name = $name,
                    n.display_name = $display_name,
                    n.platform = $platform,
                    n.username = $username,
                    n.nickname = $nickname,
                    n.email = $email,
                    n.phone = $phone,
                    n.uid = $uid,
                    n.url = $url,
                    n.status = $status,
                    n.notes = $notes,
                    n.tags = $tags,
                    n.extra = $extra,
                    n.updated_at = timestamp()
                RETURN n
                """,
                payload,
            ).single()
            return dict(record["n"]) if record else payload

    def update_node(self, node_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not payload:
            return self.get_node(node_id)
        assignments = ", ".join([f"n.{key} = ${key}" for key in payload.keys()])
        query = f"""
            MATCH (n:GraphNode {{id: $id}})
            SET {assignments},
                n.updated_at = timestamp()
            RETURN n
        """
        params = {"id": node_id, **payload}
        with self.session() as session:
            record = session.run(query, params).single()
            return dict(record["n"]) if record else None

    def delete_node(self, node_id: str) -> int:
        with self.session() as session:
            result = session.run(
                """
                MATCH (n:GraphNode {id: $id})
                WITH n
                DETACH DELETE n
                RETURN 1 AS deleted
                """,
                {"id": node_id},
            ).single()
            return int(result["deleted"]) if result else 0

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        with self.session() as session:
            record = session.run(
                "MATCH (n:GraphNode {id: $id}) RETURN n",
                {"id": node_id},
            ).single()
            return dict(record["n"]) if record else None

    def search_nodes(self, query: str) -> List[Dict[str, Any]]:
        with self.session() as session:
            result = session.run(
                """
                MATCH (n:GraphNode)
                WHERE toLower(coalesce(n.name, '')) CONTAINS toLower($query)
                   OR toLower(coalesce(n.display_name, '')) CONTAINS toLower($query)
                   OR toLower(coalesce(n.username, '')) CONTAINS toLower($query)
                   OR toLower(coalesce(n.email, '')) CONTAINS toLower($query)
                   OR toLower(coalesce(n.phone, '')) CONTAINS toLower($query)
                RETURN n
                ORDER BY n.name
                LIMIT 50
                """,
                {"query": query},
            )
            return [dict(row["n"]) for row in result]

    def upsert_relationship(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        payload = dict(payload)
        if isinstance(payload.get("extra"), dict):
            payload["extra"] = json.dumps(payload["extra"], ensure_ascii=False)
        with self.session() as session:
            record = session.run(
                """
                MATCH (source:GraphNode {id: $source})
                MATCH (target:GraphNode {id: $target})
                MERGE (source)-[r:LINK {id: $id}]->(target)
                ON CREATE SET r.created_at = timestamp()
                SET r.relation_type = $relation_type,
                    r.label = $label,
                    r.status = $status,
                    r.notes = $notes,
                    r.extra = $extra,
                    r.updated_at = timestamp()
                RETURN r
                """,
                payload,
            ).single()
            return dict(record["r"]) if record else payload

    def update_relationship(self, rel_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not payload:
            with self.session() as session:
                record = session.run(
                    "MATCH ()-[r:LINK {id: $id}]-() RETURN r",
                    {"id": rel_id},
                ).single()
                return dict(record["r"]) if record else None
        assignments = ", ".join([f"r.{key} = ${key}" for key in payload.keys()])
        query = f"""
            MATCH ()-[r:LINK {{id: $id}}]-()
            SET {assignments},
                r.updated_at = timestamp()
            RETURN r
        """
        params = {"id": rel_id, **payload}
        with self.session() as session:
            record = session.run(query, params).single()
            return dict(record["r"]) if record else None

    def delete_relationship(self, rel_id: str) -> int:
        with self.session() as session:
            result = session.run(
                """
                MATCH ()-[r:LINK {id: $id}]-()
                WITH r
                DELETE r
                RETURN 1 AS deleted
                """,
                {"id": rel_id},
            ).single()
            return int(result["deleted"]) if result else 0

    def overview(self, limit: int = 500) -> Dict[str, List[Dict[str, Any]]]:
        with self.session() as session:
            records = session.run(
                """
                MATCH (a:GraphNode)-[r:LINK]->(b:GraphNode)
                RETURN a, r, b
                LIMIT $limit
                """,
                {"limit": limit},
            )
            nodes: Dict[str, Dict[str, Any]] = {}
            rels: List[Dict[str, Any]] = []
            for row in records:
                a = dict(row["a"])
                b = dict(row["b"])
                r = dict(row["r"])
                nodes[a["id"]] = a
                nodes[b["id"]] = b
                rels.append(
                    {
                        "id": r.get("id"),
                        "source": a.get("id"),
                        "target": b.get("id"),
                        "relation_type": r.get("relation_type"),
                        "label": r.get("label"),
                        "status": r.get("status"),
                        "notes": r.get("notes"),
                        "extra": r.get("extra", {}),
                    }
                )
            return {"nodes": list(nodes.values()), "relationships": rels}

    def neighbors(self, node_id: str, depth: int = 1) -> Dict[str, List[Dict[str, Any]]]:
        depth = max(1, min(depth, 3))
        depth_clause = f"*1..{depth}"
        query = """
                MATCH (start:GraphNode {id: $id})
                CALL {
                    WITH start
                    MATCH p=(start)-[r:LINKDEPTH_CLAUSE]-(other:GraphNode)
                    RETURN p
                }
                UNWIND relationships(p) AS r
                UNWIND nodes(p) AS n
                WITH collect(DISTINCT n) AS nodes, collect(DISTINCT r) AS rels
                RETURN nodes, rels
                """.replace("LINKDEPTH_CLAUSE", f"LINK{depth_clause}")
        with self.session() as session:
            records = session.run(
                query,
                {"id": node_id},
            ).single()
            if not records:
                return {"nodes": [], "relationships": []}
            nodes = [dict(n) for n in records["nodes"]]
            relationships = [
                {
                    "id": rel.get("id"),
                    "source": rel.start_node["id"],
                    "target": rel.end_node["id"],
                    "relation_type": rel.get("relation_type"),
                    "label": rel.get("label"),
                    "status": rel.get("status"),
                    "notes": rel.get("notes"),
                    "extra": rel.get("extra", {}),
                }
                for rel in records["rels"]
            ]
            return {"nodes": nodes, "relationships": relationships}

    def stats(self) -> Dict[str, int]:
        with self.session() as session:
            record = session.run(
                """
                MATCH (n:GraphNode)
                OPTIONAL MATCH ()-[r:LINK]-()
                RETURN count(DISTINCT n) AS nodes, count(DISTINCT r) AS relationships
                """
            ).single()
            return {
                "nodes": int(record["nodes"]) if record else 0,
                "relationships": int(record["relationships"]) if record else 0,
            }
