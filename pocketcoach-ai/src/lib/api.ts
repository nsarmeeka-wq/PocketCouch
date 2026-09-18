/**
 * Client for the PocketCoach API (FastAPI, see `backend/`).
 *
 * Two rules shape this file:
 *   1. The athlete never reads a technical error. Every failure becomes an
 *      `ApiError` whose `friendly` string is safe to render.
 *   2. The app must survive the API being down. `ApiError.offline` lets callers
 *      degrade to guest mode instead of showing a dead screen.
 */

const DEFAULT_BASE_URL = '/api';
const DEFAULT_TIMEOUT_MS = 12_000;

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? DEFAULT_BASE_URL;

export class ApiError extends Error {
  /** machine code from the API, or a client-side one (`network`, `timeout`) */
  readonly code: string;
  readonly status: number;
  /** copy written for the athlete */
  readonly friendly: string;
  /** true when the request never reached the server */
  readonly offline: boolean;

  constructor(options: { code: string; status: number; friendly: string; offline?: boolean }) {
    super(options.friendly);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.friendly = options.friendly;
    this.offline = Boolean(options.offline);
  }
}

export const OFFLINE_MESSAGE =
  "We couldn't reach the PocketCoach server. Check that the backend is running — you can still explore in guest mode.";
const TIMEOUT_MESSAGE = 'The coaching server is taking too long to answer. Try again in a moment.';
const SERVER_MESSAGE = 'Something went wrong on the coaching server. Try again in a moment.';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

function fallbackFor(status: number): string {
  if (status === 400) return "That request didn't look right. Check the form and try again.";
  if (status === 401) return 'Your session is no longer valid. Sign in again to continue.';
  if (status === 403) return "You don't have access to that.";
  if (status === 404) return "We couldn't find that account.";
  if (status === 409) return 'That account already exists. Try signing in instead.';
  if (status === 429) return 'Too many attempts. Wait a minute and try again.';
  if (status === 422) return 'Some of those details need fixing — check the form and try again.';
  if (status >= 500) return SERVER_MESSAGE;
  return SERVER_MESSAGE;
}

/** Prefer the server's message: it is written for humans on the backend too. */
function messageFrom(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  // FastAPI's own validation errors arrive as a list of issues
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === 'string' && first.msg.trim()) {
      return first.msg.replace(/^Value error,\s*/, '').trim();
    }
  }
  return undefined;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    throw new ApiError({
      code: aborted ? 'timeout' : 'network',
      status: 0,
      friendly: aborted ? TIMEOUT_MESSAGE : OFFLINE_MESSAGE,
      offline: true,
    });
  } finally {
    window.clearTimeout(timer);
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let payload: unknown = undefined;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    throw new ApiError({
      code: ((payload as { code?: string } | undefined)?.code ?? `http-${response.status}`) || 'error',
      status: response.status,
      friendly: messageFrom(payload) ?? fallbackFor(response.status),
    });
  }

  return payload as T;
}

export function isOffline(error: unknown): boolean {
  return error instanceof ApiError && error.offline;
}

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.friendly;
  if (error instanceof Error && error.message) return error.message;
  return SERVER_MESSAGE;
}
