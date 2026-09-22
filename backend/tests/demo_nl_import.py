"""演示：自然语言 → 抽取 → 对齐 → 待确认清单（离线，规则兜底引擎）。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, r"D:\Code\IdentityLoom\backend")

from app.services.llm_import_service import LLMImportService


class FakeStore:
    def __init__(self, nodes, rels):
        self._nodes, self._rels = nodes, rels

    def export_all(self):
        return {"nodes": self._nodes, "relationships": self._rels}


def main() -> None:
    nodes, rels = json.loads(
        Path(r"D:\Code\IdentityLoom\data\private\graph.json").read_text(encoding="utf-8")
    ).values()
    service = LLMImportService(FakeStore(nodes, rels))

    sentences = [
        "我的谷歌账号绑定了 QQ 邮箱和 180 主号",
        "Telegram 用 150 这个号登录，outlook 邮箱是 zhangzhanglaila@outlook.com",
    ]
    for text in sentences:
        r = service.extract(text)
        print("=" * 88)
        print("输入:", text)
        print("引擎:", r["source"], "| 警告:", r["warnings"])
        for n in r["nodes"]:
            print(
                f"  节点 [{n['align_status']:>8}] conf={n['confidence']:.2f} "
                f"{n['reason']:<16} id={n['id']:<24} name={n['name']:<14} "
                f"kind={n['kind']} phone={n.get('phone')} email={n.get('email')}"
            )
        for rel in r["relationships"]:
            print(
                f"  关系 [{rel['status']:>8}] {rel['source']} --{rel['relation_type']}--> "
                f"{rel['target']} conf={rel['confidence']:.2f} {rel['note']}"
            )


if __name__ == "__main__":
    main()
