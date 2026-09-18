"""Request and response models.

Validation messages are written the way the athlete sees them — the client
surfaces the first message verbatim, so they must read like coaching, not like a
stack trace.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
PASSWORD_MIN = 8
PASSWORD_MAX = 128
NAME_MIN = 2
NAME_MAX = 48


def validate_email(value: str) -> str:
    cleaned = value.strip()
    if not EMAIL_RE.match(cleaned):
        raise ValueError("That email address doesn't look right. Check it and try again.")
    if len(cleaned) > 254:
        raise ValueError("That email address is too long.")
    return cleaned


def validate_password(value: str) -> str:
    if len(value) < PASSWORD_MIN:
        raise ValueError(f"Use at least {PASSWORD_MIN} characters for your password.")
    if len(value) > PASSWORD_MAX:
        raise ValueError(f"Passwords can be at most {PASSWORD_MAX} characters.")
    if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise ValueError("Mix at least one letter and one number into your password.")
    return value


def validate_name(value: str) -> str:
    cleaned = " ".join(value.split())
    if len(cleaned) < NAME_MIN:
        raise ValueError("Tell us what to call you — at least 2 characters.")
    if len(cleaned) > NAME_MAX:
        raise ValueError(f"Names can be at most {NAME_MAX} characters.")
    return cleaned


class RegisterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Display name")
    email: str
    password: str
    acceptedTerms: bool = False

    @field_validator("name")
    @classmethod
    def _check_name(cls, value: str) -> str:
        return validate_name(value)

    @field_validator("email")
    @classmethod
    def _check_email(cls, value: str) -> str:
        return validate_email(value)

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return validate_password(value)


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str
    password: str = Field(..., min_length=1, max_length=PASSWORD_MAX)

    @field_validator("email")
    @classmethod
    def _check_email(cls, value: str) -> str:
        return validate_email(value)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    avatarEmoji: str
    goalSkill: str | None = None
    goalSport: str | None = None
    selectedSports: list[str] = []
    xp: int = 0
    streak: int = 0
    onboarded: bool = False
    createdAt: str | None = None
    updatedAt: str | None = None


class TokenOut(BaseModel):
    accessToken: str
    tokenType: Literal["bearer"] = "bearer"
    expiresIn: int
    expiresAt: int
    user: UserOut


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    avatarEmoji: str | None = Field(default=None, max_length=8)
    goalSkill: str | None = Field(default=None, max_length=64)
    goalSport: Literal["basketball", "football", "fitness"] | None = None
    selectedSports: list[Literal["basketball", "football", "fitness"]] | None = None
    xp: int | None = Field(default=None, ge=0, le=1_000_000)
    streak: int | None = Field(default=None, ge=0, le=3650)
    onboarded: bool | None = None

    @field_validator("name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        return None if value is None else validate_name(value)


class MessageOut(BaseModel):
    detail: str
    code: str


class HealthOut(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    time: str
