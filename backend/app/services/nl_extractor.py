"""自然语言 → 候选三元组抽取器。

主通道：本地 LLM（Ollama 等，仅本机，见 local_llm.py）。
兜底通道：规则解析（模型未运行或输出不可解析时启用，精度较低但可用）。
两条通道输出相同的候选结构 {entities, relationships, uncertainties}，
后续由 entity_aligner 对齐到图谱，再交人工确认，最后才写库。
"""
import json
import re
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# 平台别名表：中英混写归一，抽取与对齐共用
# ---------------------------------------------------------------------------
PLATFORM_ALIAS: Dict[str, str] = {
    "google": "Google", "谷歌": "Google", "gg": "Google",
    "telegram": "Telegram", "tg": "Telegram", "电报": "Telegram",
    "qq": "QQ", "腾讯qq": "QQ",
    "wechat": "WeChat", "微信": "WeChat", "vx": "WeChat", "wx": "WeChat",
    "apple": "Apple", "苹果": "Apple", "icloud": "iCloud",
    "outlook": "Outlook",
    "gmail": "Gmail",
    "github": "GitHub", "gitlab": "GitLab",
    "douyin": "抖音", "抖音": "抖音",
    "xiaohongshu": "小红书", "小红书": "小红书", "xhs": "小红书",
    "weibo": "微博", "微博": "微博",
    "bilibili": "B站", "b站": "B站", "bili": "B站",
    "zhihu": "知乎", "知乎": "知乎",
    "twitter": "Twitter", "推特": "Twitter", "x平台": "Twitter",
    "facebook": "Facebook", "脸书": "Facebook",
    "instagram": "Instagram", "ins": "Instagram",
    "amazon": "Amazon", "亚马逊": "Amazon",
    "netease": "网易", "网易": "网易",
    "microsoft": "Microsoft", "微软": "Microsoft",
    "steam": "Steam", "epic": "Epic",
    "openai": "OpenAI", "chatgpt": "ChatGPT",
    "fastgpt": "FastGPT",
}

VALID_KINDS = {"you", "account", "provider", "identifier"}
VALID_REL_TYPES = {"owns", "belongs_to", "binds", "verifies", "login_by"}

PHONE_RE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")

# ---------------------------------------------------------------------------
# LLM 提示词
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """你是"身份织网"图谱的数据抽取器。用户会用中文口语描述自己的账号、手机号、邮箱、平台及绑定关系。你的任务是从中抽取结构化候选数据，只输出 JSON，不要任何解释文字。

实体 kind 只能取：
- you: 用户本人（"我"）
- account: 平台账号（如"谷歌主账号""Telegram 小号"）
- provider: 平台/服务商（Google、Telegram、QQ、微信等）
- identifier: 手机号、邮箱等身份标识

关系 relation_type 只能取：
- owns: 用户拥有账号（you -> account）
- belongs_to: 账号属于某平台（account -> provider）
- binds: 账号绑定了手机号/邮箱（account -> identifier）
- verifies: 账号通过该标识验证（account -> identifier）
- login_by: 账号通过另一账号登录（account -> account）

输出格式：
{
  "entities": [
    {"mention": "原文中的片段，必须能回查原文", "kind": "account|provider|identifier|you", "name": "建议节点名", "properties": {"platform": "平台名", "email": "完整邮箱", "phone": "完整手机号或号码片段"}}
  ],
  "relationships": [
    {"source_mention": "entities 中的 mention", "target_mention": "entities 中的 mention", "relation_type": "owns|belongs_to|binds|verifies|login_by", "confidence": 0.8}
  ],
  "uncertainties": ["拿不准或缺失的信息，如号码不完整"]

规则：
1. 手机号尽量给出完整号码；原文只给了片段（如"180 主号"）就如实填"180"。
2. 邮箱必须给出完整地址。
3. 关系里的 mention 必须严格等于 entities 里某个 mention。
4. 拿不准也要抽出来，并在 uncertainties 里说明原因。"""

USER_PROMPT_TEMPLATE = """抽取下面这段与身份图谱相关的实体和关系：

{text}"""


def build_messages(text: str) -> List[Dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": USER_PROMPT_TEMPLATE.format(text=text)},
    ]


# ---------------------------------------------------------------------------
# LLM 输出解析与校验
# ---------------------------------------------------------------------------
def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "")).strip()


def _extract_json_block(content: str) -> Optional[Dict[str, Any]]:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if 0 <= start < end:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return None
    return None


def parse_extraction(content: str) -> Dict[str, Any]:
    """把 LLM 返回文本解析为 {entities, relationships, uncertainties, parse_error}。"""
    data = _extract_json_block(content)
    if not data:
        return {
            "entities": [], "relationships": [], "uncertainties": [],
            "parse_error": True,
        }
    entities: List[Dict[str, Any]] = []
    relationships: List[Dict[str, Any]] = []
    uncertainties: List[str] = []
    seen: set = set()
    for ent in data.get("entities") or []:
        if not isinstance(ent, dict):
            continue
        mention = _clean_text(ent.get("mention"))
        if not mention or mention in seen:
            continue
        props = {k: v for k, v in (ent.get("properties") or {}).items() if v}
        kind = str(ent.get("kind") or "").strip().lower()
        if kind not in VALID_KINDS:
            kind = infer_kind(mention, props)
        entities.append({
            "mention": mention,
            "kind": kind,
            "name": _clean_text(ent.get("name")) or mention,
            "properties": props,
        })
        seen.add(mention)
    for rel in data.get("relationships") or []:
        if not isinstance(rel, dict):
            continue
        rtype = str(rel.get("relation_type") or "").strip().lower()
        if rtype not in VALID_REL_TYPES:
            rtype = "binds"
        source = _clean_text(rel.get("source_mention"))
        target = _clean_text(rel.get("target_mention"))
        if not source or not target or source == target:
            continue
        try:
            confidence = float(rel.get("confidence") or 0.5)
        except (TypeError, ValueError):
            confidence = 0.5
        relationships.append({
            "source_mention": source,
            "target_mention": target,
            "relation_type": rtype,
            "confidence": max(0.0, min(1.0, confidence)),
        })
    for item in data.get("uncertainties") or []:
        if str(item).strip():
            uncertainties.append(str(item).strip())
    return {
        "entities": entities,
        "relationships": relationships,
        "uncertainties": uncertainties,
        "parse_error": False,
    }


def infer_kind(mention: str, properties: Optional[Dict[str, Any]] = None) -> str:
    """根据 mention 与属性推断实体类型（LLM 漏填 kind 时的兜底）。"""
    props = properties or {}
    if EMAIL_RE.search(mention) or props.get("email"):
        return "identifier"
    if PHONE_RE.search(mention) or props.get("phone"):
        return "identifier"
    norm = _clean_text(mention).lower()
    if norm in ("我", "本人", "自己", "you"):
        return "you"
    if any(t in norm for t in ("账号", "账户", "小号", "主号", "acc")):
        return "account"
    if PLATFORM_ALIAS.get(norm) or norm in {v.lower() for v in PLATFORM_ALIAS.values()}:
        return "provider"
    if "平台" in norm or "服务" in norm:
        return "provider"
    return "account"


# ---------------------------------------------------------------------------
# 规则兜底抽取器（无本地模型时启用）
# ---------------------------------------------------------------------------
_ACCOUNT_SUFFIX_RE = re.compile(r"(我的|我)?\s*([\u4e00-\u9fa5A-Za-z0-9_\-]{1,16}?)(账号|账户|小号|主号)")
_ACCOUNT_PREFIX_RE = re.compile(r"我的([\u4e00-\u9fa5A-Za-z]{1,12}?)(?=绑|用|登|是|的|和|与|及|,|，|。|$|\s)")
_MAIL_NAME_RE = re.compile(r"([A-Za-z0-9\u4e00-\u9fa5]{1,12}?)\s*邮箱")
_NUMBER_WORD_RE = re.compile(r"(?:(?:主号|小号|号码|尾号)\s*[:：]?\s*(\d{3,})|(\d{3,})\s*(?:主号|小号|号))")
_BIND_VERBS = ("绑定", "绑了", "绑着", "挂了", "验证", "登录")


def rule_extract(text: str) -> Dict[str, Any]:
    """正则启发式抽取，输出与 parse_extraction 相同的结构。

    精度低于 LLM，所有关系 confidence 刻意压低，靠人工确认环节兜底。
    """
    entities: List[Dict[str, Any]] = []
    relationships: List[Dict[str, Any]] = []
    uncertainties: List[str] = []

    def add(mention: str, kind: str, name: str = "", properties: Optional[Dict[str, Any]] = None) -> None:
        mention = _clean_text(mention)
        if not mention:
            return
        if any(e["mention"] == mention for e in entities):
            return
        entities.append({
            "mention": mention,
            "kind": kind,
            "name": name or mention,
            "properties": properties or {},
        })

    def add_rel(source: str, target: str, rtype: str, confidence: float) -> None:
        source, target = _clean_text(source), _clean_text(target)
        if not source or not target or source == target:
            return
        if any(r["source_mention"] == source and r["target_mention"] == target and r["relation_type"] == rtype
               for r in relationships):
            return
        relationships.append({
            "source_mention": source,
            "target_mention": target,
            "relation_type": rtype,
            "confidence": confidence,
        })

    # 1. 完整邮箱 / 完整手机号
    for m in EMAIL_RE.finditer(text):
        add(m.group(0), "identifier", properties={"email": m.group(0)})
    for m in PHONE_RE.finditer(text):
        add(m.group(0), "identifier", properties={"phone": m.group(0)})

    # 2. 平台 provider（字典匹配）
    for alias, canonical in PLATFORM_ALIAS.items():
        for m in re.finditer(re.escape(alias), text, re.IGNORECASE):
            if len(alias) == 2 and alias.isascii():  # "gg"/"tg" 这类过短拉丁别名只做词边界匹配，避免误伤
                continue
            add(m.group(0), "provider", name=canonical, properties={"platform": canonical})

    # 3. 邮箱名称式标识："QQ邮箱" / "Gmail邮箱" / "163邮箱"（无完整地址，mention 即名称）
    for m in _MAIL_NAME_RE.finditer(text):
        add(m.group(0), "identifier")

    # 4. 账号 mention："我的谷歌账号" / "Telegram 小号" / "180主号"（纯数字段是号码）
    for m in _ACCOUNT_SUFFIX_RE.finditer(text):
        prefix, word, suffix = m.group(1), m.group(2), m.group(3)
        if word in ("这个", "那个", "一个", "手机"):
            continue
        if word.isdigit():
            add(m.group(0), "identifier", properties={"phone": word})
            continue
        canonical = None
        for alias, c in PLATFORM_ALIAS.items():
            if word.lower() == alias.lower() or word == c:
                canonical = c
                break
        add(m.group(0), "account", properties={"platform": canonical} if canonical else {})
    for m in _ACCOUNT_PREFIX_RE.finditer(text):
        word = m.group(1)
        canonical = None
        for alias, c in PLATFORM_ALIAS.items():
            if word.lower() == alias.lower() or word == c:
                canonical = c
                break
        add(m.group(0), "account", properties={"platform": canonical} if canonical else {})

    # 5. 号码片段："180 主号" / "150 这个号"（3~11 位且不是完整手机号）
    for m in _NUMBER_WORD_RE.finditer(text):
        digits = m.group(1) or m.group(2)
        if digits and not PHONE_RE.fullmatch(digits):
            add(m.group(0), "identifier", properties={"phone": digits})

    # 6. 关系
    account_mentions = [e for e in entities if e["kind"] == "account"]
    identifier_mentions = [e for e in entities if e["kind"] == "identifier"]
    provider_mentions = [e for e in entities if e["kind"] == "provider"]

    for acc in account_mentions:
        if "我" in acc["mention"]:
            add("我", "you", name="YOU")
            add_rel("我", acc["mention"], "owns", 0.7)
        platform = (acc.get("properties") or {}).get("platform")
        if platform:
            for prov in provider_mentions:
                if prov.get("name") == platform:
                    add_rel(acc["mention"], prov["mention"], "belongs_to", 0.7)
                    break

    if any(v in text for v in _BIND_VERBS) and account_mentions and identifier_mentions:
        for acc in account_mentions:
            for ident in identifier_mentions:
                add_rel(acc["mention"], ident["mention"], "binds", 0.45)

    if not account_mentions and identifier_mentions:
        uncertainties.append("未识别出明确的账号，无法确定号码/邮箱归属")

    return {"entities": entities, "relationships": relationships, "uncertainties": uncertainties}
