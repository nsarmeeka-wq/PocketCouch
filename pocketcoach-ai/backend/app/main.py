"""PocketCoach AI API.

    python -m uvicorn app.main:app --reload --port 8000     # from backend/

Interactive docs land at http://127.0.0.1:8000/docs.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import init_db
from app.deps import AuthError
from app.routers import auth, users
from app.schemas import HealthOut

logger = logging.getLogger("pocketcoach")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="Accounts and sessions for PocketCoach AI. Analysis itself runs on-device.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["WWW-Authenticate"],
    )

    init_db()

    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(users.router, prefix=settings.api_prefix)

    # ---- error handling: the client only ever sees friendly text -------------

    @app.exception_handler(AuthError)
    async def _auth_error(_: Request, exc: AuthError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": exc.code},
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        """Flatten pydantic's list into the first human-readable sentence."""
        detail = "That request didn't look right. Check the fields and try again."
        code = "invalid-input"
        for error in exc.errors():
            message = str(error.get("msg", ""))
            if message:
                detail = message.removeprefix("Value error, ")
                break
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": detail, "code": code})

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        """Never leak a stack trace to the athlete; log it for whoever is on call."""
        logger.exception("unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Something went wrong on the coaching server. Try again in a moment.",
                "code": "server-error",
            },
        )

    # ---- meta ----------------------------------------------------------------

    @app.get(f"{settings.api_prefix}/health", response_model=HealthOut, tags=["meta"])
    def health() -> HealthOut:
        return HealthOut(
            status="ok",
            service=settings.app_name,
            version=settings.version,
            time=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        )

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health",
        }

    return app


app = create_app()
