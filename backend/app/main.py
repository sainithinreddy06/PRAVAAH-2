import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.applications import router as applications_router
from app.api.routes.compliance import router as compliance_router
from app.api.routes.evc import router as evc_router
from app.api.routes.health import router as health_router
from app.api.routes.obligations import router as obligations_router
from app.api.routes.operations import router as operations_router
from app.core.config import settings

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title=settings.app_name,
    description="API foundation for the PRAVAAH approval and compliance platform.",
    version="0.5.0",
    docs_url="/docs" if settings.app_env != "production" else None,
    redoc_url="/redoc" if settings.app_env != "production" else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(applications_router, prefix=settings.api_v1_prefix)
app.include_router(compliance_router, prefix=settings.api_v1_prefix)
app.include_router(obligations_router, prefix=settings.api_v1_prefix)
app.include_router(evc_router, prefix=settings.api_v1_prefix)
app.include_router(operations_router, prefix=settings.api_v1_prefix)


@app.get("/", tags=["meta"])
def root() -> dict[str, str]:
    docs_path = "/docs" if settings.app_env != "production" else "disabled"
    return {"service": settings.app_name, "version": app.version, "docs": docs_path}
