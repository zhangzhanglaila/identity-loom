from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NodeBase(BaseModel):
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


class NodeCreate(NodeBase):
    pass


class NodeUpdate(BaseModel):
    kind: Optional[str] = None
    name: Optional[str] = None
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
    tags: Optional[List[str]] = None
    extra: Optional[Dict[str, Any]] = None


class RelationshipBase(BaseModel):
    id: str
    source: str
    target: str
    relation_type: str
    label: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    extra: Dict[str, Any] = Field(default_factory=dict)


class RelationshipCreate(RelationshipBase):
    pass


class RelationshipUpdate(BaseModel):
    source: Optional[str] = None
    target: Optional[str] = None
    relation_type: Optional[str] = None
    label: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class GraphOverview(BaseModel):
    nodes: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]

