from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PRAVAAH API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://pravaah:pravaah@localhost:5432/pravaah"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    log_level: str = "INFO"
    jwt_secret_key: str = "development-only-change-me-before-deployment"
    access_token_expire_minutes: int = 30
    evidence_storage_dir: str = ".data/evidence"
    max_evidence_size_bytes: int = 10485760
    audit_checkpoint_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode='after')
    def validate_auth_settings(self) -> 'Settings':
        if self.access_token_expire_minutes < 1:
            raise ValueError('Access token lifetime must be positive')
        if self.max_evidence_size_bytes < 1:
            raise ValueError('Maximum evidence size must be positive')
        if self.app_env.casefold() == 'production':
            if (
                self.jwt_secret_key == 'development-only-change-me-before-deployment'
                or len(self.jwt_secret_key) < 32
            ):
                raise ValueError('Configure a strong JWT secret of at least 32 characters in production')
            if len(self.audit_checkpoint_secret) < 32:
                raise ValueError('Configure an audit checkpoint secret of at least 32 characters in production')
            if '*' in self.cors_origin_list:
                raise ValueError('Wildcard CORS origins are not allowed in production')
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
