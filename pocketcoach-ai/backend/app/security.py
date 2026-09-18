"""Password hashing and JWT issuing — standard library only.

Two deliberate choices:

* Passwords use **scrypt** (`hashlib.scrypt`, RFC 7914) with a per-user random
  salt and stored parameters, so the cost can be raised later without
  invalidating existing hashes. scrypt is memory-hard and is what `crypt(3)`
  itself recommends; it needs no third-party package.
* Tokens are **real HS256 JWTs** (RFC 7519): the same header/payload/signature
  format PyJWT produces, verified with `hmac.compare_digest`. The decoder pins
  the algorithm, rejects `alg: none` and unsigned tokens, and validates `exp`,
  `iat` and `iss`.

Swapping in PyJWT + bcrypt later only touches this module.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any

from app.config import settings

# --- password hashing -------------------------------------------------------

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_DKLEN = 32
_SALT_BYTES = 16


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    """Hash a password into a self-describing string."""
    if not password:
        raise ValueError("password must not be empty")
    salt = secrets.token_bytes(_SALT_BYTES)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_DKLEN,
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64e(salt)}${_b64e(derived)}"


def verify_password(password: str, encoded: str) -> bool:
    """Constant-time verification. Never raises on malformed input."""
    try:
        scheme, n_raw, r_raw, p_raw, salt_raw, hash_raw = encoded.split("$")
        if scheme != "scrypt":
            return False
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=_b64d(salt_raw),
            n=int(n_raw),
            r=int(r_raw),
            p=int(p_raw),
            dklen=len(_b64d(hash_raw)),
        )
        return hmac.compare_digest(derived, _b64d(hash_raw))
    except (ValueError, TypeError, MemoryError):
        return False


# --- tokens -----------------------------------------------------------------


class TokenError(Exception):
    """Raised for any invalid token, with a machine-readable code."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class IssuedToken:
    token: str
    jti: str
    expires_at: int
    expires_in: int


def _sign(signing_input: bytes) -> bytes:
    return hmac.new(settings.secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()


def create_access_token(subject: str, email: str, ttl_seconds: int | None = None) -> IssuedToken:
    ttl = settings.access_token_ttl_seconds if ttl_seconds is None else ttl_seconds
    now = int(time.time())
    expires_at = now + ttl
    jti = secrets.token_urlsafe(16)
    header = {"alg": settings.algorithm, "typ": "JWT"}
    payload: dict[str, Any] = {
        "sub": subject,
        "email": email,
        "iss": settings.issuer,
        "iat": now,
        "exp": expires_at,
        "jti": jti,
    }
    segments = f"{_b64e(json.dumps(header, separators=(',', ':')).encode())}.{_b64e(json.dumps(payload, separators=(',', ':')).encode())}"
    signature = _b64e(_sign(segments.encode("ascii")))
    return IssuedToken(token=f"{segments}.{signature}", jti=jti, expires_at=expires_at, expires_in=ttl)


def decode_access_token(token: str) -> dict[str, Any]:
    """Verify signature + claims. Raises TokenError with a friendly code."""
    if not token or token.count(".") != 2:
        raise TokenError("invalid-token", "That session token is not readable.")

    header_raw, payload_raw, signature = token.split(".")

    try:
        header = json.loads(_b64d(header_raw))
        payload = json.loads(_b64d(payload_raw))
    except (ValueError, TypeError):
        raise TokenError("invalid-token", "That session token is not readable.") from None

    if not isinstance(header, dict) or not isinstance(payload, dict):
        raise TokenError("invalid-token", "That session token is not readable.")

    # Pin the algorithm: refuse "none" and any downgrade attempt.
    if header.get("alg") != settings.algorithm or header.get("typ") != "JWT":
        raise TokenError("invalid-token", "That session token uses an unsupported algorithm.")

    expected = _sign(f"{header_raw}.{payload_raw}".encode("ascii"))
    try:
        provided = _b64d(signature)
    except (ValueError, TypeError):
        raise TokenError("invalid-token", "That session token is not readable.") from None

    if not hmac.compare_digest(expected, provided):
        raise TokenError("invalid-signature", "That session token failed its signature check.")

    if payload.get("iss") != settings.issuer:
        raise TokenError("invalid-token", "That session token was not issued by PocketCoach.")
    if not payload.get("sub") or not payload.get("jti"):
        raise TokenError("invalid-token", "That session token is incomplete.")

    now = int(time.time())
    exp = payload.get("exp")
    if not isinstance(exp, int) or exp <= now:
        raise TokenError("token-expired", "Your session expired. Sign in again to continue.")
    iat = payload.get("iat")
    if isinstance(iat, int) and iat > now + 60:
        raise TokenError("invalid-token", "That session token is not valid yet.")

    return payload


def new_jti() -> str:
    return secrets.token_urlsafe(16)
