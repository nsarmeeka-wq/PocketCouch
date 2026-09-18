"""End-to-end auth checks for the PocketCoach AI API.

Deliberately dependency-light: it boots the real uvicorn server in a thread and
talks to it over HTTP with the standard library, so no test client, no pytest and
no pinned versions are required — and a failure to *boot* the server is caught
here rather than at demo time.

    python smoke_test.py            # from backend/, exits non-zero on failure

Covers the contract the app depends on, including the parts that must *fail*:
token tampering, `alg: none` forgeries, expired tokens, replay after logout,
email enumeration, and the login throttle.
"""

from __future__ import annotations

import base64
import json
import os
import socket
import sqlite3
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

# Windows consoles default to cp1252, which cannot encode the ✓ below.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
except (AttributeError, OSError):  # pragma: no cover
    pass

# Isolate storage + signing key BEFORE app.config is imported.
DATA_DIR = tempfile.mkdtemp(prefix="pocketcoach-smoke-")
os.environ["POCKETCOACH_DATA_DIR"] = DATA_DIR
os.environ["POCKETCOACH_SECRET_KEY"] = "smoke-test-signing-key"

import uvicorn  # noqa: E402  (import after env setup)

from app.config import settings  # noqa: E402
from app.main import app  # noqa: E402
from app.security import create_access_token  # noqa: E402

PASSWORD = "DrivewayDimes7"
EMAIL = "arjun@pocketcoach.ai"


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class Response:
    """Just enough of a response object for the assertions below."""

    def __init__(self, status: int, headers: dict[str, str], text: str) -> None:
        self.status_code = status
        # HTTP header names are case-insensitive; store them canonically so
        # assertions can use either spelling.
        self.headers = {key.lower(): value for key, value in headers.items()}
        self.text = text
        try:
            self.json: dict = json.loads(text) if text else {}
        except ValueError:
            self.json = {}

    def header(self, name: str) -> str:
        return self.headers.get(name.lower(), "")


PORT = _free_port()
BASE_URL = f"http://127.0.0.1:{PORT}"
SERVER = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning"))
THREAD = threading.Thread(target=SERVER.run, name="pocketcoach-smoke-server", daemon=True)
THREAD.start()
for _ in range(150):
    if SERVER.started:
        break
    time.sleep(0.1)
else:  # pragma: no cover
    raise SystemExit("uvicorn never became ready")


def api(
    method: str,
    path: str,
    json_body: dict | None = None,
    token: str | None = None,
    authorization: str | None = None,
) -> Response:
    data = json.dumps(json_body).encode("utf-8") if json_body is not None else None
    request = urllib.request.Request(f"{BASE_URL}{path}", data=data, method=method)
    if data is not None:
        request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    if authorization:
        request.add_header("Authorization", authorization)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return Response(response.status, dict(response.headers), response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        return Response(error.code, dict(error.headers), error.read().decode("utf-8"))


class client:  # noqa: N801 - keeps the call sites below readable
    @staticmethod
    def get(path: str, headers: dict[str, str] | None = None, **_: object) -> Response:
        auth = (headers or {}).get("Authorization", "")
        return api("GET", path, authorization=auth or None)

    @staticmethod
    def post(path: str, json: dict | None = None, headers: dict[str, str] | None = None, **_: object) -> Response:
        return _with_auth("POST", path, json, headers)

    @staticmethod
    def patch(path: str, json: dict | None = None, headers: dict[str, str] | None = None, **_: object) -> Response:
        return _with_auth("PATCH", path, json, headers)

    @staticmethod
    def delete(path: str, headers: dict[str, str] | None = None, **_: object) -> Response:
        auth = (headers or {}).get("Authorization", "")
        return api("DELETE", path, authorization=auth or None)


def _with_auth(method: str, path: str, body: dict | None, headers: dict[str, str] | None) -> Response:
    auth = (headers or {}).get("Authorization", "")
    return api(method, path, json_body=body, authorization=auth or None)

_results: list[tuple[bool, str]] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    _results.append((bool(condition), label))
    icon = "PASS" if condition else "FAIL"
    suffix = f"  — {detail}" if detail and not condition else ""
    print(f"  [{icon}] {label}{suffix}")


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


print("\n== meta ==")
health = client.get("/api/health")
check("health returns ok", health.status_code == 200 and health.json["status"] == "ok", health.text)
check("root advertises docs", client.get("/").status_code == 200)

print("\n== register ==")
response = client.post("/api/auth/register", json={"name": "Arjun", "email": EMAIL, "password": PASSWORD})
check("register returns 201", response.status_code == 201, response.text)
body = response.json
token = body.get("accessToken", "")
user_id = body.get("user", {}).get("id", "")
check("register issues a token", bool(token) and token.count(".") == 2)
check("register returns the athlete", body.get("user", {}).get("email") == EMAIL, str(body.get("user")))
check("register sets a token lifetime", body.get("expiresIn", 0) > 0)
check("no password material in the response", "password" not in response.text.lower() and PASSWORD not in response.text)

duplicate = client.post("/api/auth/register", json={"name": "Arjun Again", "email": EMAIL, "password": PASSWORD})
check("duplicate email is refused (409)", duplicate.status_code == 409, duplicate.text)
check("duplicate email carries a code", duplicate.json.get("code") == "email-taken")

mixed_case = client.post("/api/auth/register", json={"name": "Copy", "email": EMAIL.upper(), "password": PASSWORD})
check("email uniqueness ignores case", mixed_case.status_code == 409, mixed_case.text)

weak = client.post("/api/auth/register", json={"name": "Weak", "email": "weak@example.com", "password": "short"})
check("short password refused (422)", weak.status_code == 422, weak.text)
check("short password message is human", "at least 8 characters" in weak.json.get("detail", ""), weak.text)

no_digit = client.post("/api/auth/register", json={"name": "Weak", "email": "weak2@example.com", "password": "onlyletters"})
check("password needs a number", no_digit.status_code == 422, no_digit.text)

bad_email = client.post("/api/auth/register", json={"name": "Bad", "email": "not-an-email", "password": PASSWORD})
check("malformed email refused", bad_email.status_code == 422, bad_email.text)

short_name = client.post("/api/auth/register", json={"name": "A", "email": "short@example.com", "password": PASSWORD})
check("one-letter name refused", short_name.status_code == 422, short_name.text)

print("\n== storage ==")
with sqlite3.connect(settings.db_path) as connection:
    stored = connection.execute("SELECT password_hash FROM users WHERE email_key = ?", (EMAIL,)).fetchone()
check("password is stored hashed with scrypt", bool(stored) and stored[0].startswith("scrypt$"), str(stored))
check("stored hash does not contain the password", bool(stored) and PASSWORD not in stored[0])

print("\n== login ==")
login = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
check("login succeeds", login.status_code == 200, login.text)
login_token = login.json.get("accessToken", "")
check("login issues a fresh token", bool(login_token) and login_token != token)

wrong = client.post("/api/auth/login", json={"email": EMAIL, "password": "WrongPass123"})
check("wrong password refused (401)", wrong.status_code == 401, wrong.text)
check("wrong password is friendly", wrong.json.get("detail", "").startswith("That email and password"), wrong.text)

unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})
check("unknown email returns the same error", unknown.status_code == 401 and unknown.json.get("code") == "bad-credentials", unknown.text)
check("no user enumeration", wrong.json.get("detail") == unknown.json.get("detail"))

print("\n== sessions ==")
me = client.get("/api/auth/me", headers=auth_header(login_token))
check("me returns the athlete", me.status_code == 200 and me.json["id"] == user_id, me.text)
check("me never leaks a hash", "password" not in me.text.lower())

no_token = client.get("/api/auth/me")
check("missing token refused (401)", no_token.status_code == 401, no_token.text)
check("missing token advertises the scheme", "bearer" in no_token.header("WWW-Authenticate").lower(), str(no_token.headers))

malformed = client.get("/api/auth/me", headers={"Authorization": "Basic abc"})
check("non-bearer scheme refused", malformed.status_code == 401, malformed.text)

header_raw, payload_raw, signature = login_token.split(".")
flipped = ("A" if signature[0] != "A" else "B") + signature[1:]
tampered = client.get("/api/auth/me", headers=auth_header(f"{header_raw}.{payload_raw}.{flipped}"))
check("tampered signature refused", tampered.status_code == 401 and tampered.json.get("code") == "invalid-signature", tampered.text)

forged_payload = b64e(json.dumps({"sub": user_id, "email": EMAIL, "iss": settings.issuer, "jti": "x", "iat": int(time.time()), "exp": int(time.time()) + 3600}, separators=(",", ":")).encode())
none_header = b64e(json.dumps({"alg": "none", "typ": "JWT"}, separators=(",", ":")).encode())
alg_none = client.get("/api/auth/me", headers=auth_header(f"{none_header}.{forged_payload}."))
check("alg:none forgery refused", alg_none.status_code == 401, alg_none.text)

expired = create_access_token(subject=user_id, email=EMAIL, ttl_seconds=-30).token
expired_response = client.get("/api/auth/me", headers=auth_header(expired))
check("expired token refused", expired_response.status_code == 401 and expired_response.json.get("code") == "token-expired", expired_response.text)

short_lived = create_access_token(subject=user_id, email=EMAIL, ttl_seconds=1).token
check("valid short-lived token accepted", client.get("/api/auth/me", headers=auth_header(short_lived)).status_code == 200)

print("\n== refresh and logout ==")
rotated = client.post("/api/auth/refresh", headers=auth_header(short_lived))
check("refresh issues a new token", rotated.status_code == 200 and rotated.json["accessToken"] != short_lived, rotated.text)
check("rotated-out token is revoked", client.get("/api/auth/me", headers=auth_header(short_lived)).status_code == 401)

logout = client.post("/api/auth/logout", headers=auth_header(login_token))
check("logout returns 204", logout.status_code == 204, logout.text)
after_logout = client.get("/api/auth/me", headers=auth_header(login_token))
check("token is dead after logout", after_logout.status_code == 401 and after_logout.json.get("code") == "token-revoked", after_logout.text)
check("signing in again still works", client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD}).status_code == 200)

print("\n== profile ==")
active = client.post("/api/auth/login", json={"email": EMAIL, "password": PASSWORD}).json["accessToken"]
patched = client.patch(
    "/api/users/me",
    headers=auth_header(active),
    json={"name": "Arjun S", "avatarEmoji": "🏀", "selectedSports": ["basketball", "fitness"], "xp": 540, "streak": 7},
)
check("patch updates the profile", patched.status_code == 200 and patched.json["name"] == "Arjun S", patched.text)
check("selected sports round-trip", patched.json.get("selectedSports") == ["basketball", "fitness"], patched.text)
check("patch persists", client.get("/api/users/me", headers=auth_header(active)).json["xp"] == 540)
check("empty patch is reported", client.patch("/api/users/me", headers=auth_header(active), json={}).status_code == 400)
check("bad sport refused", client.patch("/api/users/me", headers=auth_header(active), json={"goalSport": "cricket"}).status_code == 422)
check("profile needs a token", client.patch("/api/users/me", json={"name": "Nope"}).status_code == 401)

print("\n== privacy ==")
other = client.post("/api/auth/register", json={"name": "Rival", "email": "rival@example.com", "password": PASSWORD}).json
rival_view = client.get(f"/api/users/{user_id}", headers=auth_header(other["accessToken"]))
check("other athlete sees a minimal profile", rival_view.status_code == 200 and rival_view.json["email"] == "" and rival_view.json["xp"] == 0, rival_view.text)
check("own profile is returned in full", client.get(f"/api/users/{user_id}", headers=auth_header(active)).json["email"] == EMAIL)

print("\n== throttle ==")
target = "throttle@example.com"
client.post("/api/auth/register", json={"name": "Throttle", "email": target, "password": PASSWORD})
statuses = [client.post("/api/auth/login", json={"email": target, "password": "BadGuess123"}).status_code for _ in range(settings.max_login_attempts + 1)]
check("repeated failures are throttled (429)", statuses[-1] == 429, str(statuses))
blocked = client.post("/api/auth/login", json={"email": target, "password": PASSWORD})
check("throttle blocks even the right password", blocked.status_code == 429, blocked.text)
check("throttle message suggests when to retry", "try again in about" in blocked.json.get("detail", "").lower(), blocked.text)

print("\n== delete account ==")
doomed = client.post("/api/auth/register", json={"name": "Doomed", "email": "doomed@example.com", "password": PASSWORD}).json
doomed_token = doomed["accessToken"]
check("delete returns 204", client.delete("/api/users/me", headers=auth_header(doomed_token)).status_code == 204)
check("token dies with the account", client.get("/api/auth/me", headers=auth_header(doomed_token)).status_code == 401)
check("account can no longer sign in", client.post("/api/auth/login", json={"email": "doomed@example.com", "password": PASSWORD}).status_code == 401)

SERVER.should_exit = True
THREAD.join(timeout=5)

failed = [label for ok, label in _results if not ok]
print(f"\n{len(_results) - len(failed)}/{len(_results)} checks passed")
if failed:
    print("failed:")
    for label in failed:
        print(f"  - {label}")
    raise SystemExit(1)
print("all auth checks passed ✓")
