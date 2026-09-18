import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, apiRequest, isOffline, messageFor } from '@/lib/api';
import {
  actorKeyFor,
  clearSession,
  isExpired,
  readSession,
  writeSession,
  type AuthStatus,
  type AuthUser,
  type Session,
} from '@/lib/authSession';

interface TokenResponse {
  accessToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

interface AuthValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** namespaces this athlete's local training data */
  actorKey: string;
  /** true when a cached session is in use because the API is unreachable */
  offline: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  updateProfile: (patch: Partial<AuthUser>) => Promise<void>;
  /** best-effort mirror of gamification onto the account; never throws */
  syncProgress: (patch: { xp?: number; streak?: number; onboarded?: boolean }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [session, setSession] = useState<Session | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const applySession = useCallback((next: Session | null) => {
    if (next) {
      writeSession(next);
      setSession(next);
      setStatus('authenticated');
    } else {
      clearSession();
      setSession(null);
      setStatus('anonymous');
    }
  }, []);

  /* Boot: adopt a stored session, then confirm it with the server. A token the
     server rejects signs the athlete out; a server we cannot reach does not —
     they keep working offline with the cached profile. */
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const stored = readSession();
      if (!stored || isExpired(stored)) {
        clearSession();
        if (!cancelled) setStatus('anonymous');
        return;
      }

      setSession(stored);
      setStatus('authenticated');

      try {
        const user = await apiRequest<AuthUser>('/auth/me', { token: stored.token });
        if (cancelled) return;
        const refreshed: Session = { ...stored, user };
        writeSession(refreshed);
        setSession(refreshed);
        setOffline(false);
      } catch (err) {
        if (cancelled) return;
        if (isOffline(err)) {
          setOffline(true);
          return;
        }
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          applySession(null);
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const authenticate = useCallback(
    async (path: string, body: unknown) => {
      setError(null);
      try {
        const result = await apiRequest<TokenResponse>(path, { method: 'POST', body });
        setOffline(false);
        applySession({ token: result.accessToken, expiresAt: result.expiresAt, user: result.user });
      } catch (err) {
        const message = messageFor(err);
        setError(message);
        throw err;
      }
    },
    [applySession],
  );

  const signIn = useCallback((email: string, password: string) => authenticate('/auth/login', { email, password }), [authenticate]);

  const signUp = useCallback(
    (input: SignUpInput) => authenticate('/auth/register', { ...input, acceptedTerms: true }),
    [authenticate],
  );

  const signOut = useCallback(async () => {
    const current = session;
    applySession(null);
    setError(null);
    if (!current) return;
    try {
      // Best effort: revoke server-side, but never block the athlete on it.
      await apiRequest<void>('/auth/logout', { method: 'POST', token: current.token });
    } catch {
      // the local session is already gone, which is what the athlete asked for
    }
  }, [applySession, session]);

  const continueAsGuest = useCallback(() => {
    applySession(null);
    setStatus('guest');
    setError(null);
    setOffline(false);
  }, [applySession]);

  const updateProfile = useCallback(
    async (patch: Partial<AuthUser>) => {
      if (!session) return;
      setError(null);
      const user = await apiRequest<AuthUser>('/users/me', { method: 'PATCH', body: patch, token: session.token });
      const next: Session = { ...session, user };
      writeSession(next);
      setSession(next);
    },
    [session],
  );

  const syncProgress = useCallback(
    async (patch: { xp?: number; streak?: number; onboarded?: boolean }) => {
      if (!session || status !== 'authenticated') return;
      try {
        const user = await apiRequest<AuthUser>('/users/me', { method: 'PATCH', body: patch, token: session.token });
        setOffline(false);
        setSession((current) => {
          if (!current || current.token !== session.token) return current;
          const next: Session = { ...current, user };
          writeSession(next);
          return next;
        });
      } catch (err) {
        // Silent by design: the athlete's training is not interrupted by this.
        if (isOffline(err)) setOffline(true);
      }
    },
    [session, status],
  );

  const deleteAccount = useCallback(async () => {
    if (!session) return;
    try {
      await apiRequest<void>('/users/me', { method: 'DELETE', token: session.token });
    } finally {
      applySession(null);
    }
  }, [applySession, session]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user: session?.user ?? null,
      actorKey: actorKeyFor(status, session?.user ?? null),
      offline,
      error,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
      updateProfile,
      syncProgress,
      deleteAccount,
      clearError,
    }),
    [status, session, offline, error, signIn, signUp, signOut, continueAsGuest, updateProfile, syncProgress, deleteAccount, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
