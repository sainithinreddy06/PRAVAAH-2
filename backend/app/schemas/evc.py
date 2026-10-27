from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


UndertakingStatus = Literal['draft', 'submitted', 'accepted', 'changes_requested', 'rejected']


class UndertakingCreate(BaseModel):
    application_id: int = Field(gt=0)
    undertaking_type: str = Field(min_length=2, max_length=80)
    statement: str = Field(min_length=20, max_length=10000)


class UndertakingReview(BaseModel):
    decision: Literal['accepted', 'changes_requested', 'rejected']
    reviewer_notes: str = Field(min_length=3, max_length=3000)


class UndertakingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    created_by_user_id: int | None
    undertaking_type: str
    statement: str
    status: str
    version: int
    submitted_at: datetime | None
    reviewed_by_user_id: int | None
    reviewed_at: datetime | None
    reviewer_notes: str | None
    created_at: datetime


class EvcAssessmentCreate(BaseModel):
    application_id: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=3000)


class EvcAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    assessed_by_user_id: int | None
    evidence_total: int
    evidence_accepted: int
    evidence_pending: int
    evidence_rejected: int
    open_obligations: int
    undertaking_count: int
    outcome: str
    notes: str | None
    created_at: datetime



class EvcChecklistItem(BaseModel):
    item_id: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=3, max_length=300)
    required: bool = True


class EvcChecklistResult(BaseModel):
    item_id: str = Field(min_length=1, max_length=60)
    outcome: Literal['pass', 'fail', 'not_applicable']
    notes: str | None = Field(default=None, max_length=2000)


class EvcVisitCreate(BaseModel):
    application_id: int = Field(gt=0)
    assigned_to_user_id: int = Field(gt=0)
    scheduled_at: datetime
    checklist_items: list[EvcChecklistItem] = Field(min_length=1, max_length=50)


class EvcVisitComplete(BaseModel):
    findings: str = Field(min_length=20, max_length=10000)
    results: list[EvcChecklistResult] = Field(min_length=1, max_length=50)


class EvcVisitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    scheduled_by_user_id: int | None
    assigned_to_user_id: int | None
    scheduled_at: datetime
    status: str
    checklist_json: str
    results_json: str
    findings: str | None
    report_revision: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime



class EvcReportAmendment(BaseModel):
    findings: str = Field(min_length=20, max_length=10000)
    results: list[EvcChecklistResult] = Field(min_length=1, max_length=50)
    change_reason: str = Field(min_length=10, max_length=3000)


class EvcVisitReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    visit_id: int
    revision: int
    findings: str
    results_json: str
    change_reason: str
    created_by_user_id: int | None
    created_at: datetime
