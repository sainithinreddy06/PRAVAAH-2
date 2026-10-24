from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ApplicationStatus = Literal[
    'draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected'
]


class ApplicationCreate(BaseModel):
    institution_id: int = Field(gt=0)
    reference_code: str = Field(min_length=3, max_length=64, pattern=r'^[A-Za-z0-9][A-Za-z0-9._/-]*$')


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_code: str
    institution_id: int
    submitted_by_user_id: int | None
    workflow_stage: str
    status: str
    created_at: datetime
    updated_at: datetime


class ApplicationTransitionRequest(BaseModel):
    target_status: ApplicationStatus
    reason: str = Field(min_length=3, max_length=2000)
