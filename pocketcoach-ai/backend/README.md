# PocketCoach AI — backend

Accounts and sessions for the training app. Everything else (pose analysis,
measurement, drills, recommendations) runs on-device in the browser.

## Run it

```bash
# from the project root
npm run backend          # http://127.0.0.1:8000 · docs at /docs
npm run backend:smoke    # the auth test suite, exits non-zero on failure
```

`npm run backend` resolves a Python interpreter for you — including the case on
Windows where a bare `python` is the Microsoft Store stub rather than a real
interpreter. To choose one explicitly, set `POCKETCOACH_PYTHON` (or create
`backend/.venv` and it is used automatically).

Manual equivalent:

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
python smoke_test.py
```

The Vite dev server proxies `/api` to this port, so the browser talks to the same
origin and no CORS configuration is needed in development.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `POCKETCOACH_SECRET_KEY` | generated once into `backend/data/secret.key` | JWT signing key |
| `POCKETCOACH_DATA_DIR` | `backend/data` | SQLite file + signing key |
| `POCKETCOACH_TOKEN_TTL` | `43200` (12 h) | access-token lifetime, seconds |
| `POCKETCOACH_CORS_ORIGINS` | localhost/127.0.0.1 on 5173 + 4173 | allowed browser origins |

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/health` | liveness + version |
| `POST` | `/api/auth/register` | `{name, email, password}` → token + user (409 if taken) |
| `POST` | `/api/auth/login` | `{email, password}` → token + user (throttled) |
| `GET` | `/api/auth/me` | current athlete for the bearer token |
| `POST` | `/api/auth/refresh` | rotates the token; the old one is revoked |
| `POST` | `/api/auth/logout` | revokes the presented token |
| `GET` `PATCH` `DELETE` | `/api/users/me` | read, update, or delete the account |
| `GET` | `/api/users/{id}` | minimal public profile (no email, no progress) |

The remaining modules from the product spec (`/videos`, `/analysis`, `/skills`,
`/drills`, `/workouts`, `/progress`, `/coach`) mount the same way — see
`app/routers/__init__.py`.

## Security notes

- **Passwords**: salted **scrypt** (`hashlib.scrypt`, N=2¹⁴) with the parameters
  stored alongside the hash, so cost can be raised without invalidating existing
  logins. Only the hash is ever stored; it is never returned by an endpoint.
- **Sessions**: HS256 JWTs with `sub`/`jti`/`iat`/`exp`/`iss`. The decoder pins
  the algorithm, so an `alg: none` forgery is rejected, and every failure mode
  (bad signature, expiry, revoked token) has its own message.
- **Sign-out is real**: revoking a `jti` kills that token server-side rather than
  trusting the client to forget it.
- **No account enumeration**: an unknown email and a wrong password produce the
  same status and the same message, and the unknown-email path still does a hash
  so the timing matches.
- **Brute force**: 8 failed logins per account per 15 minutes, then `429`.
- **Errors**: the client only ever receives text written for a human; stack
  traces go to the server log.

`smoke_test.py` asserts all of the above — 51 checks including forged tokens,
expired tokens, replay after logout, enumeration and the throttle.
