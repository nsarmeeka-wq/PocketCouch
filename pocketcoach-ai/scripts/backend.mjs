#!/usr/bin/env node
/**
 * Launcher for the PocketCoach FastAPI backend.
 *
 *   npm run backend          start the API (uvicorn, reload on change)
 *   npm run backend:smoke    run the auth test suite against a throwaway server
 *
 * Why this exists: on Windows a bare `python` often resolves to the Microsoft
 * Store stub, which is not a real interpreter, and npm scripts run through cmd
 * where that shadowing happens. This script probes for an interpreter that
 * actually runs and has FastAPI installed, then says plainly what to install if
 * none does.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const backendDir = path.join(projectRoot, 'backend');
const isWindows = process.platform === 'win32';
const PORT = process.env.POCKETCOACH_API_PORT ?? '8000';

const runSmoke = process.argv.includes('--smoke') || process.argv.includes('--test');

function candidates() {
  const list = [];
  if (process.env.POCKETCOACH_PYTHON) list.push(process.env.POCKETCOACH_PYTHON);

  // A project-local virtualenv wins over anything global.
  list.push(isWindows ? path.join(backendDir, '.venv/Scripts/python.exe') : path.join(backendDir, '.venv/bin/python'));

  if (isWindows) {
    const local = process.env.LOCALAPPDATA;
    if (local) list.push(path.join(local, 'Programs/Python/Python313/python.exe'));
    if (local) list.push(path.join(local, 'Programs/Python/Python312/python.exe'));
    if (local) list.push(path.join(local, 'Programs/Python/Python311/python.exe'));
    if (local) list.push(path.join(local, 'Programs/Python/Python310/python.exe'));
    list.push('C:/Python313/python.exe', 'C:/Python312/python.exe', 'C:/Python311/python.exe');
  }
  list.push('python3', 'python');
  return list;
}

function probe(interpreter, code) {
  const result = spawnSync(interpreter, ['-c', code], { encoding: 'utf8', timeout: 20_000 });
  return result.status === 0 ? (result.stdout ?? '').trim() : null;
}

function findInterpreter() {
  for (const candidate of candidates()) {
    const isPath = candidate.includes('/') || candidate.includes('\\');
    if (isPath && !existsSync(candidate)) continue;

    const version = probe(candidate, 'import sys; print(".".join(map(str, sys.version_info[:3])))');
    if (!version) continue;

    const deps = probe(candidate, 'import fastapi, uvicorn; print(fastapi.__version__)');
    if (deps === null) {
      console.error(
        `\n  Found Python ${version} at ${candidate}, but FastAPI/uvicorn are missing.\n\n` +
          `  Install them (ideally into backend/.venv):\n` +
          `    ${candidate} -m pip install -r backend/requirements.txt\n`,
      );
      continue;
    }

    return { interpreter: candidate, version, fastapi: deps };
  }
  return null;
}

const found = findInterpreter();
if (!found) {
  console.error(
    '\n  No usable Python interpreter found.\n\n' +
      '  PocketCoach needs Python 3.10+ with FastAPI and uvicorn for accounts.\n' +
      '  Install Python, then run:\n' +
      '    python -m pip install -r backend/requirements.txt\n\n' +
      '  The training app itself still runs without it (`npm run dev`) —\n' +
      '  sign-in is the only feature that needs the backend.\n',
  );
  process.exit(1);
}

const { interpreter } = found;

if (runSmoke) {
  console.log(`\n  Running the auth suite with Python ${found.version} (${interpreter})\n`);
  const child = spawn(interpreter, ['smoke_test.py'], { cwd: backendDir, stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 1));
} else {
  console.log(`\n  PocketCoach API → http://127.0.0.1:${PORT}`);
  console.log(`  Docs           → http://127.0.0.1:${PORT}/docs`);
  console.log(`  Interpreter    → ${interpreter} (Python ${found.version}, FastAPI ${found.fastapi})\n`);
  const child = spawn(
    interpreter,
    ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', PORT],
    { cwd: backendDir, stdio: 'inherit' },
  );
  child.on('exit', (code) => process.exit(code ?? 0));
}
