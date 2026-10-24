from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

_password_hasher = PasswordHasher()
_ALGORITHM = 'HS256'


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return _password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    lifetime = expires_minutes or settings.access_token_expire_minutes
    now = datetime.now(UTC)
    payload = {'sub': subject, 'iat': now, 'exp': now + timedelta(minutes=lifetime), 'type': 'access'}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict[str, object]:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[_ALGORITHM])
    if payload.get('type') != 'access' or not payload.get('sub'):
        raise jwt.InvalidTokenError('Invalid access token')
    return payload
