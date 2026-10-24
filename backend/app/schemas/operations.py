from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: int | None
    entity_type: str
    entity_id: str
    action: str
    reason: str | None
    details_json: str
    created_at: datetime


class OperationalMetricsResponse(BaseModel):
    applications_total: int
    applications_by_status: dict[str, int]
    evidence_total: int
    evidence_by_review_status: dict[str, int]
    obligations_total: int
    obligations_by_status: dict[str, int]
    undertakings_total: int
    undertakings_by_status: dict[str, int]
    overdue_obligations: int
