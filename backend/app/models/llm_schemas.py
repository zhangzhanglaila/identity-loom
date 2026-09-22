from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class LLMStatusResponse(BaseModel):
    available: bool
    model: Optional[str] = None
    base_url: Optional[str] = None
    models: List[str] = Field(default_factory=list)
    reason: Optional[str] = None


class LLMExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


class LLMAlignedNode(BaseModel):
    """对齐后的节点：图谱字段 + 对齐元信息（align_status 区分 existing/new）。"""

    id: str
    kind: str
    name: str
    display_name: Optional[str] = None
    platform: Optional[str] = None
    username: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    uid: Optional[str] = None
    url: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)
    align_status: str = "new"
    matched_node_id: Optional[str] = None
    confidence: float = 0.0
    reason: str = ""
    mentions: List[str] = Field(default_factory=list)


class LLMAlignedRelationship(BaseModel):
    id: str
    source: str
    target: str
    relation_type: str
    label: Optional[str] = None
    status: str = "new"  # new | duplicate
    confidence: float = 0.0
    note: str = ""


class LLMExtractResponse(BaseModel):
    source: str  # llm | rule
    model: Optional[str] = None
    nodes: List[LLMAlignedNode] = Field(default_factory=list)
    relationships: List[LLMAlignedRelationship] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class LLMApplyRequest(BaseModel):
    """人工确认后的变更清单（只包含勾选确认的节点与关系）。"""

    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    relationships: List[Dict[str, Any]] = Field(default_factory=list)


class LLMApplyResponse(BaseModel):
    nodes: int
    relationships: int
    skipped_relationships: int = 0
