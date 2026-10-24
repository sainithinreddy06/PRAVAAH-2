from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PolicyCreate(BaseModel):
    policy_key: str = Field(min_length=2, max_length=100, pattern=r'^[A-Za-z0-9._-]+$')
    version: int = Field(ge=1)
    title: str = Field(min_length=3, max_length=240)
    description: str | None = Field(default=None, max_length=10000)
    source_reference: str | None = Field(default=None, max_length=500)
    effective_from: datetime | None = None
    effective_until: datetime | None = None


class PolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    policy_key: str
    version: int
    title: str
    description: str | None
    source_reference: str | None
    effective_from: datetime | None
    effective_until: datetime | None
    is_active: bool
    created_at: datetime


class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    policy_id: int | None
    original_filename: str
    content_type: str | None
    sha256_digest: str | None
    review_status: str
    reviewer_notes: str | None
    valid_until: datetime | None
    created_at: datetime


class EvidenceReviewRequest(BaseModel):
    review_status: str = Field(pattern=r'^(accepted|rejected|needs_changes)$')
    reviewer_notes: str = Field(min_length=3, max_length=2000)
