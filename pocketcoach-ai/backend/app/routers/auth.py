"""Authentication: register, login, me, refresh, logout."""

from __future__ import annotations

import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.db import (
    find_user_by_email,
    get_db,
    new_user_id,
    public_user,
    revoke_token,
    utcnow,
)
from app.deps import AuthError, current_session
from app.schemas import LoginIn, RegisterIn, TokenOut, UserOut
from app.security import create_access_token, hash_password, verify_password
from app.throttle import login_throttle

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue(row: sqlite3.Row) -> TokenOut:
    issued = create_access_token(subject=row["id"], email=row["email"])
    return TokenOut(
        accessToken=issued.token,
        expiresIn=issued.expires_in,
        expiresAt=issued.expires_at,
        user=UserOut(**public_user(row)),
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, connection: Annotated[sqlite3.Connection, Depends(get_db)]) -> TokenOut:
    """Create an account and sign the athlete in immediately."""
    if find_user_by_email(connection, payload.email) is not None:
        raise AuthError(
            "email-taken",
            "An account with that email already exists. Try signing in instead.",
            status_code=status.HTTP_409_CONFLICT,
        )

    user_id = new_user_id()
    now = utcnow()
    try:
        connection.execute(
            """
            INSERT INTO users (id, name, email, email_key, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                payload.name,
                payload.email.strip(),
                payload.email.strip().lower(),
                hash_password(payload.password),
                now,
                now,
            ),
        )
        connection.commit()
    except sqlite3.IntegrityError as exc:  # race between the check and the insert
        raise AuthError(
            "email-taken",
            "An account with that email already exists. Try signing in instead.",
            status_code=status.HTTP_409_CONFLICT,
        ) from exc

    row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    assert row is not None  # just inserted
    return _issue(row)


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, connection: Annotated[sqlite3.Connection, Depends(get_db)]) -> TokenOut:
    email_key = payload.email.strip().lower()
    wait = login_throttle.retry_after(email_key)
    if wait:
        raise AuthError(
            "too-many-attempts",
            f"Too many sign-in attempts. Try again in about {max(1, wait // 60)} minute(s).",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    row = find_user_by_email(connection, email_key)
    # Same message and the same work either way, so this cannot be used to
    # discover which emails have accounts.
    stored = row["password_hash"] if row is not None else hash_password("placeholder-for-timing")
    if row is None or not verify_password(payload.password, stored):
        login_throttle.record_failure(email_key)
        raise AuthError("bad-credentials", "That email and password don't match an account.")

    login_throttle.reset(email_key)
    return _issue(row)


@router.get("/me", response_model=UserOut)
def me(session: Annotated[dict, Depends(current_session)]) -> UserOut:
    return UserOut(**public_user(session["row"]))


@router.post("/refresh", response_model=TokenOut)
def refresh(session: Annotated[dict, Depends(current_session)]) -> TokenOut:
    """Rotate the presented token: the old one is revoked as the new one is issued."""
    revoke_token(session["connection"], session["jti"], session["row"]["id"], session["exp"])
    return _issue(session["row"])


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(session: Annotated[dict, Depends(current_session)]) -> Response:
    revoke_token(session["connection"], session["jti"], session["row"]["id"], session["exp"])
    return Response(status_code=status.HTTP_204_NO_CONTENT)
