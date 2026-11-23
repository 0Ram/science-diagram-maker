"""
Pydantic Schemas for Science Diagram Maker.
Provides strict validation and serialization for API requests,
responses, and dataset storage.
"""

from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field


class CheckItem(BaseModel):
    passed: bool
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class UsageMetadata(BaseModel):
    input_tokens: Optional[int] = 0
    output_tokens: Optional[int] = 0
    total_tokens: Optional[int] = 0
    estimated_cost_usd: float = 0.0
    actual_cost_usd: float = 0.0
    pricing_tier: str = "free_tier_equivalent"


class RetryMetrics(BaseModel):
    validation: int = 0
    api: int = 0
    total_attempts: int = 1


class ConceptResult(BaseModel):
    id: str
    concept: str
    subject: str
    svg: str
    model: str
    usage: UsageMetadata
    retries: RetryMetrics
    checks: Dict[str, CheckItem]
    generation_status: Literal["pending", "running", "completed", "failed"] = "completed"
    validation_status: Literal["passed", "failed"] = "passed"
    review_status: Literal["pending", "approved", "rejected"] = "pending"
    review_note: str = ""
    error: Optional[str] = None


class Dataset(BaseModel):
    generated_at: str
    model: str
    pricing_assumptions: Dict[str, float]
    results: List[ConceptResult]


class GenerateRequest(BaseModel):
    concept_id: str
    custom_prompt: Optional[str] = None


class GenerateResponse(BaseModel):
    success: bool
    result: Optional[ConceptResult] = None
    error: Optional[str] = None
