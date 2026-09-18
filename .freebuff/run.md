# PocketCoach AI — how to run

Two processes, one repo. The web app is a Vite + React SPA in `pocketcoach-ai/`;
accounts live in a FastAPI backend in `pocketcoach-ai/backend/`.

## 1. Reproduce the artifacts

Nothing is pre-built; both processes generate their state at first run.

- **Node deps** (from `pocketcoach-ai/`): `npm install`
- **Python deps**: Python 3.10+ with `fastapi`, `uvicorn`, `pydantic` (see
  `pocketcoach-ai/backend/requirements.txt`). Install with
  `python -m pip install -r backend/requirements.txt` — or just run the backend
  once via the launcher below, which probes for a working interpreter
  (on Windows a bare `python` may be the Microsoft Store stub; the launcher
  checks `%LOCALAPPDATA%\Programs\Python\Python3XX\python.exe` too) and prints
  install instructions if none qualifies. Override with `POCKETCOACH_PYTHON`.
- **Backend state**: created automatically on first start —
  `backend/data/pocketcoach.db` (SQLite) and `backend/data/secret.key` (generated
  JWT signing key). Both are gitignored; delete them for a factory reset.

## 2. Run

- **Frontend** (from `pocketcoach-ai/`): `npm run dev` →
  `http://127.0.0.1:5173` (strictPort, so it fails loudly rather than drifting).
- **Backend** (from `pocketcoach-ai/`): `npm run backend` →
  `http://127.0.0.1:8000`, docs at `/docs`. `npm run backend:smoke` runs the
  auth test suite (51 checks, exits non-zero on failure).
- Vite proxies `/api` → `127.0.0.1:8000`, so the browser uses one origin and no
  CORS setup is needed in development.
- The sign-in flow needs the backend; the app degrades gracefully without it
  (guest mode, friendly offline banner).

Detached (PowerShell), per this workspace's convention:

```powershell
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\25IT1202\Projects\pocketcoach-ai' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru
```
