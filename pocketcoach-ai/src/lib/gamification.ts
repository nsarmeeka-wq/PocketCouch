import type { BadgeDefinition, ProgressEntry, SessionLog, UserProfile, VideoAnalysis, Workout } from '@/lib/types';

export interface LevelDefinition {
  level: number;
  xp: number;
  title: string;
  blurb: string;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, xp: 0, title: 'Rookie', blurb: 'Learning the fundamentals' },
  { level: 2, xp: 200, title: 'Starter', blurb: 'Building the habit' },
  { level: 3, xp: 450, title: 'Contender', blurb: 'Technique is taking shape' },
  { level: 4, xp: 750, title: 'Athlete', blurb: 'Consistent training volume' },
  { level: 5, xp: 1100, title: 'Competitor', blurb: 'Scores are climbing' },
  { level: 6, xp: 1500, title: 'Specialist', blurb: 'Deep work on weak links' },
  { level: 7, xp: 1950, title: 'Playmaker', blurb: 'Reading your own movement' },
  { level: 8, xp: 2450, title: 'Rising Athlete', blurb: 'Advanced drills unlocked' },
  { level: 9, xp: 3000, title: 'Elite Prospect', blurb: 'Marginal gains territory' },
  { level: 10, xp: 3600, title: 'Pro Form', blurb: 'Technique you can trust under fatigue' },
];

export function levelFromXp(xp: number): { current: LevelDefinition; next?: LevelDefinition; progress: number; xpIntoLevel: number; xpForNext: number } {
  const sorted = [...LEVELS].sort((a, b) => a.xp - b.xp);
  let current = sorted[0];
  for (const level of sorted) {
    if (xp >= level.xp) current = level;
  }
  const next = sorted.find((l) => l.xp > current.xp);
  const xpIntoLevel = xp - current.xp;
  const xpForNext = next ? next.xp - current.xp : 0;
  const progress = next ? Math.round((xpIntoLevel / xpForNext) * 100) : 100;
  return { current, next, progress, xpIntoLevel, xpForNext };
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first-analysis', name: 'First Analysis', emoji: '🏅', description: 'Uploaded your first technique clip for AI analysis.' },
  { id: 'first-session', name: 'First Session', emoji: '🎬', description: 'Completed your first adaptive training session.' },
  { id: 'streak-3', name: '3-Day Streak', emoji: '🔥', description: 'Trained three days in a row.' },
  { id: 'streak-7', name: '7-Day Streak', emoji: '🔥', description: 'Trained seven days in a row — the habit is real.' },
  { id: 'form-fixer', name: 'Form Fixer', emoji: '🎯', description: 'Improved a flagged weakness by 12 points or more in one re-test.' },
  { id: 'speed-improver', name: 'Speed Improver', emoji: '⚡', description: 'Raised your Movement Control score above 80.' },
  { id: 'consistency-master', name: 'Consistency Master', emoji: '🏆', description: 'Pushed your Consistency score above 85.' },
  { id: 'century-club', name: 'Century Club', emoji: '💯', description: 'Earned 1,000 lifetime XP.' },
  { id: 'drill-master', name: 'Drill Master', emoji: '🧠', description: 'Completed 20 drills across your sessions.' },
  { id: 'comeback', name: 'Comeback', emoji: '📈', description: 'Improved your overall score by 8 or more in a single re-test.' },
  { id: 'scout', name: 'Full Scout', emoji: '🔍', description: 'Analysed two different sports.' },
  { id: 'triple-threat', name: 'Triple Threat', emoji: '🌟', description: 'Scored above 85 on three metrics at once.' },
];

export interface BadgeContext {
  user: UserProfile;
  analyses: VideoAnalysis[];
  workouts: Workout[];
  sessions: SessionLog[];
  progress: ProgressEntry[];
  streak: number;
}

export function evaluateBadges(context: BadgeContext): BadgeDefinition[] {
  const { analyses, workouts, user, streak } = context;
  const latest = analyses[0];
  const previous = analyses[1];
  const completed = workouts.filter((w) => w.completed);
  const drillsDone = completed.reduce((sum, w) => sum + w.drills.filter((d) => d.completed).length, 0);
  const sportsAnalysed = new Set(analyses.map((a) => a.sport));
  const bestImprovement = latest && previous ? latest.overall - previous.overall : 0;

  const conditions: Record<string, boolean> = {
    'first-analysis': analyses.length >= 1,
    'first-session': completed.length >= 1,
    'streak-3': streak >= 3,
    'streak-7': streak >= 7,
    'form-fixer': Boolean(latest && previous && latest.signals.some((s) => (s.score - (previous.signals.find((p) => p.key === s.key)?.score ?? s.score)) >= 12)),
    'speed-improver': Boolean(latest && (latest.metrics.find((m) => m.key === 'movementControl')?.score ?? 0) > 80),
    'consistency-master': Boolean(latest && (latest.metrics.find((m) => m.key === 'consistency')?.score ?? 0) > 85),
    'century-club': user.xp >= 1000,
    'drill-master': drillsDone >= 20,
    comeback: bestImprovement >= 8,
    scout: sportsAnalysed.size >= 2,
    'triple-threat': Boolean(latest && latest.metrics.filter((m) => m.score > 85).length >= 3),
  };

  const owned = new Set(user.badges.map((b) => b.id));
  return BADGES.filter((badge) => conditions[badge.id] && !owned.has(badge.id));
}

/** Streak maths: consecutive calendar days, with a one-day grace window. */
export function streakAfterActivity(previousDate: string, previousStreak: number, today = new Date()): number {
  if (!previousDate) return 1;
  const last = new Date(previousDate);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(today) - startOfDay(last)) / 86400000);
  if (days <= 0) return Math.max(previousStreak, 1);
  if (days === 1) return previousStreak + 1;
  return 1;
}

export function xpToNextLevel(xp: number): { remaining: number; title: string } {
  const { current, next } = levelFromXp(xp);
  return { remaining: next ? Math.max(next.xp - xp, 0) : 0, title: current.title };
}
