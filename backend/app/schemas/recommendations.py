from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class RecommendationItem(BaseModel):
    code: str
    severity: Literal['high', 'medium', 'low']
    title: str
    explanation: str
    suggested_action: str
    evidence_count: int = 1


class ApplicationRecommendationsResponse(BaseModel):
    application_id: int
    risk_score: int
    risk_level: Literal['high', 'medium', 'low']
    assessed_at: datetime
    factors: list[str]
    recommendations: list[RecommendationItem]
    disclaimer: str = 'Rule-based operational guidance only; not an official compliance decision.'
