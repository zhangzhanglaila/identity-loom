"""从私有目录加载本地身份图数据（目录本身不应被 git 跟踪）。"""
import json
from pathlib import Path
from typing import Any, Dict, Tuple

from app.services.csv_importer import parse_csv_graph
from app.services.graph_service import GraphService


def _load_json(path: Path) -> Tuple[list, list]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload.get("nodes", []), payload.get("relationships", [])


def _load_csv(path: Path) -> Tuple[list, list]:
    graph = parse_csv_graph(path.read_text(encoding="utf-8"))
    return graph["nodes"], graph["relationships"]


def load_private_data(store: Any, directory: str) -> Dict[str, int]:
    """扫描 directory 下的 .json / .csv 文件并 upsert 到图数据库。

    幂等：重复启动只会 MERGE，不会产生重复数据。
    任何单文件解析失败都会被跳过，不影响整体启动。
    """
    path = Path(directory)
    loaded = {"nodes": 0, "relationships": 0}
    if not path.is_dir():
        return loaded

    service = GraphService(store)
    for file in sorted(path.glob("*")):
        try:
            if file.suffix.lower() == ".json":
                nodes, relationships = _load_json(file)
            elif file.suffix.lower() == ".csv":
                nodes, relationships = _load_csv(file)
            else:
                continue
        except Exception:
            continue

        if nodes or relationships:
            result = service.import_graph(nodes, relationships)
            loaded["nodes"] += result.get("nodes", 0)
            loaded["relationships"] += result.get("relationships", 0)

    return loaded
