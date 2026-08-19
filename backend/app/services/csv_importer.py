from csv import DictReader
from io import StringIO
from typing import Any, Dict, List


def parse_csv_graph(csv_text: str) -> Dict[str, List[Dict[str, Any]]]:
    nodes: List[Dict[str, Any]] = []
    relationships: List[Dict[str, Any]] = []
    reader = DictReader(StringIO(csv_text.strip()))
    for row in reader:
        record_type = (row.get("record_type") or "").strip().lower()
        if record_type == "node":
            node = {key: value for key, value in row.items() if value not in (None, "")}
            node.pop("record_type", None)
            tags = node.get("tags")
            if isinstance(tags, str) and tags:
                node["tags"] = [item.strip() for item in tags.split("|") if item.strip()]
            nodes.append(node)
        elif record_type == "relationship":
            rel = {key: value for key, value in row.items() if value not in (None, "")}
            rel.pop("record_type", None)
            relationships.append(rel)
    return {"nodes": nodes, "relationships": relationships}

