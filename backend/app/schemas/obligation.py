from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ObligationStatus = Literal['open', 'in_progress', 'fulfilled', 'waived']


class ObligationCreate(BaseModel):
    application_id: int | None = Field(default=None, gt=0)
    owner_user_id: int | None = Field(default=None, gt=0)
    obligation_type: str = Field(min_length=2, max_length=60)
    title: str = Field(min_length=3, max_length=240)
    description: str | None = Field(default=None, max_length=5000)
    due_at: datetime | None = None
    policy_reference: str | None = Field(default=None, max_length=240)
    policy_id: int | None = Field(default=None, gt=0)
    deadline_rule: Literal['manual', 'fixed_days_from_creation'] = 'manual'
    deadline_days: int | None = Field(default=None, ge=1, le=3650)


class ObligationUpdate(BaseModel):
    owner_user_id: int | None = Field(default=None, gt=0)
    title: str | None = Field(default=None, min_length=3, max_length=240)
    description: str | None = Field(default=None, max_length=5000)
    due_at: datetime | None = None
    status: ObligationStatus | None = None
    policy_reference: str | None = Field(default=None, max_length=240)


class ObligationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int | None
    owner_user_id: int | None
    obligation_type: str
    title: str
    description: str | None
    due_at: datetime | None
    status: str
    policy_reference: str | None
    policy_id: int | None
    policy_key_snapshot: str | None
    policy_version_snapshot: int | None
    deadline_rule: str
    deadline_days: int | None
    deadline_calculation_json: str | None
    due_at_calculated_at: datetime | None
    created_at: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_user_id: int | None
    event_key: str
    channel: str
    status: str
    attempt_count: int
    payload_json: str
    last_error: str | None
    next_attempt_at: datetime | None
    processed_at: datetime | None
    created_at: datetime
