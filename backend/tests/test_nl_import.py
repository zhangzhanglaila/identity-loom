"""LLM 自然语言导入：抽取 / 对齐 / 编排 离线验证。

运行方式（项目根目录）：
    $env:PYTHONPATH = "backend"
    python -m unittest discover -s backend/tests -p "test_nl_import.py" -v

不依赖 Neo4j / Ollama / pydantic：
- 图谱快照直接用 data/private/graph.json（真实数据）；
- LLM 路径用模拟输出验证解析与对齐，规则兜底路径直接跑正则抽取；
- LocalLLMClient 的隐私红线（非本机地址拒绝）单独验证。
"""
import json
import os
import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.config import get_settings  # noqa: E402
from app.services.entity_aligner import EntityAligner  # noqa: E402
from app.services.local_llm import LocalLLMClient, LocalLLMError  # noqa: E402
from app.services.nl_extractor import (  # noqa: E402
    parse_extraction,
    rule_extract,
)
from app.services.llm_import_service import LLMImportService  # noqa: E402

GRAPH_FILE = PROJECT_ROOT / "data" / "private" / "graph.json"

DEMO_TEXT = "我的谷歌账号绑定了 QQ 邮箱和 180 主号"

# 模拟本地模型对 DEMO_TEXT 的理想输出（含用户口语、别名、片段号码）
FAKE_LLM_JSON = json.dumps(
    {
        "entities": [
            {"mention": "我的谷歌账号", "kind": "account", "name": "Google 主账号",
             "properties": {"platform": "Google"}},
            {"mention": "QQ邮箱", "kind": "identifier", "name": "QQ邮箱",
             "properties": {"email": "2736201404@qq.com"}},
            {"mention": "180主号", "kind": "identifier", "name": "主号 180",
             "properties": {"phone": "180"}},
            {"mention": "谷歌", "kind": "provider", "name": "Google",
             "properties": {"platform": "Google"}},
        ],
        "relationships": [
            {"source_mention": "我的谷歌账号", "target_mention": "谷歌",
             "relation_type": "belongs_to", "confidence": 0.95},
            {"source_mention": "我的谷歌账号", "target_mention": "QQ邮箱",
             "relation_type": "binds", "confidence": 0.9},
            {"source_mention": "我的谷歌账号", "target_mention": "180主号",
             "relation_type": "binds", "confidence": 0.9},
        ],
        "uncertainties": [],
    },
    ensure_ascii=False,
)


def load_graph():
    payload = json.loads(GRAPH_FILE.read_text(encoding="utf-8"))
    return payload["nodes"], payload["relationships"]


class FakeStore:
    """只实现对齐所需的只读快照接口。"""

    def __init__(self, nodes, relationships):
        self._nodes, self._relationships = nodes, relationships

    def export_all(self):
        return {"nodes": self._nodes, "relationships": self._relationships}


class FakeWriteStore:
    """可写的内存图库：支持 apply 写库链路（upsert / get_node / 快照）。"""

    def __init__(self, nodes=None, relationships=None):
        self.nodes = {n["id"]: dict(n) for n in (nodes or [])}
        self.rels = {r["id"]: dict(r) for r in (relationships or []) if r.get("id")}

    def export_all(self):
        return {
            "nodes": list(self.nodes.values()),
            "relationships": list(self.rels.values()),
        }

    def get_node(self, node_id):
        return self.nodes.get(node_id)

    def upsert_node(self, payload):
        self.nodes[payload["id"]] = dict(payload)
        return payload

    def upsert_relationship(self, payload):
        self.rels[payload["id"]] = dict(payload)
        return payload


class TestAlignerMatch(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        nodes, _ = load_graph()
        cls.aligner = EntityAligner(nodes)

    def test_email_exact(self):
        r = self.aligner.match("2736201404@qq.com", "identifier", {"email": "2736201404@qq.com"})
        self.assertTrue(r["matched"])
        self.assertEqual(r["node"]["id"], "email_qq")
        self.assertEqual(r["confidence"], 1.0)

    def test_phone_tail(self):
        r = self.aligner.match("180主号", "identifier", {"phone": "180"})
        self.assertTrue(r["matched"])
        self.assertEqual(r["node"]["id"], "phone_180")

    def test_platform_alias(self):
        r = self.aligner.match("谷歌", "provider")
        self.assertTrue(r["matched"])
        self.assertEqual(r["node"]["id"], "prov_Google")

    def test_platform_english(self):
        r = self.aligner.match("Google", "provider")
        self.assertTrue(r["matched"])
        self.assertEqual(r["node"]["id"], "prov_Google")

    def test_name_prefix(self):
        r = self.aligner.match("QQ邮箱", "identifier")
        self.assertTrue(r["matched"])
        self.assertEqual(r["node"]["id"], "email_qq")

    def test_suggested_name_matches_existing(self):
        # LLM 建议名 "Google 主账号" 应命中已有 google_main
        r = self.aligner.match("我的谷歌账号", "account", {"platform": "Google"}, name="Google 主账号")
        self.assertTrue(r["matched"])
        self.assertEqual(r["node"]["id"], "google_main")

    def test_kind_aware_no_cross_kind_misalign(self):
        # provider "outlook" 与 identifier 节点 email_outlook 同名不同类：
        # 允许命中但必须打上"类型不符"标记，交给人工确认，而不是静默当作平台。
        r = self.aligner.match("outlook", "provider")
        self.assertTrue(r["matched"])
        self.assertIn("类型不符", r["reason"])
        self.assertLess(r["confidence"], 0.9)

    def test_new_node_proposal(self):
        r = self.aligner.match("一个不存在的平台XYZ", "provider")
        self.assertFalse(r["matched"])
        node = self.aligner.propose_node(
            {"mention": "一个不存在的平台XYZ", "kind": "provider", "name": "XYZ", "properties": {}},
            {n.get("id") for n in self.aligner.nodes},
        )
        self.assertEqual(node["kind"], "provider")
        self.assertTrue(node["id"].startswith("prov_"))


class TestRuleExtractor(unittest.TestCase):
    def test_demo_sentence(self):
        raw = rule_extract(DEMO_TEXT)
        mentions = {e["mention"] for e in raw["entities"]}
        self.assertIn("QQ邮箱", mentions)
        self.assertIn("180主号", mentions)
        kinds = {e["kind"] for e in raw["entities"]}
        self.assertIn("provider", kinds)
        rtypes = {r["relation_type"] for r in raw["relationships"]}
        self.assertIn("binds", rtypes)


class TestLLMPathAlign(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        nodes, rels = load_graph()
        cls.nodes, cls.rels = nodes, rels
        cls.raw = parse_extraction(FAKE_LLM_JSON)
        cls.aligner = EntityAligner(nodes)
        cls.aligned = cls.aligner.align_extraction(cls.raw, rels)

    def test_parse_ok(self):
        self.assertFalse(self.raw["parse_error"])
        self.assertEqual(len(self.raw["entities"]), 4)
        self.assertEqual(len(self.raw["relationships"]), 3)

    def test_align_google_main_existing(self):
        ids = {ae["node"]["id"] for ae in self.aligned["entities"]}
        self.assertIn("google_main", ids)

    def test_rel_direction_and_dedup(self):
        rels = self.aligned["relationships"]
        by_key = {(r["source"], r["target"], r["relation_type"]): r for r in rels}
        # belongs_to: account -> provider（方向规范）
        self.assertIn(("google_main", "prov_Google", "belongs_to"), by_key)
        # binds: account -> identifier
        self.assertIn(("google_main", "email_qq", "binds"), by_key)
        # 重复关系：图中已存在 google_main -> prov_Google belongs_to
        self.assertEqual(by_key[("google_main", "prov_Google", "belongs_to")]["status"], "duplicate")


class TestAlignDedup(unittest.TestCase):
    def test_existing_node_multi_mention_one_row(self):
        nodes, _ = load_graph()
        raw = {
            "entities": [
                {"mention": "谷歌", "kind": "provider", "name": "Google",
                 "properties": {"platform": "Google"}},
                {"mention": "Google", "kind": "provider", "name": "Google",
                 "properties": {"platform": "Google"}},
            ],
            "relationships": [],
            "uncertainties": [],
        }
        aligned = EntityAligner(nodes).align_extraction(raw, [])
        ids = [ae["node"]["id"] for ae in aligned["entities"]]
        self.assertEqual(ids, ["prov_Google"])
        self.assertEqual(aligned["entities"][0]["mentions"], ["谷歌", "Google"])

    def test_new_node_multi_mention_no_double_proposal(self):
        # 同一句里两个不同 mention 指向同一个新号码：只能有一个 phone_199 提案，不能出现 _2
        raw = {
            "entities": [
                {"mention": "199这个号", "kind": "identifier", "name": "199",
                 "properties": {"phone": "199"}},
                {"mention": "199小号", "kind": "identifier", "name": "小号199",
                 "properties": {"phone": "199"}},
            ],
            "relationships": [],
            "uncertainties": [],
        }
        aligned = EntityAligner([]).align_extraction(raw, [])
        ids = [ae["node"]["id"] for ae in aligned["entities"]]
        self.assertEqual(ids, ["phone_199"])
        self.assertEqual(aligned["entities"][0]["mentions"], ["199这个号", "199小号"])

    def test_batch_duplicate_relationship_one_row(self):
        raw = {
            "entities": [
                {"mention": "我的新账号", "kind": "account", "name": "新账号", "properties": {}},
                {"mention": "谷歌", "kind": "provider", "name": "Google",
                 "properties": {"platform": "Google"}},
            ],
            "relationships": [
                {"source_mention": "我的新账号", "target_mention": "谷歌",
                 "relation_type": "belongs_to", "confidence": 0.9},
                {"source_mention": "我的新账号", "target_mention": "谷歌",
                 "relation_type": "belongs_to", "confidence": 0.8},
            ],
            "uncertainties": [],
        }
        nodes, _ = load_graph()
        aligned = EntityAligner(nodes).align_extraction(raw, [])
        self.assertEqual(len(aligned["relationships"]), 1)


class TestApply(unittest.TestCase):
    def _service(self, store=None):
        return LLMImportService(store or FakeWriteStore())

    def test_apply_valid_and_skip(self):
        store = FakeWriteStore(nodes=[{"id": "you", "kind": "you", "name": "YOU"}], relationships=[])
        service = self._service(store)
        result = service.apply(
            nodes=[
                {"id": "acc_new", "kind": "account", "name": "新账号", "platform": "Google"},
                {"id": "phone_new", "kind": "identifier", "name": "新号", "phone": "19900000000"},
            ],
            relationships=[
                {"source": "acc_new", "target": "phone_new", "relation_type": "binds"},
                {"source": "acc_new", "target": "missing_node", "relation_type": "binds"},
                {"source": "acc_new", "target": "phone_new", "relation_type": "binds"},
                {"source": "acc_new", "target": "phone_new", "relation_type": "hacker"},
                {"source": "acc_new", "target": "you", "relation_type": "owns"},
            ],
        )
        self.assertEqual(result["nodes"], 2)
        self.assertEqual(result["relationships"], 2)  # 新号码绑定 + owns 已有 you
        self.assertEqual(result["skipped_relationships"], 3)  # 悬空 / 重复 / 非法类型
        # 关系 id 已按端点规范化
        self.assertIn("rel__acc_new__binds__phone_new", store.rels)
        self.assertIn("rel__acc_new__owns__you", store.rels)

    def test_apply_rejects_invalid_node(self):
        service = self._service()
        with self.assertRaises(ValueError):
            service.apply([{"id": "  ", "kind": "account", "name": "x"}], [])
        with self.assertRaises(ValueError):
            service.apply([{"id": "x", "kind": "weird", "name": "x"}], [])
        # 校验失败不应写入任何节点
        self.assertEqual(service.apply([], [])["nodes"], 0)

    def test_apply_endpoint_to_existing_node(self):
        store = FakeWriteStore(nodes=[{"id": "prov_Google", "kind": "provider", "name": "Google"}])
        service = self._service(store)
        result = service.apply(
            nodes=[{"id": "acc_new", "kind": "account", "name": "新账号"}],
            relationships=[{"source": "acc_new", "target": "prov_Google", "relation_type": "belongs_to"}],
        )
        self.assertEqual(result["relationships"], 1)
        self.assertEqual(result["skipped_relationships"], 0)


class TestServiceOrchestration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        nodes, rels = load_graph()
        cls.store = FakeStore(nodes, rels)
        # 构造时 base_url 是本机默认值，不会触发隐私拒绝
        cls.service = LLMImportService(cls.store)

    def test_extract_rule_fallback(self):
        # 无本地模型 → 走规则兜底，输出结构与 schema 对齐
        result = self.service.extract(DEMO_TEXT)
        self.assertEqual(result["source"], "rule")
        self.assertTrue(any("本地模型不可用" in w for w in result["warnings"]))
        self.assertTrue(result["nodes"])
        self.assertTrue(result["relationships"])
        for node in result["nodes"]:
            self.assertIn("align_status", node)
            self.assertIn("id", node)

    def test_extract_empty_input(self):
        result = self.service.extract("   ")
        self.assertEqual(result["nodes"], [])
        self.assertIn("输入为空", result["warnings"])


class TestPrivacyGuard(unittest.TestCase):
    def test_remote_url_rejected(self):
        os.environ["LLM_BASE_URL"] = "http://example.com/v1"
        os.environ["LLM_ALLOW_REMOTE"] = ""
        try:
            get_settings.cache_clear()
            with self.assertRaises(LocalLLMError):
                LocalLLMClient()
        finally:
            os.environ.pop("LLM_BASE_URL", None)
            os.environ.pop("LLM_ALLOW_REMOTE", None)
            get_settings.cache_clear()

    def test_localhost_allowed(self):
        os.environ["LLM_BASE_URL"] = "http://127.0.0.1:11434/v1"
        os.environ["LLM_ALLOW_REMOTE"] = ""
        try:
            get_settings.cache_clear()
            client = LocalLLMClient()
            self.assertEqual(client.base_url, "http://127.0.0.1:11434/v1")
        finally:
            os.environ.pop("LLM_BASE_URL", None)
            get_settings.cache_clear()


if __name__ == "__main__":
    unittest.main(verbosity=2)
