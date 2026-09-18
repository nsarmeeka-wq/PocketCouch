import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { AppState, BadgeAward, CoachMessage, SportId, VideoAnalysis, Workout } from '@/lib/types';
import { clearState, guestState, loadState, saveState } from '@/lib/storage';
import { newAccountState } from '@/lib/accountState';
import { evaluateBadges, levelFromXp, streakAfterActivity } from '@/lib/gamification';
import { useAuth } from '@/store/AuthStore';

type Action =
  | { type: 'set-theme'; theme: 'dark' | 'light' }
  | { type: 'update-user'; patch: Partial<AppState['user']> }
  | { type: 'set-goal'; skillId: string; sport: SportId }
  | { type: 'add-analysis'; analysis: VideoAnalysis }
  | { type: 'add-workout'; workout: Workout }
  | { type: 'complete-drill'; workoutId: string; drillId: string }
  | { type: 'complete-workout'; workoutId: string; minutes: number; xp: number }
  | { type: 'abandon-workout'; workoutId: string }
  | { type: 'add-message'; message: CoachMessage }
  | { type: 'add-messages'; messages: CoachMessage[] }
  | { type: 'award-badges'; badges: BadgeAward[]; xp: number }
  | { type: 'delete-analysis'; analysisId: string }
  | { type: 'reset'; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set-theme':
      return { ...state, theme: action.theme };
    case 'update-user':
      return { ...state, user: { ...state.user, ...action.patch } };
    case 'set-goal':
      return {
        ...state,
        user: { ...state.user, goalSkill: action.skillId, goalSport: action.sport, selectedSports: state.user.selectedSports.includes(action.sport) ? state.user.selectedSports : [...state.user.selectedSports, action.sport] },
      };
    case 'add-analysis': {
      const streak = streakAfterActivity(state.user.lastActiveDate, state.user.streak);
      return {
        ...state,
        analyses: [action.analysis, ...state.analyses].slice(0, 40),
        progress: [
          ...action.analysis.metrics.map((metric) => ({
            id: `${action.analysis.id}-${metric.key}`,
            userId: state.user.id,
            sport: action.analysis.sport,
            skill: action.analysis.skill,
            metricKey: metric.key,
            metricLabel: metric.label,
            score: metric.score,
            overall: action.analysis.overall,
            analysisId: action.analysis.id,
            timestamp: action.analysis.createdAt,
          })),
          ...action.analysis.signals.map((signal) => ({
            id: `${action.analysis.id}-signal-${signal.key}`,
            userId: state.user.id,
            sport: action.analysis.sport,
            skill: action.analysis.skill,
            metricKey: `signal:${signal.key}`,
            metricLabel: signal.label,
            score: signal.score,
            overall: action.analysis.overall,
            analysisId: action.analysis.id,
            timestamp: action.analysis.createdAt,
          })),
          ...state.progress,
        ].slice(0, 400),
        user: { ...state.user, streak, lastActiveDate: new Date().toISOString() },
      };
    }
    case 'add-workout':
      return { ...state, workouts: [action.workout, ...state.workouts].slice(0, 30) };
    case 'complete-drill':
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId
            ? { ...w, drills: w.drills.map((d) => (d.drillId === action.drillId ? { ...d, completed: true, completedAt: new Date().toISOString() } : d)) }
            : w,
        ),
      };
    case 'complete-workout': {
      const workout = state.workouts.find((w) => w.id === action.workoutId);
      if (!workout) return state;
      const streak = streakAfterActivity(state.user.lastActiveDate, state.user.streak);
      return {
        ...state,
        workouts: state.workouts.map((w) =>
          w.id === action.workoutId
            ? { ...w, completed: true, completedAt: new Date().toISOString(), xpEarned: action.xp, drills: w.drills.map((d) => ({ ...d, completed: true, completedAt: new Date().toISOString() })) }
            : w,
        ),
        sessions: [
          {
            id: `session-${Date.now().toString(36)}`,
            userId: state.user.id,
            workoutId: action.workoutId,
            minutes: action.minutes,
            xp: action.xp,
            completedAt: new Date().toISOString(),
            sport: workout.sport,
            skill: workout.skill,
          },
          ...state.sessions,
        ],
        user: {
          ...state.user,
          xp: state.user.xp + action.xp,
          streak,
          lastActiveDate: new Date().toISOString(),
          skillLevels: { ...state.user.skillLevels, [workout.skill]: Math.min(6, Math.max(state.user.skillLevels[workout.skill] ?? 2, workout.difficultyLevel)) },
        },
      };
    }
    case 'abandon-workout':
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === action.workoutId ? { ...w, drills: w.drills.map((d) => ({ ...d, completed: false, completedAt: undefined })) } : w)),
      };
    case 'add-message':
      return { ...state, messages: [...state.messages, action.message].slice(-80) };
    case 'add-messages':
      return { ...state, messages: [...state.messages, ...action.messages].slice(-80) };
    case 'award-badges':
      return { ...state, user: { ...state.user, badges: [...state.user.badges, ...action.badges], xp: state.user.xp + action.xp } };
    case 'delete-analysis': {
      const target = state.analyses.find((a) => a.id === action.analysisId);
      return {
        ...state,
        analyses: state.analyses.filter((a) => a.id !== action.analysisId),
        progress: state.progress.filter((p) => p.analysisId !== action.analysisId),
        user: target ? { ...state.user, xp: Math.max(0, state.user.xp - 10) } : state.user,
      };
    }
    default:
      return state;
  }
}

/**
 * Actor-scoped store: the data bucket travels with its owner.
 *
 * Keeping the actor key *inside* the stored value is deliberate — a separate
 * `actorKey` would let the persist effect write the previous athlete's state
 * into the new athlete's bucket during the render where the account switches.
 */
interface ScopedState {
  actorKey: string;
  data: AppState;
}

type ScopedAction =
  | { type: 'app'; action: Action }
  | { type: 'switch-actor'; actorKey: string; data: AppState };

function scopedReducer(state: ScopedState, action: ScopedAction): ScopedState {
  if (action.type === 'switch-actor') {
    return { actorKey: action.actorKey, data: action.data };
  }
  return { actorKey: state.actorKey, data: reducer(state.data, action.action) };
}

interface StoreValue {
  state: AppState;
  /** which account owns this data — `guest` or `user:<id>` */
  actorKey: string;
  dispatch: React.Dispatch<Action>;
  /** transient toast queue for badges / XP popups */
  toasts: { id: string; title: string; body: string; emoji: string }[];
  pushToast: (toast: { title: string; body: string; emoji: string }) => void;
  dismissToast: (id: string) => void;
  resetDemoData: () => void;
  hardReset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/** The starting bucket for an actor: their save, else demo data or a clean slate. */
function bucketFor(actorKey: string, user: ReturnType<typeof useAuth>['user'], theme?: AppState['theme']): AppState {
  const saved = loadState(actorKey);
  if (saved) return saved;
  return actorKey === 'guest'
    ? { ...guestState(), theme: theme ?? 'dark' }
    : user
      ? newAccountState(user, theme ?? 'dark')
      : guestState();
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [store, dispatchScoped] = useReducer(scopedReducer, auth.actorKey, (actorKey) => ({
    actorKey,
    data: bucketFor(actorKey, null),
  }));
  const [toasts, setToasts] = useState<StoreValue['toasts']>([]);

  const dispatch = useCallback<React.Dispatch<Action>>((action) => dispatchScoped({ type: 'app', action }), []);

  /* Switching identity swaps the whole data bucket: signing in as someone else
     must never carry the previous athlete's progress across. */
  useEffect(() => {
    if (store.actorKey === auth.actorKey) return;
    dispatchScoped({ type: 'switch-actor', actorKey: auth.actorKey, data: bucketFor(auth.actorKey, auth.user, store.data.theme) });
  }, [auth.actorKey, auth.user, store.actorKey, store.data.theme]);

  /* Persist into the bucket that owns the state, never a stale one. */
  useEffect(() => {
    saveState(store.actorKey, store.data);
  }, [store.actorKey, store.data]);

  useEffect(() => {
    const root = document.documentElement;
    if (store.data.theme === 'light') root.classList.remove('dark');
    else root.classList.add('dark');
  }, [store.data.theme]);

  const state = store.data;

  const pushToast = useCallback((toast: { title: string; body: string; emoji: string }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // badge engine — runs on every meaningful state change
  useEffect(() => {
    const earned = evaluateBadges({
      user: state.user,
      analyses: state.analyses,
      workouts: state.workouts,
      sessions: state.sessions,
      progress: state.progress,
      streak: state.user.streak,
    });
    if (earned.length) {
      const xp = earned.length * 40;
      dispatch({ type: 'award-badges', badges: earned.map((b) => ({ ...b, earnedAt: new Date().toISOString() })), xp });
      earned.forEach((badge) => pushToast({ title: `Badge unlocked · ${badge.name}`, body: `${badge.description} +40 XP`, emoji: badge.emoji }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.analyses, state.workouts, state.sessions, state.user.xp, state.user.streak]);

  /* Mirror gamification onto the account so the server's copy is not stale.
     Best effort: an offline backend must never interrupt training. */
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    const timer = window.setTimeout(() => {
      void auth.syncProgress({ xp: state.user.xp, streak: state.user.streak });
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status, state.user.xp, state.user.streak]);

  const resetDemoData = useCallback(() => {
    dispatch({ type: 'reset', state: guestState() });
    pushToast({ title: 'Demo data restored', body: 'Arjun’s four-week history has been reloaded.', emoji: '🎮' });
  }, [dispatch, pushToast]);

  const hardReset = useCallback(() => {
    clearState(store.actorKey);
    const rebuilt = store.actorKey === 'guest' ? guestState() : auth.user ? newAccountState(auth.user, store.data.theme) : guestState();
    dispatch({ type: 'reset', state: rebuilt });
    pushToast({ title: 'Local data cleared', body: 'This browser no longer stores training data for this session.', emoji: '🧹' });
  }, [auth.user, dispatch, pushToast, store.actorKey, store.data.theme]);

  const value = useMemo<StoreValue>(
    () => ({ state, actorKey: store.actorKey, dispatch, toasts, pushToast, dismissToast, resetDemoData, hardReset }),
    [state, store.actorKey, dispatch, toasts, pushToast, dismissToast, resetDemoData, hardReset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useApp(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useApp must be used inside AppStoreProvider');
  return ctx;
}

export function useLevel() {
  const { state } = useApp();
  return useMemo(() => levelFromXp(state.user.xp), [state.user.xp]);
}

export type { Action as AppAction };
