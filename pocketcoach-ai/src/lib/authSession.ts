/**
 * Session persistence.
 *
 * The access token and a cached copy of the profile live in localStorage so a
 * page reload does not sign the athlete out, and so the app can still render a
 * signed-in session while the backend is unreachable. Nothing else is stored —
 * no password ever reaches the client after the form is submitted.
 */

export type AuthStatus = 'booting' | 'anonymous' | 'guest' | 'authenticated';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarEmoji: string;
  goalSkill: string | null;
  goalSport: string | null;
  selectedSports: string[];
  xp: number;
  streak: number;
  onboarded: boolean;
  createdAt: string | null;
}

export interface Session {
  token: string;
  expiresAt: number;
  user: AuthUser;
}

const SESSION_KEY = 'pocketcoach-ai.auth.v1';

/** Treat a token as dead slightly early so a request never races the expiry. */
const CLOCK_SKEW_MS = 30_000;

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.token || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // private mode / quota — the session simply won't survive a reload
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function isExpired(session: Session, now = Date.now()): boolean {
  if (!session.expiresAt) return false; // server will tell us
  return session.expiresAt * 1000 - CLOCK_SKEW_MS <= now;
}

/** `user:<id>` for a real account, `guest` for the shared demo bucket. */
export function actorKeyFor(status: AuthStatus, user: AuthUser | null): string {
  return status === 'authenticated' && user ? `user:${user.id}` : 'guest';
}
