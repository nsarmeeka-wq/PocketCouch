/**
 * Adaptive recommendation engine.
 *
 * Deliberately rule-based and explainable — every drill in the generated
 * session carries the reason it was chosen:
 *
 *   metric <  60  →  high-priority corrective drill
 *   60 – 79       →  moderate corrective drill
 *   80 +          →  maintenance / progression drill
 *
 * Future versions can swap `scoreDrill` for a learned ranker without touching
 * the rest of the app: the output contract is just a `Workout`.
 */
import type {
  DifficultyLevel,
  DrillDefinition,
  MovementSignal,
  SessionLog,
  SkillDefinition,
  VideoAnalysis,
  Workout,
  WorkoutDrill,
} from '@/lib/types';
import { DRILLS, DRILLS_BY_ID, FINAL_TEST_DRILL_ID } from '@/data/drills';
import { clamp } from '@/lib/pose/landmarks';

export interface PlanInput {
  analysis: VideoAnalysis;
  skill: SkillDefinition;
  athleteId: string;
  /** 1..6 ladder position the athlete currently sits on for this skill */
  athleteLevel: number;
  previousWorkouts: Workout[];
  sessions: SessionLog[];
  /** overall score of the previous analysis of the same skill, if any */
  previousOverall?: number;
}

export interface PlanResult {
  workout: Workout;
  focusSignals: MovementSignal[];
  difficultyLevel: number;
  explanation: string;
  rootCauses: string[];
}

/* ------------------------------------------------------------------ *
 * difficulty ladder
 * ------------------------------------------------------------------ */

export function difficultyLabel(level: number): DifficultyLevel {
  if (level <= 2) return 'Beginner';
  if (level <= 4) return 'Intermediate';
  return 'Advanced';
}

/**
 * Difficulty is a blend of the athlete's demonstrated level, their trend and
 * how much they have actually been training. It moves one rung at a time so a
 * single good session never throws the athlete into an advanced workout.
 */
export function nextDifficultyLevel(input: {
  athleteLevel: number;
  overall: number;
  previousOverall?: number;
  completedSessions: number;
}): number {
  const { athleteLevel, overall, previousOverall, completedSessions } = input;
  const target = overall >= 86 ? 5 : overall >= 78 ? 4 : overall >= 68 ? 3 : overall >= 58 ? 2 : 1;
  const improved = previousOverall === undefined ? 0 : overall - previousOverall;
  const trendBump = improved >= 6 ? 1 : improved <= -6 ? -1 : 0;
  const volumeBump = completedSessions >= 6 ? 1 : completedSessions >= 2 ? 0 : -1;
  const blended = clamp(Math.round((target * 0.5 + athleteLevel * 0.5 + trendBump + volumeBump)), 1, 6);
  return blended;
}

/* ------------------------------------------------------------------ *
 * drill selection
 * ------------------------------------------------------------------ */

function scoreDrill(
  drill: DrillDefinition,
  focus: { key: string; weight: number; score: number }[],
  skill: SkillDefinition,
  targetLevel: number,
  recentDrillIds: Set<string>,
): number {
  let score = 0;
  const targetDifficulty = difficultyLabel(targetLevel);

  for (const signal of focus) {
    if (drill.targetSignals.includes(signal.key)) {
      const weaknessBoost = signal.score < 60 ? 14 : signal.score < 80 ? 10 : 5;
      score += weaknessBoost * signal.weight;
    }
  }
  if (drill.skills?.includes(skill.id)) score += 8;
  if (drill.sport === 'any') score -= 6;
  if (drill.difficulty === targetDifficulty) score += 7;
  else if (Math.abs(difficultyRank(drill.difficulty) - difficultyRank(targetDifficulty)) === 1) score += 3;
  else score -= 5;
  if (recentDrillIds.has(drill.id)) score -= 9;
  if (drill.durationMin >= 3) score += 1;
  return score;
}

function difficultyRank(difficulty: DifficultyLevel): number {
  return difficulty === 'Beginner' ? 1 : difficulty === 'Intermediate' ? 2 : 3;
}

function reasonFor(matched: MovementSignal[]): string {
  if (!matched.length) return 'Included as a supporting drill to round out the session and keep the whole movement pattern sharp.';
  const primary = matched[0];
  const band = primary.score < 60 ? 'high priority' : primary.score < 80 ? 'moderate priority' : 'maintenance';
  const verb = primary.score < 80 ? 'correcting' : 'locking in';
  return `${verb} ${primary.label} (${primary.score}/100 — ${band}). Your clip showed: ${primary.detail}`;
}

/**
 * Build the personalised 15-minute session. Slots are weighted by weakness so
 * the athlete spends the most time on the fault costing them the most points.
 */
export function buildAdaptiveWorkout(input: PlanInput): PlanResult {
  const { analysis, skill, athleteId, athleteLevel, previousWorkouts, sessions, previousOverall } = input;

  const completedSessions = sessions.length;
  const difficultyLevel = nextDifficultyLevel({ athleteLevel, overall: analysis.overall, previousOverall, completedSessions });
  const difficulty = difficultyLabel(difficultyLevel);

  const ranked = [...analysis.signals].sort((a, b) => a.score - b.score);
  const weak = ranked.filter((s) => s.score < 86);
  const focusSignals = (weak.length >= 2 ? weak : ranked.slice(0, 2)).slice(0, 3);

  const recentDrillIds = new Set(previousWorkouts.slice(0, 2).flatMap((w) => w.drills.map((d) => d.drillId)));

  const focusWeights = focusSignals.map((signal, index) => ({
    key: signal.key,
    label: signal.label,
    score: signal.score,
    weight: (signal.weight ?? 1) * (index === 0 ? 1.35 : index === 1 ? 1.15 : 1),
    joints: signal.joints,
  }));

  // the re-test block is appended explicitly, so it is never a candidate
  const drillPool = DRILLS.filter(
    (d) => (d.sport === analysis.sport || d.sport === 'any') && d.id !== FINAL_TEST_DRILL_ID,
  );
  const chosen: { drill: DrillDefinition; matched: MovementSignal[] }[] = [];
  const used = new Set<string>();

  for (const focus of focusWeights) {
    const candidates = drillPool
      .filter((d) => !used.has(d.id) && d.targetSignals.includes(focus.key))
      .map((drill) => ({
        drill,
        score: scoreDrill(drill, focusWeights, skill, difficultyLevel, recentDrillIds),
      }))
      .sort((a, b) => b.score - a.score);
    const pick = candidates[0];
    if (pick) {
      used.add(pick.drill.id);
      const matched = analysis.signals.filter((s) => pick.drill.targetSignals.includes(s.key) && s.score < 86);
      chosen.push({ drill: pick.drill, matched: matched.length ? matched : [analysis.signals.find((s) => s.key === focus.key)!] });
    }
  }

  // supporting / maintenance slot: the athlete's strongest assets still get work
  const supportCandidates = drillPool
    .filter((d) => !used.has(d.id))
    .map((drill) => ({ drill, score: scoreDrill(drill, focusWeights, skill, difficultyLevel, recentDrillIds) }))
    .sort((a, b) => b.score - a.score);
  const support = supportCandidates[0];

  const slots = [4, 4, 3, 2, 2];
  const drills: WorkoutDrill[] = [];

  chosen.forEach((entry, index) => {
    const matched = entry.matched.filter(Boolean) as MovementSignal[];
    drills.push(toWorkoutDrill(entry.drill, slots[index] ?? 3, reasonFor(matched), entry.drill.difficulty));
  });

  if (support && drills.length < 4) {
    const primary = ranked[ranked.length - 1];
    drills.push(
      toWorkoutDrill(
        support.drill,
        slots[drills.length] ?? 2,
        `Support block: ${support.drill.targetLabel} is already your strongest area (${primary.label} ${primary.score}/100), so today we maintain it rather than overload it.`,
        support.drill.difficulty,
      ),
    );
  }

  drills.push(finalTestDrill(skill, analysis, slots[4] ?? 2));

  const rootCauses = focusSignals.map((signal) => {
    const definition = skill.signals.find((s) => s.key === signal.key);
    const phaseText = signal.phase === 'whole-movement' ? 'across the whole movement' : `during the ${signal.phase} phase`;
    return `${signal.label} — ${definition?.whyItMatters.split('.')[0] ?? signal.detail} (flagged ${phaseText}).`;
  });

  const explanation = buildExplanation(analysis, focusSignals, difficultyLevel, previousOverall);

  const workout: Workout = {
    id: `workout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: athleteId,
    sport: analysis.sport,
    skill: skill.id,
    skillName: skill.name,
    createdAt: new Date().toISOString(),
    completed: false,
    difficulty,
    difficultyLevel,
    totalMinutes: drills.reduce((sum, d) => sum + d.durationMin, 0),
    drills,
    focusSignals: focusSignals.map((s) => s.key),
    rootCauses,
    generatedReason: explanation,
    baselineAnalysisId: analysis.id,
    baselineOverall: analysis.overall,
    xpEarned: 0,
  };

  return { workout, focusSignals, difficultyLevel, explanation, rootCauses };
}

function toWorkoutDrill(drill: DrillDefinition, minutes: number, reason: string, difficulty: DifficultyLevel): WorkoutDrill {
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
    completed: false,
  };
}

function finalTestDrill(skill: SkillDefinition, analysis: VideoAnalysis, minutes: number): WorkoutDrill {
  const top = analysis.weaknesses[0];
  return {
    drillId: FINAL_TEST_DRILL_ID,
    name: 'Final Skill Test',
    durationMin: minutes,
    targetLabel: 'Overall Technique',
    targetSignals: analysis.weaknesses.map((w) => w.signalKey),
    difficulty: analysis.difficultyEstimate,
    intensity: 3,
    equipment: ['Phone / camera', 'Ball or clear space'],
    setup: 'Set the camera back to the same spot you used for the original 30-second clip.',
    steps: [
      `Repeat ${skill.name.toLowerCase()} exactly as you did in your first recording.`,
      'Give it 100% effort — this is the re-test the AI compares against your baseline.',
      'Record another 30-second clip straight after this drill block.',
    ],
    coachingCue: top ? `Focus on one thing only: ${top.title.toLowerCase()}.` : 'Give the same motion you have been drilling for the last 13 minutes.',
    volume: '3-5 quality repetitions, then re-record',
    reason: `Re-test the exact movement that was analysed so the AI can measure your improvement and rebuild tomorrow's session around it.`,
    completed: false,
  };
}

function buildExplanation(analysis: VideoAnalysis, focus: MovementSignal[], level: number, previousOverall?: number): string {
  const names = focus.map((s) => s.label).join(', ');
  const trend =
    previousOverall === undefined
      ? 'This is your baseline session for this skill.'
      : analysis.overall >= previousOverall
        ? `You are up ${Math.abs(analysis.overall - previousOverall)} points since your last test.`
        : `You are down ${Math.abs(analysis.overall - previousOverall)} points since your last test, so today leans into technique rather than volume.`;
  return `Your ${analysis.skillName.toLowerCase()} scored ${analysis.overall}/100. The session prioritises ${names} because those were the lowest scoring signals in the clip. ${trend} Difficulty is set to level ${level} (${difficultyLabel(level)}) based on your score, trend and training volume.`;
}

/* ------------------------------------------------------------------ *
 * post-session adaptation
 * ------------------------------------------------------------------ */

export interface AdaptationSummary {
  xp: number;
  nextLevel: number;
  message: string;
}

/** XP is weighted by how much the session actually asked of the athlete. */
export function completionXp(workout: Workout, completionRatio: number, streak: number): number {
  const base = workout.totalMinutes * 6;
  const intensityBonus = workout.drills.reduce((sum, d) => sum + d.intensity * 4, 0);
  const difficultyBonus = workout.difficultyLevel * 6;
  const streakBonus = Math.min(streak, 10) * 3;
  return Math.round((base + intensityBonus + difficultyBonus + streakBonus) * clamp(completionRatio, 0.25, 1));
}

export function badgeProgressHint(workout: Workout): string {
  const top = workout.focusSignals[0];
  const drill = DRILLS_BY_ID[workout.drills[0]?.drillId];
  if (drill && top) return `Finishing this session tags ${drill.targetLabel.toLowerCase()} work against your ${top.replace(/([A-Z])/g, ' $1').toLowerCase()}.`;
  return 'Finish the session to unlock progress tags.';
}
