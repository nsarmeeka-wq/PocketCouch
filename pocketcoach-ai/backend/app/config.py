"""Runtime configuration.

Everything is env-overridable so the same code runs in the hackathon demo and in
a container:

    POCKETCOACH_DATA_DIR     where the SQLite file and signing key live
    POCKETCOACH_SECRET_KEY   JWT signing key (generated + persisted if absent)
    POCKETCOACH_CORS_ORIGINS comma-separated allowed browser origins
    POCKETCOACH_TOKEN_TTL    access-token lifetime in seconds
"""

from __future__ import annotations

import os
import secrets
from dataclasses import dataclass
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _data_dir() -> Path:
    return Path(os.environ.get("POCKETCOACH_DATA_DIR", BACKEND_DIR / "data"))


def _load_secret_key() -> str:
    """Signing key: env first, otherwise generated once and stored locally.

    A generated key is persisted so sessions survive a server restart, and the
    file is created with owner-only permissions where the platform supports it.
    """
    from_env = os.environ.get("POCKETCOACH_SECRET_KEY")
    if from_env:
        return from_env

    directory = _data_dir()
    directory.mkdir(parents=True, exist_ok=True)
    key_path = directory / "secret.key"

    if key_path.exists():
        existing = key_path.read_text(encoding="utf-8").strip()
        if existing:
            return existing

    generated = secrets.token_urlsafe(48)
    key_path.write_text(generated, encoding="utf-8")
    try:
        key_path.chmod(0o600)
    except OSError:  # pragma: no cover - platform dependent (Windows)
        pass
    return generated


def _cors_origins() -> tuple[str, ...]:
    raw = os.environ.get("POCKETCOACH_CORS_ORIGINS")
    if raw:
        return tuple(item.strip() for item in raw.split(",") if item.strip())
    # Vite dev server + preview server, on both loopback spellings.
    return (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    )


@dataclass(frozen=True)
class Settings:
    app_name: str = "PocketCoach AI API"
    version: str = "1.0.0"
    api_prefix: str = "/api"
    algorithm: str = "HS256"
    issuer: str = "pocketcoach-ai"
    access_token_ttl_seconds: int = int(os.environ.get("POCKETCOACH_TOKEN_TTL", 60 * 60 * 12))
    # lock-out after repeated bad passwords for the same account
    max_login_attempts: int = 8
    login_window_seconds: int = 15 * 60

    @property
    def data_dir(self) -> Path:
        return _data_dir()

    @property
    def db_path(self) -> Path:
        return self.data_dir / "pocketcoach.db"

    @property
    def secret_key(self) -> str:
        return _load_secret_key()

    @property
    def cors_origins(self) -> tuple[str, ...]:
        return _cors_origins()


settings = Settings()
