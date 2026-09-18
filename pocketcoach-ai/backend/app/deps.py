"""Shared dependencies: authentication, and the errors it raises."""

from __future__ import annotations

import sqlite3
from typing import Annotated, Any

from fastapi import Depends, Header

from app.db import find_user_by_id, get_db, is_token_revoked
from app.security import TokenError, decode_access_token


class AuthError(Exception):
    """Auth failures carry both a friendly message and a machine code."""

    def __init__(self, code: str, detail: str, status_code: int = 401) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.status_code = status_code


def bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise AuthError("missing-token", "Sign in to continue — this part of PocketCoach needs an account.")
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        raise AuthError("missing-token", "Sign in to continue — this part of PocketCoach needs an account.")
    return value.strip()


def current_session(
    connection: Annotated[sqlite3.Connection, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Resolve the bearer token to a live session.

    Returns the raw user row plus the token claims (`jti`, `exp`) so callers can
    revoke the exact token they were handed.
    """
    token = bearer_token(authorization)
    try:
        claims = decode_access_token(token)
    except TokenError as exc:
        raise AuthError(exc.code, exc.message) from exc

    if is_token_revoked(connection, claims["jti"]):
        raise AuthError("token-revoked", "That session was signed out. Sign in again to continue.")

    row = find_user_by_id(connection, claims["sub"])
    if row is None:
        raise AuthError("user-missing", "We couldn't find that account any more. Create a new one to continue.")

    return {"row": row, "jti": claims["jti"], "exp": int(claims["exp"]), "connection": connection}


def current_user(session: Annotated[dict[str, Any], Depends(current_session)]) -> sqlite3.Row:
    return session["row"]
