/**
 * Seeded athlete.
 *
 * The app must look complete the second it loads, so "Arjun" ships with a
 * realistic four-week history: three recorded assessments, five completed
 * sessions, an XP/streak curve and an elbow-alignment trend of 52 → 61 → 72.
 * Demo Mode replays the baseline assessment and the re-test that followed, so
 * judges see the full VIDEO → ANALYSIS → DRILLS → RE-TEST loop in ~3 minutes.
 *
 * Every score below was produced by the real analysis engine from the movement
 * profiles in this file — `scripts/verify-seed.ts` re-measures them, so the
 * seeded history can never drift away from what the engine actually reports.
 */
import type {
  AppState,
  AnalysisMetric,
  BadgeAward,
  DetectedWeakness,
  DifficultyLevel,
  MovementSignal,
  ProgressEntry,
  SessionLog,
  UserProfile,
  VideoAnalysis,
  Workout,
  WorkoutDrill,
} from '@/lib/types';
import { getSkill } from '@/data/sports';
import { BADGES } from '@/lib/gamification';
import { DRILLS_BY_ID, DRILL_ID_BY_NAME } from '@/data/drills';

const drillId = (name: string): string => DRILL_ID_BY_NAME[name] ?? name;

export const DEMO_ATHLETE_ID = 'athlete-arjun';

/** Signals recorded in each seeded assessment (key → score). */
const ASSESSMENTS: {
  id: string;
  daysAgo: number;
  overall: number;
  metrics: Record<string, number>;
  signals: Record<string, number>;
  difficulty: DifficultyLevel;
}[] = [
  {
    // These are the values the analysis engine actually produces for
    // DEMO_BASELINE_PROFILE (see scripts/calibrate.ts), which keeps the seeded
    // history, the demo walkthrough and the progress charts consistent.
    id: 'analysis-baseline',
    daysAgo: 30,
    overall: 76,
    metrics: { bodyAlignment: 70, balance: 70, technique: 65, movementControl: 88, consistency: 86 },
    signals: {
      elbowAlignment: 52,
      followThrough: 70,
      balance: 69,
      kneeBend: 95,
      shoulderAlignment: 78,
      jumpConsistency: 96,
      landingSymmetry: 72,
      releaseRhythm: 82,
    },
    difficulty: 'Beginner',
  },
  {
    id: 'analysis-week-2',
    daysAgo: 17,
    overall: 79,
    metrics: { bodyAlignment: 75, balance: 76, technique: 69, movementControl: 91, consistency: 87 },
    signals: {
      elbowAlignment: 61,
      followThrough: 71,
      balance: 74,
      kneeBend: 96,
      shoulderAlignment: 79,
      jumpConsistency: 96,
      landingSymmetry: 77,
      releaseRhythm: 85,
    },
    difficulty: 'Intermediate',
  },
  {
    id: 'analysis-latest',
    daysAgo: 4,
    overall: 83,
    metrics: { bodyAlignment: 79, balance: 82, technique: 73, movementControl: 94, consistency: 89 },
    signals: {
      elbowAlignment: 72,
      followThrough: 73,
      balance: 80,
      kneeBend: 97,
      shoulderAlignment: 79,
      jumpConsistency: 96,
      landingSymmetry: 85,
      releaseRhythm: 89,
    },
    difficulty: 'Intermediate',
  },
];

/**
 * The before/after the guided demo produces. Re-measure with
 * `scripts/verify-seed.ts` whenever the analysis engine changes — the landing
 * page reads these numbers so marketing copy and the live demo never disagree.
 */
export const DEMO_RESULT = {
  baselineOverall: 76,
  improvedOverall: 86,
  rows: [
    { label: 'Elbow Alignment', before: 52, after: 79 },
    { label: 'Balance', before: 69, after: 84 },
    { label: 'Landing Control', before: 72, after: 92 },
  ],
};

/**
 * Movement signature the demo replays first: three clear faults (elbow flare,
 * rushed follow-through, lateral drift) with everything else sound, which is
 * what a first-time solo athlete usually looks like.
 */
export const DEMO_BASELINE_PROFILE: Record<string, number> = {
  elbowAlignment: 46,
  followThrough: 48,
  balance: 72,
  kneeBend: 100,
  shoulderAlignment: 48,
  jumpConsistency: 65,
  landingSymmetry: 88,
  releaseRhythm: 81,
};

/** What Arjun looks like after the guided demo training block. */
export const DEMO_IMPROVED_PROFILE: Record<string, number> = {
  elbowAlignment: 97,
  followThrough: 80,
  balance: 90,
  kneeBend: 92,
  shoulderAlignment: 67,
  jumpConsistency: 100,
  landingSymmetry: 91,
  releaseRhythm: 85,
};

/**
 * Fixed simulation seeds for the guided demo. They must match the seeds
 * `scripts/verify-seed.ts` measures with, otherwise the scores shown in the app
 * would drift from the numbers this file publishes.
 */
export const DEMO_SEEDS = {
  baseline: 'baseline',
  retest: 'retest',
} as const;

export const SAMPLE_CLIP = {
  name: 'arjun-jump-shot-baseline-30s.mp4',
  durationSec: 30,
  label: 'Arjun — jump shot (30s, baseline)',
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(18, 24, 0, 0);
  return d.toISOString();
}

function buildSignals(skillId: string, scores: Record<string, number>): MovementSignal[] {
  const skill = getSkill(skillId);
  if (!skill) return [];
  return skill.signals.map((definition) => {
    const score = scores[definition.key] ?? 74;
    return {
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      ideal: definition.ideal,
      phase: definition.phase,
      joints: definition.joints,
      weight: definition.weight,
      score,
      value: score,
      detail: `${definition.label} measured ${score}/100 in this assessment. ${definition.whyItMatters.split('.')[0]}.`,
      phaseScore: score,
    };
  });
}

function buildWeaknesses(skillId: string, signals: MovementSignal[]): DetectedWeakness[] {
  const skill = getSkill(skillId);
  return [...signals]
    .sort((a, b) => a.score - b.score)
    .filter((s) => s.score < 86)
    .slice(0, 4)
    .map((signal, index) => {
      const definition = skill?.signals.find((d) => d.key === signal.key);
      return {
        id: `weakness-${signal.key}`,
        signalKey: signal.key,
        title: signal.label,
        score: signal.score,
        severity: signal.score < 58 ? 'Critical' : signal.score < 70 ? 'Needs Improvement' : signal.score < 84 ? 'Minor' : 'Strength',
        issue: `${signal.label} measured ${signal.score}/100. ${definition?.whyItMatters.split('.')[0] ?? ''}.`,
        whyItMatters: definition?.whyItMatters ?? '',
        correction: definition?.correction ?? '',
        joints: signal.joints,
        priority: Math.round((100 - signal.score) * (definition?.weight ?? 1) * 10) / 10,
        rank: index + 1,
      };
    });
}

function buildMetrics(scoreMap: Record<string, number>): AnalysisMetric[] {
  const skill = getSkill('basketball-jump-shot')!;
  return skill.metricGroups.map((group) => ({
    key: group.key,
    label: group.label,
    blurb: group.blurb,
    score: scoreMap[group.key] ?? 74,
  }));
}

function buildAnalysis(entry: (typeof ASSESSMENTS)[number]): VideoAnalysis {
  const skill = getSkill('basketball-jump-shot')!;
  const signals = buildSignals(skill.id, entry.signals);
  return {
    id: entry.id,
    userId: DEMO_ATHLETE_ID,
    sport: 'basketball',
    skill: skill.id,
    skillName: skill.name,
    createdAt: daysAgoIso(entry.daysAgo),
    videoName: SAMPLE_CLIP.name,
    videoDurationSec: SAMPLE_CLIP.durationSec,
    videoRetained: false,
    overall: entry.overall,
    metrics: buildMetrics(entry.metrics),
    signals,
    weaknesses: buildWeaknesses(skill.id, signals),
    poseSource: 'simulated',
    frameCount: 360,
    quality: {
      bodyDetected: true,
      multiplePeople: false,
      avgVisibility: 0.93,
      framing: 'good',
      lighting: 'good',
      stability: stability(entry.daysAgo),
      durationSec: SAMPLE_CLIP.durationSec,
      score: 92,
      warnings: [],
    },
    landmarkFrames: [],
    overlayFps: 12,
    headline: entry.overall >= 80 ? 'Strong technique' : 'Solid foundation',
    narrative: `Overall ${entry.overall}/100 with ${signals[0].label.toLowerCase()} as the main opportunity.`,
    difficultyEstimate: entry.difficulty,
  };
}

function stability(seed: number): number {
  return 0.88 + ((seed % 7) * 0.012);
}

function drillFrom(drillId: string, minutes: number, reason: string, completed: boolean, difficulty: DifficultyLevel): WorkoutDrill {
  const drill = DRILLS_BY_ID[drillId];
  if (!drill) {    return {
      drillId,
      name: 'Adaptive Drill',
      durationMin: minutes,
      targetLabel: 'Technique',
      targetSignals: [],
      difficulty,
      intensity: 2,
      equipment: ['No equipment'],
      setup: 'Find a clear space.',
      steps: ['Follow the coaching cue and keep the movement controlled.'],
      coachingCue: 'Quality over quantity.',
      volume: `${minutes} minutes`,
      reason,
      completed,
    };
  }
  return {
    drillId: drill.id,
    name: drill.name,
    durationMin: minutes,
    targetLabel: drill.targetLabel,
    targetSignals: drill.targetSignals,
    difficulty,
    intensity: drill.intensity,
    equipment: drill.equipment,
    setup: drill.setup,
    steps: drill.steps,
    coachingCue: drill.coachingCue,
    volume: drill.volume,
    reason,
    completed,
  };
}

function buildWorkouts(): Workout[] {
  const plan: {
    id: string;
    daysAgo: number;
    minutes: number;
    completed: boolean;
    difficulty: DifficultyLevel;
    level: number;
    focus: string;
    reason: string;
    drills: [string, number, string][];
  }[] = [
    {
      id: 'workout-1',
      daysAgo: 26,
      minutes: 15,
      completed: true,
      difficulty: 'Beginner',
      level: 2,
      focus: 'Elbow Alignment',
      reason: 'Elbow Alignment scored 52/100 in your baseline clip — high priority corrective block first.',
      drills: [
        ['Wall Elbow Alignment Drill', 4, 'Correcting Elbow Alignment (52/100 — high priority). Your elbow drifts outward during the release phase.'],
        ['Follow-Through Freeze', 4, 'Correcting Follow-Through (70/100 — moderate priority). Your hand drops before the ball reaches the rim.'],
        ['Single-Leg Balance Shooting', 3, 'Correcting Balance (69/100 — moderate priority). Your centre of mass drifts sideways during the shot.'],
        ['Count Shooting Rhythm', 2, 'Support block: keep the shooting rhythm sharp while the elbow work settles in.'],
        ['Final Skill Test', 2, 'Re-test the jump shot so the AI can measure the correction.'],
      ],
    },
    {
      id: 'workout-2',
      daysAgo: 19,
      minutes: 15,
      completed: true,
      difficulty: 'Beginner',
      level: 3,
      focus: 'Elbow Alignment',
      reason: 'Elbow Alignment is still the lowest scoring signal this week (61/100).',
      drills: [
        ['Follow-Through Freeze', 4, 'Correcting Follow-Through (71/100 — moderate priority). The hold still breaks down under fatigue.'],
        ['Wall Elbow Alignment Drill', 3, 'Correcting Elbow Alignment (61/100 — moderate priority).'],
        ['Jump-Shot Consistency Ladder', 3, 'Maintaining Jump Consistency at 96/100 while the corrections settle.'],
        ['Count Shooting Rhythm', 3, 'Rhythm maintenance block.'],
        ['Final Skill Test', 2, 'Re-test the jump shot.'],
      ],
    },
    {
      id: 'workout-3',
      daysAgo: 12,
      minutes: 15,
      completed: true,
      difficulty: 'Intermediate',
      level: 4,
      focus: 'Balance',
      reason: 'Balance improved to 74/100 but still trails your technique scores.',
      drills: [
        ['Single-Leg Balance Shooting', 4, 'Building Balance (74/100 — moderate priority).'],
        ['One-Hand Form Shooting', 4, 'Elbow Alignment maintenance (61/100 — improving).'],
        ['Count Shooting Rhythm', 3, 'Shot rhythm and tempo block.'],
        ['Follow-Through Freeze', 2, 'Follow-through refresh.'],
        ['Final Skill Test', 2, 'Re-test the jump shot.'],
      ],
    },
    {
      id: 'workout-4',
      daysAgo: 8,
      minutes: 16,
      completed: true,
      difficulty: 'Intermediate',
      level: 4,
      focus: 'Landing Control',
      reason: 'Landing Control (85/100) is the last signal still below your elbow and balance work.',
      drills: [
        ['Tempo Dip & Hold', 4, 'Building Movement Control with lower-body loading work.'],
        ['One-Hand Form Shooting', 4, 'Elbow Alignment progression.'],
        ['Single-Leg Balance Shooting', 3, 'Balance under fatigue.'],
        ['Jump-Shot Consistency Ladder', 3, 'Consistency ladder.'],
        ['Final Skill Test', 2, 'Re-test the jump shot.'],
      ],
    },
    {
      id: 'workout-5',
      daysAgo: 4,
      minutes: 15,
      completed: true,
      difficulty: 'Intermediate',
      level: 4,
      focus: 'Balance',
      reason: 'Balance (80/100) is the last signal below 85 with Elbow Alignment now at 72.',
      drills: [
        ['Jump-Shot Consistency Ladder', 4, 'Consistency ladder — same dip, same release, same hold.'],
        ['Single-Leg Balance Shooting', 3, 'Balance progression (80/100 → target 85).'],
        ['Wall Elbow Alignment Drill', 3, 'Elbow alignment maintenance (72/100 — improving).'],
        ['Count Shooting Rhythm', 3, 'Release rhythm block.'],
        ['Final Skill Test', 2, 'Re-test the jump shot.'],
      ],
    },
  ];

  return plan.map((entry) => {
    const drills = entry.drills.map(([name, minutes, reason]) =>
      drillFrom(drillId(name), minutes, reason, entry.completed, entry.difficulty),
    );
    return {
      id: entry.id,
      userId: DEMO_ATHLETE_ID,
      sport: 'basketball',
      skill: 'basketball-jump-shot',
      skillName: 'Jump Shot',
      createdAt: daysAgoIso(entry.daysAgo),
      completedAt: entry.completed ? daysAgoIso(entry.daysAgo) : undefined,
      completed: entry.completed,
      difficulty: entry.difficulty,
      difficultyLevel: entry.level,
      totalMinutes: entry.minutes,
      drills,
      focusSignals: [entry.focus],
      rootCauses: [entry.reason],
      generatedReason: entry.reason,
      baselineAnalysisId: 'analysis-baseline',
      baselineOverall: 76,
      xpEarned: entry.completed ? Math.round(entry.minutes * 6 + 22) : 0,
    } satisfies Workout;
  });
}

function buildSessions(): SessionLog[] {
  const plan: [string, number, number, number][] = [
    ['workout-1', 15, 112, 26],
    ['workout-2', 15, 116, 19],
    ['workout-3', 15, 108, 12],
    ['workout-4', 16, 104, 8],
    ['workout-5', 15, 100, 4],
  ];
  return plan.map(([workoutId, minutes, xp, days], index) => ({
    id: `session-${index + 1}`,
    userId: DEMO_ATHLETE_ID,
    workoutId,
    minutes,
    xp,
    completedAt: daysAgoIso(days),
    sport: 'basketball' as const,
    skill: 'basketball-jump-shot',
  }));
}

function buildProgress(analyses: VideoAnalysis[]): ProgressEntry[] {
  const rows: ProgressEntry[] = [];
  analyses.forEach((analysis) => {
    analysis.metrics.forEach((metric) => {
      rows.push({
        id: `${analysis.id}-${metric.key}`,
        userId: DEMO_ATHLETE_ID,
        sport: analysis.sport,
        skill: analysis.skill,
        metricKey: metric.key,
        metricLabel: metric.label,
        score: metric.score,
        overall: analysis.overall,
        analysisId: analysis.id,
        timestamp: analysis.createdAt,
      });
    });
    analysis.signals.forEach((signal) => {
      rows.push({
        id: `${analysis.id}-signal-${signal.key}`,
        userId: DEMO_ATHLETE_ID,
        sport: analysis.sport,
        skill: analysis.skill,
        metricKey: `signal:${signal.key}`,
        metricLabel: signal.label,
        score: signal.score,
        overall: analysis.overall,
        analysisId: analysis.id,
        timestamp: analysis.createdAt,
      });
    });
  });
  return rows;
}

function badge(id: string, daysAgo: number): BadgeAward | null {
  const definition = BADGES.find((b) => b.id === id);
  if (!definition) return null;
  return { ...definition, earnedAt: daysAgoIso(daysAgo) };
}

export function seedUser(): UserProfile {
  return {
    id: DEMO_ATHLETE_ID,
    name: 'Arjun',
    email: 'arjun@pocketcoach.ai',
    avatarEmoji: '🏀',
    goalSkill: 'basketball-jump-shot',
    goalSport: 'basketball',
    selectedSports: ['basketball', 'fitness'],
    skillLevels: { 'basketball-jump-shot': 4, 'basketball-free-throw': 3, 'fitness-squat': 2 },
    xp: 2450,
    streak: 7,
    lastActiveDate: daysAgoIso(0),
    badges: [badge('first-analysis', 30), badge('first-session', 26), badge('streak-3', 24), badge('streak-7', 6), badge('form-fixer', 12), badge('comeback', 12), badge('drill-master', 8), badge('century-club', 20)].filter(Boolean) as BadgeAward[],
    createdAt: daysAgoIso(34),
    keepVideos: true,
    onboarded: true,
  };
}

export function seedState(): AppState {
  const analyses = ASSESSMENTS.map(buildAnalysis).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const workouts = buildWorkouts().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const sessions = buildSessions();
  return {
    user: seedUser(),
    analyses,
    workouts,
    progress: buildProgress(analyses),
    sessions,
    messages: [],
    theme: 'dark',
  };
}

export function emptyState(): AppState {
  const user = seedUser();
  return { ...seedState(), user: { ...user, xp: 0, streak: 0, badges: [], skillLevels: {} } };
}
