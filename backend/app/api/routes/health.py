from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Check API process health")
def health_check() -> HealthResponse:
    """Confirm the API process is responding; does not imply database readiness."""
    return HealthResponse(service=settings.app_name, environment=settings.app_env)


@router.get("/ready", response_model=ReadinessResponse, summary="Check service readiness")
def readiness_check(db: Session = Depends(get_db)) -> ReadinessResponse:
    """Return ready only when PostgreSQL can execute a lightweight query."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        ) from exc
    return ReadinessResponse()
