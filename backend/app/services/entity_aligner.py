"""实体对齐：把抽取出的 mention 对齐到图谱已有节点。

策略（按优先级）：
1. 值精确匹配：手机号 / 邮箱与已有节点的 phone / email 完全一致（最高置信）
2. id 精确匹配：mention / 建议名命中已有节点 id（强信号，不看类型）
3. 名称精确匹配：类型优先，类型不符时降级为带标记的后备
4. 平台别名匹配：中英平台别名表（谷歌↔Google、微信↔WeChat）
5. 手机号片段匹配：号码片段（如 "180"）命中已有手机号的前缀或后缀
6. 名称前缀 / 模糊匹配：令牌前缀（"QQ邮箱" ⊂ "QQ邮箱 2736"）、difflib 相似度

未命中的实体生成"新节点提案"（确定性 id、继承抽取字段），
全部结果交给人工确认环节，确认后才写入图谱。
"""
import difflib
import re
from typing import Any, Dict, List, Optional

from app.services.nl_extractor import PLATFORM_ALIAS


def _norm(text: Any) -> str:
    return re.sub(r"\s+", "", str(text or "")).strip().lower()


def _digits(text: Any) -> str:
    return re.sub(r"\D+", "", str(text or ""))


def _slug(text: str, max_len: int = 12) -> str:
    return re.sub(r"[^A-Za-z0-9\u4e00-\u9fa5]", "", _norm(text))[:max_len]


class EntityAligner:
    def __init__(self, nodes: List[Dict[str, Any]]) -> None:
        self.nodes = nodes
        self.by_id: Dict[str, Dict[str, Any]] = {}
        self.by_name: Dict[str, Dict[str, Any]] = {}
        self.by_phone: Dict[str, Dict[str, Any]] = {}
        self.by_email: Dict[str, Dict[str, Any]] = {}
        self.by_platform: Dict[str, Dict[str, Any]] = {}
        for node in nodes:
            nid = node.get("id")
            if nid:
                self.by_id[str(nid).lower()] = node
            name = node.get("name")
            if name:
                self.by_name[_norm(name)] = node
            phone = node.get("phone")
            if phone:
                self.by_phone[_digits(phone)] = node
            email = node.get("email")
            if email:
                self.by_email[str(email).lower()] = node
            platform = node.get("platform") or node.get("name")
            if platform:
                self.by_platform[_norm(platform)] = node

    def find(self, query: str) -> Optional[Dict[str, Any]]:
        """按 id / name 精确查找已有节点。"""
        q = _norm(query)
        if not q:
            return None
        if q in self.by_id:
            return self.by_id[q]
        if q in self.by_name:
            return self.by_name[q]
        return None

    @staticmethod
    def _hit(node: Dict[str, Any], confidence: float, reason: str) -> Dict[str, Any]:
        return {
            "matched": True,
            "node": node,
            "confidence": confidence,
            "reason": reason,
        }

    @staticmethod
    def _kind_ok(node: Dict[str, Any], kind: str) -> bool:
        """类型兼容：provider/platform 视为一族，其余按字面。kind 为空视为兼容。"""
        if not kind:
            return True
        nk = node.get("kind")
        if kind in ("provider", "platform"):
            return nk in ("provider", "platform")
        return nk == kind

    def match(
        self,
        mention: str,
        kind: str = "",
        properties: Optional[Dict[str, Any]] = None,
        name: str = "",
    ) -> Dict[str, Any]:
        """把单个 mention 对齐到已有节点；未命中返回 matched=False。

        类型感知：优先匹配同类节点（provider 与 provider），避免
        "outlook" 这类名字撞上 identifier 节点的误对齐；
        id 是强信号，任何类型都接受；名称精确但类型不符时降级为后备。
        """
        props = properties or {}
        mention_c = _norm(mention)
        name_c = _norm(name) if name else ""
        candidates = [c for c in (mention_c, name_c) if c]
        name_exact_fallback = None

        # 1. 值精确匹配（手机号 / 邮箱）
        phone = props.get("phone")
        if phone:
            node = self.by_phone.get(_digits(phone))
            if node:
                return self._hit(node, 1.0, "手机号精确匹配")
        email = props.get("email")
        if email:
            node = self.by_email.get(str(email).lower())
            if node:
                return self._hit(node, 1.0, "邮箱精确匹配")

        # 2. id 精确匹配（强信号，不看类型）
        for cand in candidates:
            node = self.by_id.get(cand)
            if node:
                return self._hit(node, 0.95, "id 精确匹配")

        # 3. 名称精确匹配（类型优先；类型不符先记后备）
        for cand in candidates:
            node = self.by_name.get(cand)
            if not node:
                continue
            if self._kind_ok(node, kind):
                return self._hit(node, 0.95, "名称精确匹配")
            name_exact_fallback = node

        # 4. 平台别名匹配（双向：谷歌→Google、Google→谷歌）
        for cand in candidates:
            alias_name = PLATFORM_ALIAS.get(cand)
            if alias_name:
                node = (
                    self.by_name.get(_norm(alias_name))
                    or self.by_platform.get(_norm(alias_name))
                    or self.by_id.get(f"prov_{_slug(alias_name)}")
                )
                if node and self._kind_ok(node, kind):
                    return self._hit(node, 0.9, "平台别名匹配")
            for alias, canonical in PLATFORM_ALIAS.items():
                if cand == _norm(canonical):
                    node = self.by_name.get(_norm(alias)) or self.by_platform.get(_norm(alias))
                    if node and self._kind_ok(node, kind):
                        return self._hit(node, 0.9, "平台别名匹配(反向)")

        # 5. 手机号片段匹配：号码片段（如 "180"）命中已有手机号的前缀或后缀。
        #    "180 主号" 这类别名既可能是前缀（18071046908）也可能是尾号，两种都试。
        digits = _digits(mention) or (_digits(phone) if phone else "")
        if kind == "identifier" and 3 <= len(digits) <= 11:
            matches = [
                n for n in self.nodes
                if _digits(str(n.get("phone") or "")).startswith(digits)
                or _digits(str(n.get("phone") or "")).endswith(digits)
            ]
            if len(matches) == 1:
                return self._hit(matches[0], 0.85, "手机号片段匹配(前/后缀)")
            if len(matches) > 1:
                best, best_r = None, 0.0
                for n in matches:
                    r = difflib.SequenceMatcher(None, mention_c, _norm(n.get("name") or "")).ratio()
                    if r > best_r:
                        best, best_r = n, r
                return self._hit(best, 0.55, "手机号片段匹配(多候选)")

        # 6. 名称前缀 / 模糊匹配（类型优先，其次才接受跨类型）
        def _best_over(names, kind_ok_only):
            best, best_ratio, best_reason = None, 0.0, ""
            for node_name, node in names.items():
                for cand in candidates:
                    if not cand or not node_name:
                        continue
                    if not kind_ok_only and cand == node_name:
                        # 完全同名但类型不符：交给第 3 步的"类型不符"后备处理
                        continue
                    if node_name.startswith(cand) or cand.startswith(node_name):
                        if len(cand) >= 2 or len(node_name) >= 2:
                            ratio, reason = 0.8, "名称前缀匹配"
                        else:
                            continue
                    else:
                        ratio = difflib.SequenceMatcher(None, cand, node_name).ratio()
                        reason = "名称模糊匹配"
                    if kind_ok_only and not self._kind_ok(node, kind):
                        continue
                    if ratio > best_ratio:
                        best, best_ratio, best_reason = node, ratio, reason
            return best, best_ratio, best_reason

        node, ratio, reason = _best_over(self.by_name, kind_ok_only=True)
        if node and ratio >= 0.62:
            return self._hit(node, ratio, reason)
        node, ratio, reason = _best_over(self.by_name, kind_ok_only=False)
        if node and ratio >= 0.62:
            return self._hit(node, ratio, reason)
        if name_exact_fallback:
            return self._hit(name_exact_fallback, 0.8, "名称精确匹配(类型不符，请确认)")

        return {
            "matched": False,
            "node": None,
            "confidence": 0.0,
            "reason": "未匹配到已有节点，需新建",
        }

    @staticmethod
    def _base_id(kind: str, mention: str, props: Dict[str, Any]) -> str:
        """提案新节点的确定性基础 id（不含去重后缀）。"""
        if kind == "you":
            return "you"
        if kind == "identifier":
            phone, email = props.get("phone"), props.get("email")
            if phone:
                return f"phone_{_digits(phone)[-6:]}"
            if email:
                return f"email_{_slug(str(email), 12)}"
            return f"ident_{_slug(mention)}"
        if kind == "provider":
            return f"prov_{_slug(mention)}"
        return f"account_{_slug(mention)}"

    @classmethod
    def _gen_id(cls, kind: str, mention: str, props: Dict[str, Any], existing_ids: set) -> str:
        """为提案新节点生成确定性 id（与图谱已有 id 去重）。"""
        base = cls._base_id(kind, mention, props)
        candidate, suffix = base, 2
        while candidate in existing_ids:
            candidate = f"{base}_{suffix}"
            suffix += 1
        return candidate

    def propose_node(self, entity: Dict[str, Any], existing_ids: set) -> Dict[str, Any]:
        """未命中实体的新节点提案（字段与 GraphService.normalize_node 对齐）。"""
        mention = entity.get("mention") or ""
        kind = entity.get("kind") or "account"
        props = entity.get("properties") or {}
        return {
            "id": self._gen_id(kind, mention, props, existing_ids),
            "kind": kind,
            "name": entity.get("name") or mention,
            "display_name": None,
            "platform": props.get("platform"),
            "username": props.get("username"),
            "nickname": props.get("nickname"),
            "email": props.get("email"),
            "phone": props.get("phone") or None,
            "uid": props.get("uid"),
            "url": props.get("url"),
            "status": None,
            "notes": f"LLM 抽取建议（原文：{mention}）",
            "tags": [],
            "extra": {"llm_extracted": True, "mention": mention},
        }

    def align_extraction(
        self,
        raw: Dict[str, Any],
        existing_relationships: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """把一次抽取结果整体对齐：实体 → 节点，关系 → 端点 + 去重。"""
        existing_ids = {str(n.get("id")) for n in self.nodes if n.get("id")}
        existing_rel_keys: set = set()
        for rel in existing_relationships or []:
            if rel.get("source") and rel.get("target") and rel.get("relation_type"):
                existing_rel_keys.add((rel["source"], rel["target"], rel["relation_type"]))

        # 按节点 id 去重：多个 mention（"谷歌"/"Google"、完整邮箱/"outlook邮箱"）
        # 可能对齐到同一个已有节点，或生成同一个新提案，只输出一行候选。
        aligned_by_id: Dict[str, Dict[str, Any]] = {}
        order: List[str] = []
        proposal_fields = ("platform", "username", "nickname", "email", "phone", "uid", "url")

        for idx, ent in enumerate(raw.get("entities") or []):
            mention = ent.get("mention", "")
            props = ent.get("properties") or {}
            kind = ent.get("kind", "")
            result = self.match(mention, kind, props, ent.get("name", ""))

            if result["matched"]:
                nid = result["node"].get("id")
                entry = aligned_by_id.get(nid)
                if entry is not None:
                    # 同一已有节点的另一种叫法：合并 mention，保留最高置信的对齐理由
                    entry["mentions"].append(mention)
                    if result["confidence"] > entry["confidence"]:
                        entry["confidence"] = result["confidence"]
                        entry["reason"] = result["reason"]
                    continue
                aligned_by_id[nid] = {
                    "entity": ent,
                    "index": idx,
                    "node": result["node"],
                    "status": "existing",
                    "matched_node_id": nid,
                    "confidence": result["confidence"],
                    "reason": result["reason"],
                    "mentions": [mention],
                }
                order.append(nid)
                continue

            base = self._base_id(kind or "account", mention, props)
            if base in aligned_by_id and aligned_by_id[base]["status"] == "new":
                # 同一新节点被多个 mention 指向（如 "180" 与 "180主号"）：合并，不造 _2 重复节点
                entry = aligned_by_id[base]
                entry["mentions"].append(mention)
                node = entry["node"]
                for field in proposal_fields:
                    if props.get(field) and not node.get(field):
                        node[field] = props[field]
                if not node.get("name") and ent.get("name"):
                    node["name"] = ent["name"]
                continue

            node = self.propose_node(ent, existing_ids)
            existing_ids.add(node["id"])
            nid = node["id"]
            aligned_by_id[nid] = {
                "entity": ent,
                "index": idx,
                "node": node,
                "status": "new",
                "matched_node_id": None,
                "confidence": 0.0,
                "reason": "未匹配到已有节点，需新建",
                "mentions": [mention],
            }
            order.append(nid)

        aligned_entities = [aligned_by_id[nid] for nid in order]

        # mention → 节点 id（"我/本人/自己" 直接映射到 you）
        node_map: Dict[str, str] = {}
        for ae in aligned_entities:
            for mention in ae["mentions"]:
                node_map[mention] = ae["node"]["id"]
        if "you" in existing_ids or "you" in aligned_by_id:
            for alias in ("我", "本人", "自己", "you"):
                node_map.setdefault(alias, "you")

        nodes_by_id = {ae["node"]["id"]: ae["node"] for ae in aligned_entities}
        relationships: List[Dict[str, Any]] = []
        seen_batch_keys: set = set()
        for rel in raw.get("relationships") or []:
            src = node_map.get(rel.get("source_mention"))
            tgt = node_map.get(rel.get("target_mention"))
            if not src or not tgt or src == tgt:
                continue
            rtype = rel.get("relation_type")
            src_node, tgt_node = nodes_by_id.get(src), nodes_by_id.get(tgt)
            src, tgt, rtype = _normalize_direction(src_node, tgt_node, src, tgt, rtype)
            key = (src, tgt, rtype)
            if key in seen_batch_keys:
                # 本批抽取重复产出同一条关系：只保留一行候选
                continue
            seen_batch_keys.add(key)
            is_dup = key in existing_rel_keys
            relationships.append({
                "id": f"rel__{src}__{rtype}__{tgt}",
                "source": src,
                "target": tgt,
                "relation_type": rtype,
                "label": rtype,
                "status": "duplicate" if is_dup else "new",
                "confidence": rel.get("confidence", 0.5),
                "note": "图谱中已存在相同关系" if is_dup else "",
            })

        return {"entities": aligned_entities, "relationships": relationships}


def _normalize_direction(
    src_node: Optional[Dict[str, Any]],
    tgt_node: Optional[Dict[str, Any]],
    src_id: str,
    tgt_id: str,
    rtype: str,
) -> tuple:
    """按关系类型规范方向：owns 必须 you→account、belongs_to 必须 account→provider 等。

    LLM 可能把方向写反（"谷歌账号属于我" 这类表达），这里自动纠正。
    """
    sk = (src_node or {}).get("kind")
    tk = (tgt_node or {}).get("kind")
    if rtype == "owns" and sk == "account" and tk == "you":
        return tgt_id, src_id, rtype
    if rtype == "belongs_to" and sk == "provider" and tk == "account":
        return tgt_id, src_id, rtype
    if rtype in ("binds", "verifies") and sk == "identifier" and tk == "account":
        return tgt_id, src_id, rtype
    return src_id, tgt_id, rtype
