"""SQLite storage.

One file, no ORM: the demo backend only has to own identities, profiles and
token revocation. Athlete progress still lives in the browser (localStorage) —
when it moves server-side, the `progress`/`analysis`/`workout` routers can use
this same connection helper.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from app.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL,
    email_key      TEXT NOT NULL UNIQUE,     -- lowercased email, enforces uniqueness
    password_hash  TEXT NOT NULL,
    avatar_emoji   TEXT NOT NULL DEFAULT '🏀',
    goal_skill     TEXT NOT NULL DEFAULT 'basketball-jump-shot',
    goal_sport     TEXT NOT NULL DEFAULT 'basketball',
    selected_sports TEXT NOT NULL DEFAULT '["basketball"]',
    xp             INTEGER NOT NULL DEFAULT 0,
    streak         INTEGER NOT NULL DEFAULT 0,
    onboarded      INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti        TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_expires ON revoked_tokens (expires_at);
"""


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = Path(db_path or settings.db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        connection.execute("PRAGMA journal_mode = WAL")
    except sqlite3.DatabaseError:  # pragma: no cover - in-memory / odd filesystems
        pass
    return connection


def init_db(db_path: Path | None = None) -> None:
    with connect(db_path) as connection:
        connection.executescript(SCHEMA)


def get_db() -> Iterator[sqlite3.Connection]:
    """FastAPI dependency — one connection per request."""
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()


def new_user_id() -> str:
    return f"usr_{uuid.uuid4().hex[:16]}"


def normalise_email(email: str) -> str:
    return email.strip().lower()


def public_user(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    """Row → API shape. Never includes the password hash."""
    record = dict(row)
    try:
        selected_sports = json.loads(record.get("selected_sports") or "[]")
    except (TypeError, ValueError):
        selected_sports = []
    return {
        "id": record["id"],
        "name": record["name"],
        "email": record["email"],
        "avatarEmoji": record.get("avatar_emoji") or "🏀",
        "goalSkill": record.get("goal_skill"),
        "goalSport": record.get("goal_sport"),
        "selectedSports": selected_sports,
        "xp": int(record.get("xp") or 0),
        "streak": int(record.get("streak") or 0),
        "onboarded": bool(record.get("onboarded")),
        "createdAt": record.get("created_at"),
        "updatedAt": record.get("updated_at"),
    }


def find_user_by_email(connection: sqlite3.Connection, email: str) -> sqlite3.Row | None:
    return connection.execute(
        "SELECT * FROM users WHERE email_key = ?", (normalise_email(email),)
    ).fetchone()


def find_user_by_id(connection: sqlite3.Connection, user_id: str) -> sqlite3.Row | None:
    return connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def revoke_token(connection: sqlite3.Connection, jti: str, user_id: str, expires_at: int) -> None:
    connection.execute(
        "INSERT OR REPLACE INTO revoked_tokens (jti, user_id, expires_at, revoked_at) VALUES (?, ?, ?, ?)",
        (jti, user_id, expires_at, utcnow()),
    )
    # opportunistic cleanup — keep the table from growing forever
    connection.execute("DELETE FROM revoked_tokens WHERE expires_at < ?", (int(datetime.now(timezone.utc).timestamp()),))
    connection.commit()


def is_token_revoked(connection: sqlite3.Connection, jti: str) -> bool:
    row = connection.execute("SELECT 1 FROM revoked_tokens WHERE jti = ?", (jti,)).fetchone()
    return row is not None
