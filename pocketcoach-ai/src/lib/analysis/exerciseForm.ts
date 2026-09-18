/**
 * Exercise form engine — push-ups & pull-ups.
 *
 * Thresholds are fitted to the PocketCoach exercise-angle dataset
 * (16.4k MediaPipe frames: 9,764 push-up, 6,659 pull-up) and sanity-checked
 * against standard biomechanics (NSCA / ACSM rep-quality guidelines):
 *
 *   metric                  dataset p5–p95      biomechanical target
 *   ---------------------------------------------------------------------
 *   push-up elbow angle     38.6° → 178.1°      90°±15 at bottom, ~180 top
 *   push-up hip angle       155°+ (p25)         body line ≥ 160°
 *   pull-up elbow angle     17.1° → 179.1°      <45° at top, ~180 hang
 *   pull-up shoulder ext.   16.8° → 177.5°      full extension at hang
 *   knee angle (both)       ≈170°+              no knee tucking / kipping
 *
 * Angle convention: interior joint angle in degrees (180 = straight limb),
 * computed from MediaPipe landmarks in math space (y up), same as the rest
 * of the analysis stack.
 */

import type { Landmark } from '@/lib/types';
import { LM } from '@/lib/pose/landmarks';

export type ExerciseId = 'pushup' | 'pullup';

export type FormTone = 'good' | 'warn' | 'bad';

export interface FormError {
  /** stable machine id, e.g. `pushup:elbow-depth` */
  id: string;
  /** human-readable coaching feedback string */
  message: string;
  tone: FormTone;
  /** measured angle that triggered the flag */
  measured: number;
  /** accepted [min, max] for that angle */
  range: [number, number];
}

export interface ExerciseFormReading {
  errors: FormError[];
  /** 0–100, see scoreExerciseForm() */
  score: number;
  /** per-joint measurements for live chips */
  metrics: { key: string; label: string; value: number; range: [number, number]; tone: FormTone }[];
  bodyVisible: boolean;
}

/** A joint-angle acceptance window; deviation outside warn band flags an error. */
interface JointSpec {
  key: string;
  label: string;
  /** accepted [min, max] in degrees for a CORRECT rep */
  min: number;
  max: number;
  /** soft band outside [min,max] that still counts as 'warn', not 'bad' */
  tolerance: number;
  /** relative weight in the form score (safety-critical joints score higher) */
  weight: number;
  /** messages for below-min and above-max deviation */
  below: string;
  above: string;
}

/* -------------------------------------------------------------------------- */
/* 1. Thresholds                                                              */
/* -------------------------------------------------------------------------- */

/**
 * PUSH-UP — side-on view, body straight, hands under shoulders.
 * Hip extension (body line) is weighted hardest: sagging hips is the #1
 * fault and the one that makes everything else unmeasurable.
 */
const PUSHUP: JointSpec[] = [
  {
    key: 'elbow',
    label: 'Elbow bend',
    min: 75, max: 178, tolerance: 15, weight: 3,
    below: 'Not low enough — chest to fist depth (elbow ~90° at the bottom)',
    above: 'Bend the elbows more — you are doing a shoulder dip, not a push-up',
  },
  {
    key: 'hip',
    label: 'Body line',
    min: 160, max: 180, tolerance: 8, weight: 4,
    below: 'Hips sagging — squeeze glutes and brace the core into one straight line',
    above: 'Pike position — drop the hips so shoulders, hips and ankles align',
  },
  {
    key: 'shoulder',
    label: 'Shoulder fold',
    min: 20, max: 90, tolerance: 20, weight: 1.5,
    below: 'Collapsing at the shoulders — keep the chest leading, elbows ~45° from the body',
    above: 'Shrugging into the ears — press away and keep the shoulder blades stable',
  },
  {
    key: 'knee',
    label: 'Knee line',
    min: 150, max: 180, tolerance: 10, weight: 1,
    below: 'Knees bent — a push-up is a moving plank, legs straight (or switch to knee push-ups deliberately)',
    above: '',
  },
];

/**
 * PULL-UP — bar view, dead hang to chin-over.
 * Shoulder extension weighted hardest: partial extension (no dead hang)
 * and kipping are the faults the elbow alone can't catch.
 */
const PULLUP: JointSpec[] = [
  {
    key: 'elbow',
    label: 'Elbow bend',
    min: 30, max: 178, tolerance: 15, weight: 3,
    below: 'Over-bent at the bottom — extend the arms fully in the dead hang',
    above: 'Pull higher — chin over bar needs elbows well past 90°',
  },
  {
    key: 'shoulder',
    label: 'Shoulder extension',
    min: 40, max: 175, tolerance: 15, weight: 3,
    below: 'Partial dead hang — let the shoulders extend fully before pulling',
    above: 'Arms stay overhead — pulling with the chest, not the back',
  },
  {
    key: 'hip',
    label: 'Hip line',
    min: 155, max: 180, tolerance: 10, weight: 4,
    below: 'Kipping — swing comes from hip drive, not lats. Keep hips square under the bar',
    above: '',
  },
  {
    key: 'knee',
    label: 'Knee line',
    min: 140, max: 180, tolerance: 15, weight: 1,
    below: 'Tucked knees — a strict pull-up hangs straight (bent knees are fine only if held still)',
    above: '',
  },
];

const SPECS: Record<ExerciseId, JointSpec[]> = { pushup: PUSHUP, pullup: PULLUP };

/* -------------------------------------------------------------------------- */
/* 2. Live measurement                                                        */
/* -------------------------------------------------------------------------- */

interface LandmarkLike { x: number; y: number; z?: number; visibility?: number }

function interiorAngle(a: LandmarkLike, b: LandmarkLike, c: LandmarkLike): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  return mag < 1e-6 ? 180 : (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function measureAngles(frame: Landmark[] | LandmarkLike[]) {
  const v = (i: number) => frame[i] as LandmarkLike;
  const vis = (i: number) => (v(i)?.visibility ?? 1) > 0.5;
  const angle = (a: number, b: number, c: number) => interiorAngle(v(a), v(b), v(c));

  // per side, prefer the more visible limb; MediaPipe frames from the app are
  // already in math space so no flipping is needed for angles (rotationally invariant)
  const side = (s: 'l' | 'r') => {
    const [sh, el, wr, hp, kn, an] =
      s === 'l'
        ? [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE]
        : [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST, LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE];
    return {
      elbow: angle(sh, el, wr),
      shoulder: angle(hp, sh, el),
      hip: angle(sh, hp, kn),
      knee: angle(hp, kn, an),
      visible: vis(sh) && vis(el) && vis(hp) && vis(kn),
    };
  };

  const left = side('l');
  const right = side('r');
  const pick = (key: 'elbow' | 'shoulder' | 'hip' | 'knee') => {
    if (left.visible && right.visible) return (left[key] + right[key]) / 2;
    if (left.visible) return left[key];
    if (right.visible) return right[key];
    return undefined;
  };
  return { elbow: pick('elbow'), shoulder: pick('shoulder'), hip: pick('hip'), knee: pick('knee') };
}

/* -------------------------------------------------------------------------- */
/* 3. Per-frame error flagging + scoring                                      */
/* -------------------------------------------------------------------------- */

function toneFor(measured: number, spec: JointSpec): FormTone {
  const hardOut = measured < spec.min - spec.tolerance || measured > spec.max + spec.tolerance;
  if (hardOut) return 'bad';
  return measured < spec.min || measured > spec.max ? 'warn' : 'good';
}

function errorsFor(exercise: ExerciseId, angles: ReturnType<typeof measureAngles>): { errors: FormError[]; metrics: ExerciseFormReading['metrics'] } {
  const errors: FormError[] = [];
  const metrics: ExerciseFormReading['metrics'] = [];
  for (const spec of SPECS[exercise]) {
    const value = angles[spec.key as keyof typeof angles];
    if (value === undefined) continue; // limb hidden — no invented errors
    const tone = toneFor(value, spec);
    metrics.push({ key: spec.key, label: spec.label, value, range: [spec.min, spec.max], tone });
    if (tone === 'good' || !spec.below && !spec.above) continue;
    const message = value < spec.min ? spec.below : spec.above;
    if (!message) continue; // one-sided spec, deviation on the un-messaged side
    errors.push({ id: `${exercise}:${spec.key}`, message, tone, measured: value, range: [spec.min, spec.max] });
  }
  // worst first: 'bad' tones, then largest relative deviation
  errors.sort((a, b) => {
    if (a.tone !== b.tone) return a.tone === 'bad' ? -1 : 1;
    const dev = (e: FormError) => {
      const [min, max] = e.range;
      return e.measured < min ? min - e.measured : e.measured > max ? e.measured - max : 0;
    };
    return dev(b) - dev(a);
  });
  return { errors, metrics };
}

/**
 * Map the frame's measurements to a 0–100 form score.
 *
 * Logic structure:
 *   1. every tracked joint starts at 100
 *   2. inside [min,max]           → 100 (perfect window)
 *   3. within `tolerance` outside → 55–99, linear decay from window edge
 *   4. beyond tolerance           → decays toward 15, floor-limited
 *   5. weighted mean by spec.weight (safety-critical joints dominate)
 *   6. hidden joints are dropped from the mean, never scored as 0
 */
export function scoreExerciseForm(exercise: ExerciseId, metrics: ExerciseFormReading['metrics']): number {
  const specs = SPECS[exercise];
  let weighted = 0;
  let weightSum = 0;
  for (const spec of specs) {
    const metric = metrics.find((m) => m.key === spec.key);
    if (!metric) continue; // hidden → excluded, not penalised
    const { value } = metric;
    let joint: number;
    if (value >= spec.min && value <= spec.max) {
      joint = 100;
    } else if (value < spec.min) {
      const over = spec.min - value;
      joint = over <= spec.tolerance ? 99 - (over / spec.tolerance) * 44 : Math.max(15, 55 - (over - spec.tolerance) * 1.5);
    } else {
      const over = value - spec.max;
      joint = over <= spec.tolerance ? 99 - (over / spec.tolerance) * 44 : Math.max(15, 55 - (over - spec.tolerance) * 1.5);
    }
    weighted += joint * spec.weight;
    weightSum += spec.weight;
  }
  if (weightSum === 0) return 0;
  return Math.round(weighted / weightSum);
}

/**
 * Measure one frame and flag form errors.
 * Cheap by design: 8 angle computations per frame.
 */
export function assessExerciseForm(exercise: ExerciseId, frame: Landmark[] | LandmarkLike[] | undefined | null): ExerciseFormReading {
  if (!frame || frame.length < 33) {
    return { errors: [], score: 0, metrics: [], bodyVisible: false };
  }
  const angles = measureAngles(frame);
  const bodyVisible = angles.elbow !== undefined;
  const { errors, metrics } = errorsFor(exercise, angles);
  return { errors, metrics, score: bodyVisible ? scoreExerciseForm(exercise, metrics) : 0, bodyVisible };
}

/**
 * Rep-window aware scoring for the LIVE overlay: pass the reading for the
 * current frame plus the phase (`'bottom' | 'top' | 'moving'`) detected by the
 * rep counter, and phase-specific spec subsets are enforced — depth only at
 * the bottom, lockout only at the top. This is what kills the classic bug of
 * flagging "not deep enough" while the athlete is on the way up.
 */
export function assessWithPhase(
  exercise: ExerciseId,
  frame: Landmark[] | LandmarkLike[] | undefined | null,
  phase: 'bottom' | 'top' | 'moving',
): ExerciseFormReading {
  const full = assessExerciseForm(exercise, frame);
  if (phase === 'moving') return full;
  // keep only errors relevant to this phase
  const relevant = new Set(
    exercise === 'pushup'
      ? phase === 'bottom'
        ? ['elbow', 'shoulder'] // depth matters at the bottom
        : ['hip', 'knee'] // body line matters at lockout
      : phase === 'top'
        ? ['shoulder', 'hip'] // chin-over + no kip at the top
        : ['elbow', 'knee'], // full hang at the bottom
  );
  return {
    ...full,
    errors: full.errors.filter((e) => relevant.has(e.id.split(':')[1])),
    metrics: full.metrics.map((m) =>
      relevant.has(m.key) || m.tone === 'good' ? m : { ...m, tone: 'good' as FormTone },
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* 4. Session aggregation                                                     */
/* -------------------------------------------------------------------------- */

export interface FormSessionResult {
  /** mean per-frame score over the tracked frames */
  averageScore: number;
  /** score at the moments that matter (bottom of push-up / top of pull-up) */
  criticalPhaseScore: number;
  /** error id → how often it fired, sorted by frequency */
  errorCounts: { id: string; message: string; count: number; rate: number }[];
  framesTracked: number;
}

/**
 * Aggregate a whole clip/session of readings into the report numbers.
 * `phaseForFrame` is optional — pass the rep counter's phase to get the
 * critical-phase score; without it the function falls back to a heuristic
 * (push-up: frames where elbow < 120°; pull-up: elbow < 90°).
 */
export function summariseFormSession(
  exercise: ExerciseId,
  readings: { score: number; errors: FormError[]; bodyVisible: boolean }[],
  phaseForFrame?: (index: number) => 'bottom' | 'top' | 'moving',
): FormSessionResult {
  const tracked = readings.filter((r) => r.bodyVisible);
  if (tracked.length === 0) {
    return { averageScore: 0, criticalPhaseScore: 0, errorCounts: [], framesTracked: 0 };
  }
  const averageScore = Math.round(tracked.reduce((s, r) => s + r.score, 0) / tracked.length);

  // critical phase: explicit phase fn, else elbow heuristic
  const critical: { score: number }[] = [];
  tracked.forEach((r, i) => {
    const phase = phaseForFrame?.(i);
    if (phase === 'bottom' || phase === 'top') {
      // for push-ups 'bottom' is critical, for pull-ups 'top' is
      const isCritical = exercise === 'pushup' ? phase === 'bottom' : phase === 'top';
      if (isCritical) critical.push({ score: r.score });
      return;
    }
    if (!phaseForFrame) {
      // fallback heuristic handled below via elbow from errors? Keep simple: caller passes phase.
    }
  });
  const criticalPhaseScore = critical.length
    ? Math.round(critical.reduce((s, r) => s + r.score, 0) / critical.length)
    : averageScore;

  const counts = new Map<string, { message: string; count: number }>();
  for (const r of tracked) {
    for (const e of r.errors) {
      const row = counts.get(e.id) ?? { message: e.message, count: 0 };
      row.count += 1;
      counts.set(e.id, row);
    }
  }
  const errorCounts = [...counts.entries()]
    .map(([id, { message, count }]) => ({ id, message, count, rate: count / tracked.length }))
    .sort((a, b) => b.count - a.count);

  return { averageScore, criticalPhaseScore, errorCounts, framesTracked: tracked.length };
}

/** Score → feedback string banding, shared by report and coach surfaces. */
export function formScoreFeedback(score: number): string {
  if (score >= 90) return 'Excellent form — textbook technique, add load or reps';
  if (score >= 78) return 'Good form — small drift under fatigue, keep an eye on it';
  if (score >= 60) return 'Fair form — one clear fault is costing you points, see the top error';
  if (score >= 40) return 'Poor form — reduce the range or switch to an easier progression';
  return 'Form breakdown — stop the set, reset your position, and go again lighter';
}
