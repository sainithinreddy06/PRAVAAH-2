from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_region_access, require_roles
from app.db.session import get_db
from app.models.application import Application
from app.models.evidence import Evidence
from app.models.institution import Institution
from app.models.obligation import Obligation
from app.models.undertaking import Undertaking
from app.models.user import User
from app.schemas.recommendations import ApplicationRecommendationsResponse, RecommendationItem

router = APIRouter(tags=['explainable recommendations'])
_ALLOWED_ROLES = ('regional_officer', 'platform_admin')


@router.get('/applications/{application_id}/recommendations', response_model=ApplicationRecommendationsResponse)
def application_recommendations(
    application_id: int,
    actor: User = Depends(require_roles(*_ALLOWED_ROLES)),
    db: Session = Depends(get_db),
) -> ApplicationRecommendationsResponse:
    row = db.execute(
        select(Application, Institution)
        .join(Institution, Application.institution_id == Institution.id)
        .where(Application.id == application_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail='Application not found')
    application, institution = row
    ensure_region_access(actor, institution.region_code)

    now = datetime.now(UTC)
    evidence = list(db.scalars(select(Evidence).where(Evidence.application_id == application_id)).all())
    obligations = list(db.scalars(select(Obligation).where(Obligation.application_id == application_id)).all())
    undertakings = list(db.scalars(select(Undertaking).where(Undertaking.application_id == application_id)).all())
    rejected = sum(item.review_status == 'rejected' for item in evidence)
    pending = sum(item.review_status == 'pending' for item in evidence)
    overdue = sum(
        item.status in {'open', 'in_progress'} and item.due_at is not None
        and item.due_at.date() < now.date() for item in obligations
    )
    due_soon = sum(
        item.status in {'open', 'in_progress'} and item.due_at is not None
        and now.date() <= item.due_at.date() <= (now + timedelta(days=7)).date()
        for item in obligations
    )
    unaccepted = sum(item.status != 'accepted' for item in undertakings)

    recommendations: list[RecommendationItem] = []
    factors: list[str] = []
    score = 0
    if not evidence:
        score += 25
        factors.append('No evidence has been attached.')
        recommendations.append(RecommendationItem(
            code='evidence_missing', severity='high', title='Evidence package is empty',
            explanation='No evidence records are attached to this application.',
            suggested_action='Check the applicable checklist and request required evidence before proceeding.',
        ))
    if rejected:
        score += min(50, rejected * 25)
        factors.append(f'{rejected} evidence item(s) have been rejected.')
        recommendations.append(RecommendationItem(
            code='evidence_rejected', severity='high', title='Resolve rejected evidence',
            explanation=f'{rejected} evidence item(s) need correction or replacement.',
            suggested_action='Review reviewer notes, replace or correct the files, and request review again.',
            evidence_count=rejected,
        ))
    if pending:
        score += min(25, pending * 8)
        factors.append(f'{pending} evidence item(s) are awaiting review.')
        recommendations.append(RecommendationItem(
            code='evidence_pending', severity='medium', title='Clear the evidence review queue',
            explanation=f'{pending} evidence item(s) have not yet been reviewed.',
            suggested_action='Assign a reviewer and complete the evidence review.',
            evidence_count=pending,
        ))
    if overdue:
        score += min(40, overdue * 20)
        factors.append(f'{overdue} obligation(s) are overdue.')
        recommendations.append(RecommendationItem(
            code='obligations_overdue', severity='high', title='Address overdue obligations',
            explanation=f'{overdue} open or in-progress obligation(s) passed their due date.',
            suggested_action='Contact owners, record progress, and agree a revised date where permitted.',
            evidence_count=overdue,
        ))
    if due_soon:
        score += min(20, due_soon * 5)
        factors.append(f'{due_soon} obligation(s) are due within seven days.')
        recommendations.append(RecommendationItem(
            code='obligations_due_soon', severity='medium', title='Prioritize upcoming deadlines',
            explanation=f'{due_soon} open or in-progress obligation(s) are due within seven days.',
            suggested_action='Confirm owners and required evidence before each deadline.',
            evidence_count=due_soon,
        ))
    if unaccepted:
        score += min(20, unaccepted * 5)
        factors.append(f'{unaccepted} undertaking(s) are not yet accepted.')
        recommendations.append(RecommendationItem(
            code='undertakings_pending', severity='medium', title='Complete undertaking review',
            explanation=f'{unaccepted} undertaking(s) are not in accepted status.',
            suggested_action='Submit draft undertakings and resolve reviewer feedback.',
            evidence_count=unaccepted,
        ))
    if not recommendations:
        factors.append('No configured evidence, obligation, or undertaking risk flags were found.')
        recommendations.append(RecommendationItem(
            code='no_flagged_gaps', severity='low', title='No configured risk flags found',
            explanation='The current rules detected no gaps in the categories they evaluate.',
            suggested_action='Continue normal officer review and verify requirements against authoritative policy.',
        ))

    score = min(score, 100)
    return ApplicationRecommendationsResponse(
        application_id=application.id,
        risk_score=score,
        risk_level='high' if score >= 60 else 'medium' if score >= 30 else 'low',
        assessed_at=now,
        factors=factors,
        recommendations=recommendations,
    )
