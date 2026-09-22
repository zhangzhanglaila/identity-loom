"""自然语言导入编排：抽取 → 对齐 → 待确认清单；确认后写库。

流程（与 GraphRAG 的关键区别）：
- LLM 只负责"预填"，从不直接写库；
- 对齐复用图谱已有节点与别名信息；
- 返回"待确认变更清单"，人工在 UI 确认/修正后才 upsert 到 Neo4j；
- 本地模型不可用时自动降级到规则抽取，精度较低但流程可走通。
"""
from typing import Any, Dict, List

from app.services.entity_aligner import EntityAligner
from app.services.graph_service import GraphService
from app.services.local_llm import LocalLLMClient, LocalLLMError
from app.services.nl_extractor import (
    VALID_KINDS,
    VALID_REL_TYPES,
    build_messages,
    parse_extraction,
    rule_extract,
)


class LLMImportService:
    def __init__(self, store: Any) -> None:
        self.store = store
        self.llm = LocalLLMClient()  # 非本机地址会抛 LocalLLMError

    # -- 图快照（对齐用，只读） -------------------------------------------------
    def _snapshot(self) -> Dict[str, List[Dict[str, Any]]]:
        return self.store.export_all()

    # -- 状态 ----------------------------------------------------------------
    def status(self) -> Dict[str, Any]:
        info = self.llm.available()
        return {
            "available": info["available"],
            "model": info["model"],
            "base_url": self.llm.base_url,
            "models": info.get("models", []),
            "reason": info.get("reason", ""),
        }

    # -- 抽取 + 对齐（不写库） --------------------------------------------------
    def extract(self, text: str) -> Dict[str, Any]:
        if not text or not text.strip():
            return {
                "source": "rule",
                "model": None,
                "nodes": [],
                "relationships": [],
                "warnings": ["输入为空"],
            }
        warnings: List[str] = []
        raw, source, model = None, "rule", None

        try:
            content = self.llm.chat(build_messages(text))
            raw = parse_extraction(content)
            if raw.get("parse_error"):
                warnings.append("本地模型输出无法解析为 JSON，已回退到规则解析")
            else:
                source, model = "llm", self.llm.model
        except LocalLLMError as exc:
            warnings.append(f"本地模型不可用（{exc}），已回退到规则解析")
        except Exception as exc:  # 解析层以外的异常也走兜底，不让抽取流程中断
            warnings.append(f"模型调用异常（{exc}），已回退到规则解析")

        if raw is None or raw.get("parse_error"):
            raw = rule_extract(text)
            source = "rule"

        snapshot = self._snapshot()
        aligner = EntityAligner(snapshot.get("nodes", []))
        aligned = aligner.align_extraction(raw, snapshot.get("relationships", []))

        nodes = [
            {
                **ae["node"],
                "align_status": ae["status"],
                "matched_node_id": ae["matched_node_id"],
                "confidence": ae["confidence"],
                "reason": ae["reason"],
                "mentions": ae["mentions"],
            }
            for ae in aligned["entities"]
        ]
        return {
            "source": source,
            "model": model,
            "nodes": nodes,
            "relationships": aligned["relationships"],
            "warnings": warnings + raw.get("uncertainties", []),
        }

    # -- 确认后写库（只 upsert 用户勾选确认的变更） --------------------------------
    def apply(self, nodes: List[Dict[str, Any]], relationships: List[Dict[str, Any]]) -> Dict[str, int]:
        """人工确认后的写库通道。

        - 校验节点必填字段与合法 kind / relation_type，非法输入抛 ValueError（API 转 400）；
        - 关系 id 按 源->类型->目标 规范化，端点必须"本次提交或图谱已存在"，
          否则跳过（避免 MATCH 失败导致静默丢关系还照计数）；
        - 同批重复关系只写一次。
        """
        clean_nodes: List[Dict[str, Any]] = []
        for raw_node in nodes or []:
            node = dict(raw_node)
            nid = str(node.get("id") or "").strip()
            kind = str(node.get("kind") or "").strip().lower()
            name = str(node.get("name") or "").strip()
            if not nid or not kind or not name:
                raise ValueError(f"节点缺少必填字段 id/kind/name：{node.get('id') or node}")
            if kind not in VALID_KINDS:
                raise ValueError(f"非法节点类型 {kind}（节点 {nid}）")
            node["id"], node["kind"], node["name"] = nid, kind, name
            clean_nodes.append(node)

        service = GraphService(self.store)
        node_ids = {node["id"] for node in clean_nodes}

        def endpoint_exists(node_id: str) -> bool:
            # 本次提交即视为存在（节点会先于关系写入）；否则必须图谱里已有
            if node_id in node_ids:
                return True
            return service.store.get_node(node_id) is not None

        # 阶段一：全部校验通过后再写库，避免中途失败留下半批数据
        clean_rels: List[Dict[str, Any]] = []
        seen_keys: set = set()
        skipped = 0
        for raw_rel in relationships or []:
            rel = dict(raw_rel)
            src = str(rel.get("source") or "").strip()
            tgt = str(rel.get("target") or "").strip()
            rtype = str(rel.get("relation_type") or "").strip().lower()
            if not src or not tgt or src == tgt or rtype not in VALID_REL_TYPES:
                skipped += 1
                continue
            key = (src, tgt, rtype)
            if key in seen_keys:
                skipped += 1
                continue
            if not endpoint_exists(src) or not endpoint_exists(tgt):
                # 端点既不在本次确认的新节点里，图谱里也查不到：写入必然失败，跳过并计数
                skipped += 1
                continue
            seen_keys.add(key)
            rel.update({
                "id": f"rel__{src}__{rtype}__{tgt}",
                "source": src,
                "target": tgt,
                "relation_type": rtype,
                "label": rel.get("label") or rtype,
            })
            clean_rels.append(rel)

        # 阶段二：先写节点再写关系
        for node in clean_nodes:
            service.store.upsert_node(service.normalize_node(node))
        for rel in clean_rels:
            service.store.upsert_relationship(service.normalize_relationship(rel))
        return {
            "nodes": len(clean_nodes),
            "relationships": len(clean_rels),
            "skipped_relationships": skipped,
        }
