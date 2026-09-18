import type { AppState } from '@/lib/types';
import { seedState } from '@/data/sampleData';

const LEGACY_KEY = 'pocketcoach-ai.state.v1';
const KEY_PREFIX = 'pocketcoach-ai.state.v2';

/** One storage bucket per actor: a signed-in account, or the shared guest demo. */
export function storageKeyFor(actorKey: string): string {
  return `${KEY_PREFIX}::${actorKey}`;
}

/**
 * Persistence layer.
 *
 * State is namespaced by actor so signing in as someone else never inherits the
 * previous athlete's progress. Swap these functions for Supabase / Firebase
 * calls and the rest of the app keeps working unchanged (§23).
 */
export function loadState(actorKey: string): AppState | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(actorKey));
    if (!raw) {
      // One-time migration: the pre-accounts save belongs to the guest bucket.
      if (actorKey === 'guest') {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) return migrate(JSON.parse(legacy) as AppState);
      }
      return null;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed?.user?.id) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function saveState(actorKey: string, state: AppState): void {
  try {
    localStorage.setItem(storageKeyFor(actorKey), JSON.stringify(state));
  } catch {
    // storage full or unavailable (private mode) — the app still works in memory
  }
}

/** Forget one account's local data (used when an account is deleted). */
export function clearState(actorKey: string): void {
  try {
    localStorage.removeItem(storageKeyFor(actorKey));
  } catch {
    // ignore
  }
}

export function clearAllStates(): void {
  try {
    const doomed: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith(KEY_PREFIX) || key === LEGACY_KEY)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/** The shared guest bucket: the demo athlete's full four-week career. */
export function guestState(): AppState {
  return seedState();
}

/** Keep old saves compatible as the data model grows. */
function migrate(state: AppState): AppState {
  return {
    ...state,
    messages: state.messages ?? [],
    sessions: state.sessions ?? [],
    progress: state.progress ?? [],
    workouts: state.workouts ?? [],
    analyses: state.analyses ?? [],
    theme: state.theme === 'light' ? 'light' : 'dark',
  };
}

/** Videos are never stored — this is the "delete my footage" guarantee. */
export function privacySummary(state: AppState): { retained: number; processed: number } {
  return {
    retained: state.analyses.filter((a) => a.videoRetained).length,
    processed: state.analyses.length,
  };
}
