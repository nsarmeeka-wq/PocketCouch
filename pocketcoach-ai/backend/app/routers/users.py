"""The signed-in athlete's own record."""

from __future__ import annotations

import json
import sqlite3
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Response, status

from app.db import find_user_by_id, get_db, public_user, utcnow
from app.deps import AuthError, current_session
from app.schemas import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

COLUMN_FOR_FIELD = {
    "name": "name",
    "avatarEmoji": "avatar_emoji",
    "goalSkill": "goal_skill",
    "goalSport": "goal_sport",
    "xp": "xp",
    "streak": "streak",
}


@router.get("/me", response_model=UserOut)
def read_me(session: Annotated[dict, Depends(current_session)]) -> UserOut:
    return UserOut(**public_user(session["row"]))


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    session: Annotated[dict, Depends(current_session)],
) -> UserOut:
    """Update the profile fields the athlete can edit.

    Only the supplied fields change; anything omitted keeps its stored value, so
    the client can send a single-field patch without round-tripping the rest.
    """
    connection: sqlite3.Connection = session["connection"]
    assignments: list[str] = []
    values: list[Any] = []

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is None:
            continue  # explicit nulls are ignored rather than wiping a field
        if field == "selectedSports":
            assignments.append("selected_sports = ?")
            values.append(json.dumps(value))
            continue
        if field == "onboarded":
            assignments.append("onboarded = ?")
            values.append(1 if value else 0)
            continue
        column = COLUMN_FOR_FIELD.get(field)
        if column:
            assignments.append(f"{column} = ?")
            values.append(value)

    if not assignments:
        raise AuthError("nothing-to-update", "Nothing to save — send at least one field that changed.", status_code=400)

    assignments.append("updated_at = ?")
    values.append(utcnow())
    values.append(session["row"]["id"])

    connection.execute(f"UPDATE users SET {', '.join(assignments)} WHERE id = ?", values)
    connection.commit()

    row = find_user_by_id(connection, session["row"]["id"])
    assert row is not None
    return UserOut(**public_user(row))


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(session: Annotated[dict, Depends(current_session)]) -> Response:
    """Delete the account and every token issued to it.

    The athlete's analyses and videos live in their browser, so this endpoint is
    the server-side half of "delete my data": nothing identifying is kept here.
    """
    connection: sqlite3.Connection = session["connection"]
    user_id = session["row"]["id"]
    connection.execute("DELETE FROM revoked_tokens WHERE user_id = ?", (user_id,))
    connection.execute("DELETE FROM users WHERE id = ?", (user_id,))
    connection.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{user_id}", response_model=UserOut)
def read_public_profile(
    user_id: str,
    session: Annotated[dict, Depends(current_session)],
) -> UserOut:
    """Minimal, authenticated read of another athlete's public profile.

    Deliberately narrow: no email, no progress, nothing private. Only your own
    record is ever returned in full.
    """
    if user_id == session["row"]["id"]:
        return UserOut(**public_user(session["row"]))
    row = find_user_by_id(session["connection"], user_id)
    if row is None:
        raise AuthError("user-missing", "We couldn't find that athlete.", status_code=404)
    public = public_user(row)
    public["email"] = ""
    public["xp"] = 0
    return UserOut(**public)
