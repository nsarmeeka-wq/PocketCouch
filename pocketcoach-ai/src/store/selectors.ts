import type {
  AppState,
  SkillDefinition,
  VideoAnalysis,
  WeaknessSummary,
  Workout,
} from '@/lib/types';
import { getSkill } from '@/data/sports';
import { levelFromXp } from '@/lib/gamification';
import { severityFromScore } from '@/lib/format';

export function analysesForSkill(state: AppState, skillId?: string): VideoAnalysis[] {
  const filtered = skillId ? state.analyses.filter((a) => a.skill === skillId) : state.analyses;
  return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function latestAnalysis(state: AppState, skillId?: string): VideoAnalysis | undefined {
  return analysesForSkill(state, skillId)[0];
}

export function previousAnalysis(state: AppState, skillId?: string, beforeId?: string): VideoAnalysis | undefined {
  const list = analysesForSkill(state, skillId).filter((a) => a.id !== beforeId);
  return list[1] ?? undefined;
}

export function latestWorkout(state: AppState, skillId?: string): Workout | undefined {
  const list = state.workouts
    .filter((w) => (skillId ? w.skill === skillId : true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return list.find((w) => !w.completed) ?? list[0];
}

export function skillOf(analysis?: VideoAnalysis): SkillDefinition | undefined {
  return analysis ? getSkill(analysis.skill) : undefined;
}

/** Latest score, previous score and full history for every flagged weakness. */
export function weaknessSummaries(state: AppState, skillId?: string): WeaknessSummary[] {
  const history = analysesForSkill(state, skillId);
  const latest = history[0];
  if (!latest) return [];
  return latest.signals
    .map((signal) => {
      const series = history
        .map((analysis) => analysis.signals.find((s) => s.key === signal.key)?.score)
        .filter((v): v is number => typeof v === 'number')
        .reverse();
      const previous = series.length > 1 ? series[series.length - 2] : undefined;
      return {
        signalKey: signal.key,
        label: signal.label,
        latest: signal.score,
        previous,
        delta: signal.score - (previous ?? signal.score),
        history: series,
        joints: signal.joints,
        severity: severityFromScore(signal.score),
      };
    })
    .sort((a, b) => a.latest - b.latest);
}

export function weakestSummary(state: AppState, skillId?: string): WeaknessSummary | undefined {
  return weaknessSummaries(state, skillId)[0];
}

export interface WeekStats {
  sessions: number;
  minutes: number;
  xp: number;
  improvementPercent: number;
  workoutsCompleted: number;
}

export function weekStats(state: AppState, skillId?: string): WeekStats {
  const weekAgo = Date.now() - 7 * 86400000;
  const sessions = state.sessions.filter((s) => new Date(s.completedAt).getTime() >= weekAgo && (!skillId || s.skill === skillId));
  const history = analysesForSkill(state, skillId);
  const first = history[history.length - 1];
  const latest = history[0];
  const improvementPercent = first && latest && history.length > 1 ? Math.round(((latest.overall - first.overall) / first.overall) * 100) : 0;
  return {
    sessions: sessions.length,
    minutes: sessions.reduce((sum, s) => sum + s.minutes, 0),
    xp: sessions.reduce((sum, s) => sum + s.xp, 0),
    improvementPercent,
    workoutsCompleted: state.workouts.filter((w) => w.completed).length,
  };
}

export function levelInfo(state: AppState) {
  return levelFromXp(state.user.xp);
}

export function overallTrend(state: AppState, skillId?: string): { label: string; overall: number; date: string }[] {
  return analysesForSkill(state, skillId)
    .slice(0, 8)
    .reverse()
    .map((analysis) => ({
      label: new Date(analysis.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      overall: analysis.overall,
      date: analysis.createdAt,
    }));
}

export function metricTrend(state: AppState, metricKey: string, skillId?: string): { label: string; value: number }[] {
  return analysesForSkill(state, skillId)
    .slice(0, 8)
    .reverse()
    .map((analysis) => ({
      label: new Date(analysis.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: analysis.metrics.find((m) => m.key === metricKey)?.score ?? analysis.overall,
    }));
}

export function difficultyForSkill(state: AppState, skillId: string): number {
  const open = state.workouts.filter((w) => w.skill === skillId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  return state.user.skillLevels[skillId] ?? open?.difficultyLevel ?? 2;
}

export function sportBreakdown(state: AppState): { sport: string; analyses: number; minutes: number }[] {
  const map = new Map<string, { sport: string; analyses: number; minutes: number }>();
  state.analyses.forEach((analysis) => {
    const row = map.get(analysis.sport) ?? { sport: analysis.sport, analyses: 0, minutes: 0 };
    row.analyses += 1;
    map.set(analysis.sport, row);
  });
  state.sessions.forEach((session) => {
    const row = map.get(session.sport) ?? { sport: session.sport, analyses: 0, minutes: 0 };
    row.minutes += session.minutes;
    map.set(session.sport, row);
  });
  return [...map.values()];
}

export function totalTrainingMinutes(state: AppState): number {
  return state.sessions.reduce((sum, s) => sum + s.minutes, 0);
}

export function drillsCompleted(state: AppState): number {
  return state.workouts.reduce((sum, w) => sum + w.drills.filter((d) => d.completed).length, 0);
}
