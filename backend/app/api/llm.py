from fastapi import APIRouter, HTTPException

from app.models.llm_schemas import (
    LLMApplyRequest,
    LLMApplyResponse,
    LLMExtractRequest,
    LLMExtractResponse,
    LLMStatusResponse,
)


def build_llm_router(service) -> APIRouter:
    """service 为 None 表示本地 LLM 配置越权（非本机地址）被拒绝，接口返回 503。"""
    router = APIRouter(prefix="/api/llm", tags=["llm-import"])

    @router.get("/status", response_model=LLMStatusResponse)
    def status():
        if service is None:
            return LLMStatusResponse(
                available=False,
                reason="本地 LLM 地址不在本机白名单内，已按隐私红线拒绝连接",
            )
        return service.status()

    @router.post("/extract", response_model=LLMExtractResponse)
    def extract(payload: LLMExtractRequest):
        if service is None:
            raise HTTPException(status_code=503, detail="本地 LLM 未配置，无法抽取")
        return service.extract(payload.text)

    @router.post("/apply", response_model=LLMApplyResponse)
    def apply(payload: LLMApplyRequest):
        if service is None:
            raise HTTPException(status_code=503, detail="本地 LLM 未配置，无法写入")
        try:
            result = service.apply(payload.nodes, payload.relationships)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return LLMApplyResponse(**result)

    return router
