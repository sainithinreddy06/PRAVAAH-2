import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _production_settings(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        'app_env': 'production',
        'jwt_secret_key': 'j' * 40,
        'audit_checkpoint_secret': 'a' * 40,
        'cors_origins': 'https://portal.example.gov,https://admin.example.gov',
    }
    values.update(overrides)
    return values


def test_production_settings_require_a_strong_audit_checkpoint_secret() -> None:
    with pytest.raises(ValidationError, match='audit checkpoint secret'):
        Settings(**_production_settings(audit_checkpoint_secret='short'))


def test_production_settings_reject_wildcard_cors_origin() -> None:
    with pytest.raises(ValidationError, match='Wildcard CORS origins'):
        Settings(**_production_settings(cors_origins='https://portal.example.gov,*'))


def test_production_settings_accept_explicit_origins_and_strong_secrets() -> None:
    settings = Settings(**_production_settings())
    assert settings.app_env == 'production'
    assert settings.cors_origin_list == [
        'https://portal.example.gov',
        'https://admin.example.gov',
    ]


def test_development_settings_remain_usable_without_production_secrets() -> None:
    settings = Settings(app_env='development')
    assert settings.audit_checkpoint_secret == ''
