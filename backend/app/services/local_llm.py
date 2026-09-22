"""本地 LLM 客户端（隐私红线：默认只允许连接本机服务）。

身份数据（手机号、邮箱、账号）永不离开机器：
- base_url 必须解析为 localhost / 127.0.0.1 / ::1 / 0.0.0.0；
- 除非显式设置 LLM_ALLOW_REMOTE=true（不推荐），否则拒绝远程地址。
- 仅使用标准库 urllib，不引入额外依赖。

对接 Ollama 的 OpenAI 兼容接口：GET /models、POST /chat/completions。
"""
import json
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from app.config import get_settings

_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"}


class LocalLLMError(RuntimeError):
    """本地模型调用失败（不可用、超时、响应异常、地址越权）。"""


class LocalLLMClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.llm_base_url.rstrip("/")
        self.model = settings.llm_model
        self.timeout = settings.llm_timeout
        self.allow_remote = settings.llm_allow_remote
        self._assert_local()

    def _assert_local(self) -> None:
        if self.allow_remote:
            return
        host = (urlparse(self.base_url).hostname or "").strip("[]").lower()
        if host not in _LOCAL_HOSTS:
            raise LocalLLMError(
                f"拒绝连接非本机 LLM 服务（{host}）：身份数据不能离开本机。"
                "如确需远程，请显式设置 LLM_ALLOW_REMOTE=true（不推荐）。"
            )

    def available(self) -> Dict[str, Any]:
        """探测本地模型服务是否在线，返回 {available, model, models, reason}。"""
        try:
            with urllib.request.urlopen(
                f"{self.base_url}/models", timeout=min(self.timeout, 5)
            ) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            models = [
                str(m.get("name") or m.get("id"))
                for m in (body.get("data") or [])
                if m.get("name") or m.get("id")
            ]
            return {"available": True, "model": self.model, "models": models, "reason": ""}
        except Exception as exc:  # 探测失败只影响状态展示，不阻断
            return {
                "available": False,
                "model": self.model,
                "models": [],
                "reason": str(exc),
            }

    def chat(self, messages: List[Dict[str, str]]) -> str:
        """调用本地模型的 chat/completions，返回消息内容文本。"""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "temperature": 0.0,  # 抽取任务要确定性
        }
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")[:300]
            raise LocalLLMError(f"本地模型请求失败 HTTP {exc.code}: {detail}") from exc
        except Exception as exc:
            raise LocalLLMError(f"本地模型请求失败: {exc}") from exc
        try:
            return str(body["choices"][0]["message"]["content"])
        except (KeyError, IndexError, TypeError) as exc:
            raise LocalLLMError(f"本地模型响应格式异常: {str(body)[:300]}") from exc
