/**
 * Live posture feedback.
 *
 * The recording screen overlays a skeleton while the athlete moves. This module
 * is the part that makes that overlay *coach*, not just draw: every tracked
 * frame is measured with the same geometry helpers the post-save analysis uses,
 * then reduced to the single worst cue on screen at a time.
 *
 * Deliberately cheap (a handful of angle computations per frame) so tracking and
 * drawing together stay well inside a 33ms frame budget on a mid-range phone.
 */
import type { Landmark } from '@/lib/types';
import {
  angleAt,
  deviationFromHorizontal,
  deviationFromVertical,
  dist,
  LM,
  mid,
  toVec,
} from '@/lib/pose/landmarks';

export type CueTone = 'good' | 'warn' | 'bad';

export interface LiveCue {
  id: string;
  label: string;
  tone: CueTone;
}

export interface LiveReading {
  /** measured this frame, for the chips next to the skeleton */
  angles: { label: string; value: string; tone: CueTone }[];
  /** at most ONE cue is surfaced at a time — the worst problem wins */
  cue: LiveCue | null;
  /** 0–100, how well the current frame matches the skill's posture model */
  formScore: number;
  /** true when a full body is actually visible in this frame */
  bodyVisible: boolean;
  /** raw joint angles in degrees, for the debug-free per-joint tinting */
  joints: { key: string; tone: CueTone }[];
}

interface Threshold {
  good: number;
  warn: number;
}

const deg = (v: number) => `${Math.round(v)}°`;

/**
 * Check how far a measured angle is from its ideal.
 * `ideal`/`tolerances` are in degrees; `lowerIsBetter` for angles like knee
 * valgus where smaller is correct.
 */
function toneFor(value: number, t: Threshold): CueTone {
  if (value <= t.good) return 'good';
  if (value <= t.warn) return 'warn';
  return 'bad';
}

function worstTone(tones: CueTone[]): CueTone {
  if (tones.includes('bad')) return 'bad';
  if (tones.includes('warn')) return 'warn';
  return 'good';
}

/* -------------------------------------------------------------------------- *
 * Cue stabilisation
 *
 * At 24fps the raw "worst problem" can flip between two issues from frame to
 * frame, which reads as strobing text no one can act on. A cue therefore has to
 * win for a few consecutive frames before it is shown, and it stays on screen
 * briefly after it stops winning — a cheap hysteresis borrowed from how real
 * coaches speak: one thing at a time, held long enough to hear it.
 * -------------------------------------------------------------------------- */

const CUE_CONFIRM_FRAMES = 4; // ~170ms before a new cue appears
const CUE_HOLD_FRAMES = 12; // ~500ms minimum on screen once shown

interface CueStabiliser {
  push(next: LiveCue | null): LiveCue | null;
  reset(): void;
}

function createCueStabiliser(): CueStabiliser {
  let lastCue: LiveCue | null = null;
  let candidate: LiveCue | null = null;
  let candidateFrames = 0;
  let holdRemaining = 0;

  return {
    push(next: LiveCue | null): LiveCue | null {
      // no problems this frame — either hold the current cue out its remaining
      // grace period, or clear it
      if (!next) {
        if (lastCue && holdRemaining > 0) {
          holdRemaining -= 1;
          return lastCue;
        }
        lastCue = null;
        candidate = null;
        candidateFrames = 0;
        return null;
      }

      if (lastCue && next.id === lastCue.id) {
        holdRemaining = CUE_HOLD_FRAMES;
        candidate = null;
        candidateFrames = 0;
        return lastCue;
      }

      if (candidate?.id === next.id) candidateFrames += 1;
      else {
        candidate = next;
        candidateFrames = 1;
      }

      if (candidateFrames >= CUE_CONFIRM_FRAMES) {
        lastCue = candidate;
        holdRemaining = CUE_HOLD_FRAMES;
        candidate = null;
        candidateFrames = 0;
        return lastCue;
      }

      return lastCue; // not confirmed yet — keep showing the old cue, if any
    },
    reset() {
      lastCue = null;
      candidate = null;
      candidateFrames = 0;
      holdRemaining = 0;
    },
  };
}

/** Shared stabiliser for the live camera path (single-user, single-feed). */
const liveStabiliser = createCueStabiliser();

const TONE_SCORE: Record<CueTone, number> = { good: 100, warn: 68, bad: 34 };

/**
 * Measure one frame of the live feed.
 *
 * Posture model (same reference lines the post-save engine benchmarks against):
 *  - torso lean: shoulder-mid → hip-mid vs vertical
 *  - shoulder level: left/right shoulder height difference
 *  - elbow flare: upper-arm vs torso-line angle, per side (setup phase only;
 *    a raised arm is a release and is skipped)
 *  - knee depth: knee angle, per side
 *  - knee tracking: knee vs ankle-hip line (valgus), per side
 *
 * Everything degrades to "good" when a landmark is not visible, so partial
 * visibility produces fewer cues rather than wrong ones.
 */
export function measureLiveFrame(frame: Landmark[] | undefined | null): LiveReading {
  if (!frame || frame.length < 33) {
    liveStabiliser.reset();
    return { angles: [], cue: null, formScore: 0, bodyVisible: false, joints: [] };
  }

  const v = (i: number) => toVec(frame[i]);
  const vis = (i: number) => (frame[i]?.visibility ?? 1) > 0.5;

  const shoulderMid = mid(v(LM.LEFT_SHOULDER), v(LM.RIGHT_SHOULDER));
  const hipMid = mid(v(LM.LEFT_HIP), v(LM.RIGHT_HIP));

  /* --- torso lean (0 = vertical, 90 = horizontal; either direction counts) - */
  const torsoLean = vis(LM.LEFT_SHOULDER) && vis(LM.RIGHT_SHOULDER) && vis(LM.LEFT_HIP) && vis(LM.RIGHT_HIP)
    ? deviationFromVertical(shoulderMid, hipMid)
    : 0;
  const leanTone = toneFor(torsoLean, { good: 10, warn: 20 });

  /* --- shoulder level (0 = level, 90 = one shoulder straight above the other) */
  const shoulderDrop = vis(LM.LEFT_SHOULDER) && vis(LM.RIGHT_SHOULDER)
    ? deviationFromHorizontal(v(LM.LEFT_SHOULDER), v(LM.RIGHT_SHOULDER))
    : 0;
  const shoulderTone = toneFor(shoulderDrop, { good: 12, warn: 25 });

  /* --- elbows ------------------------------------------------------------ */
  // Flare is the angle at the shoulder between the torso line (same-side hip)
  // and the upper arm — a real angle in degrees, ~15-20° when the arm hangs
  // naturally, 40°+ when the elbow drifts out. It only applies during the
  // setup (elbow below shoulder); once the arm is up in a release, the angle
  // is meaningless, so the side is skipped rather than false-flagged.
  const elbowReadings: { side: string; flare: number; tone: CueTone; visible: boolean }[] = [];
  for (const side of ['left', 'right'] as const) {
    const shoulder = side === 'left' ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER;
    const elbow = side === 'left' ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW;
    const wrist = side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST;
    const hip = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
    if (!vis(shoulder) || !vis(elbow) || !vis(wrist) || !vis(hip)) {
      elbowReadings.push({ side, flare: 0, tone: 'good', visible: false });
      continue;
    }
    const release = v(elbow).y >= v(shoulder).y;
    const flare = release ? 0 : angleAt(v(hip), v(shoulder), v(wrist));
    const tone: CueTone = release ? 'good' : toneFor(flare, { good: 22, warn: 38 });
    elbowReadings.push({ side, flare, tone, visible: true });
  }
  const visibleElbows = elbowReadings.filter((e) => e.visible);
  const worstElbow = visibleElbows.length
    ? visibleElbows.reduce((worst, e) => (e.flare > worst.flare ? e : worst))
    : undefined;

  /* --- knees ------------------------------------------------------------- */
  const kneeReadings: { side: string; flexion: number; valgus: number; tone: CueTone; visible: boolean }[] = [];
  for (const side of ['left', 'right'] as const) {
    const hip = side === 'left' ? LM.LEFT_HIP : LM.RIGHT_HIP;
    const knee = side === 'left' ? LM.LEFT_KNEE : LM.RIGHT_KNEE;
    const ankle = side === 'left' ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE;
    if (!vis(hip) || !vis(knee) || !vis(ankle)) {
      kneeReadings.push({ side, flexion: 180, valgus: 0, tone: 'good', visible: false });
      continue;
    }
    const flexion = angleAt(v(hip), v(knee), v(ankle));
    // signed lateral knee offset: positive = collapsing inward toward the
    // midline (true valgus), negative = bowing outward (usually harmless)
    const hipV = v(hip);
    const kneeV = v(knee);
    const ankleV = v(ankle);
    const abx = ankleV.x - hipV.x;
    const aby = ankleV.y - hipV.y;
    const tt = ((kneeV.x - hipV.x) * abx + (kneeV.y - hipV.y) * aby) / Math.max(abx * abx + aby * aby, 1e-6);
    const lineX = hipV.x + tt * abx;
    const sign = side === 'left' ? 1 : -1; // direction of the midline per side
    const valgus = ((kneeV.x - lineX) * sign / Math.max(dist(hipV, ankleV), 1e-4)) * 100;
    // depth band: collapsing below ~85° is where form breaks down; standing
    // tall between reps is neutral, not an error worth nagging about
    const flexionTone: CueTone = flexion < 85 ? 'bad' : flexion < 95 ? 'warn' : 'good';
    const tone = worstTone([flexionTone, toneFor(valgus, { good: 6, warn: 12 })]);
    kneeReadings.push({ side, flexion, valgus, tone, visible: true });
  }
  const visibleKnees = kneeReadings.filter((k) => k.visible);
  const worstKnee = visibleKnees.length
    ? visibleKnees.reduce((worst, k) => (TONE_SCORE[k.tone] < TONE_SCORE[worst.tone] ? k : worst))
    : undefined;

  /* --- balance: lateral sway of the centre of mass ------------------------ */
  const comX = (shoulderMid.x + hipMid.x) / 2;
  const baseMid = mid(v(LM.LEFT_ANKLE), v(LM.RIGHT_ANKLE));
  const stanceWidth = vis(LM.LEFT_ANKLE) && vis(LM.RIGHT_ANKLE) ? dist(v(LM.LEFT_ANKLE), v(LM.RIGHT_ANKLE)) : 0.25;
  const sway = vis(LM.LEFT_ANKLE) && vis(LM.RIGHT_ANKLE) ? Math.abs(comX - baseMid.x) / Math.max(stanceWidth, 0.05) : 0;
  const swayTone = toneFor(sway, { good: 0.22, warn: 0.45 });

  /* --- reduce to one cue -------------------------------------------------- */
  interface Candidate {
    id: string;
    label: string;
    tone: CueTone;
    weight: number;
  }
  const candidates: Candidate[] = [];
  if (worstElbow && worstElbow.tone !== 'good') {
    candidates.push({
      id: 'elbow',
      tone: worstElbow.tone,
      weight: worstElbow.tone === 'bad' ? 5 : 3,
      label: worstElbow.tone === 'bad'
        ? 'Elbow drifting outward — tuck it under the ball'
        : 'Keep the elbow closer to your body line',
    });
  }
  if (worstKnee && worstKnee.tone !== 'good') {
    candidates.push({
      id: 'knee',
      tone: worstKnee.tone,
      weight: worstKnee.tone === 'bad' ? 4 : 2,
      label: worstKnee.valgus > 12
        ? 'Knees tracking inward — push them out over the toes'
        : worstKnee.flexion < 95
          ? 'Knee depth very low — control the descent'
          : 'Bend the knees more — load the legs before you move',
    });
  }
  if (leanTone !== 'good') {
    candidates.push({
      id: 'torso',
      tone: leanTone,
      weight: leanTone === 'bad' ? 4 : 2,
      label: leanTone === 'bad'
        ? 'Torso leaning far forward — stack shoulders over hips'
        : 'Slight forward lean — stay tall through the spine',
    });
  }
  // a lean shifts the centre of mass by definition — when one is already
  // flagged, the sway reading is the same root cause, so don't double-report it
  if (leanTone === 'good' && swayTone !== 'good') {
    candidates.push({
      id: 'balance',
      tone: swayTone,
      weight: swayTone === 'bad' ? 4 : 2,
      label: swayTone === 'bad'
        ? 'Losing balance to one side — weight over both feet'
        : 'Slight sway — centre your weight',
    });
  }
  if (shoulderTone !== 'good') {
    candidates.push({
      id: 'shoulders',
      tone: shoulderTone,
      weight: 1,
      label: 'Shoulders uneven — level them out',
    });
  }
  candidates.sort((a, b) => b.weight - a.weight);
  const cue = liveStabiliser.push(candidates[0] ?? null);

  /* --- form score ---------------------------------------------------------- */
  const toneValues = [leanTone, shoulderTone, swayTone];
  if (worstElbow?.visible) toneValues.push(worstElbow.tone);
  for (const knee of visibleKnees) toneValues.push(knee.tone);
  const formScore = toneValues.length
    ? Math.round(toneValues.reduce((sum, tone) => sum + TONE_SCORE[tone], 0) / toneValues.length)
    : 0;

  /* --- chips + per-joint tinting ------------------------------------------- */
  const angles: LiveReading['angles'] = [];
  if (worstElbow?.visible) {
    angles.push({
      label: `${worstElbow.side === 'left' ? 'L' : 'R'} elbow flare`,
      value: deg(worstElbow.flare),
      tone: worstElbow.tone,
    });
  }
  for (const knee of visibleKnees) {
    angles.push({
      label: `${knee.side === 'left' ? 'L' : 'R'} knee`,
      value: deg(knee.flexion),
      tone: knee.tone,
    });
  }
  if (vis(LM.LEFT_SHOULDER) && vis(LM.RIGHT_SHOULDER)) {
    angles.push({ label: 'torso lean', value: deg(torsoLean), tone: leanTone });
    angles.push({ label: 'shoulder level', value: deg(shoulderDrop), tone: shoulderTone });
  }

  const joints: LiveReading['joints'] = [];
  if (worstElbow?.visible) {
    joints.push({ key: worstElbow.side === 'left' ? 'leftElbow' : 'rightElbow', tone: worstElbow.tone });
  }
  for (const knee of visibleKnees) {
    joints.push({ key: knee.side === 'left' ? 'leftKnee' : 'rightKnee', tone: knee.tone });
  }
  if (leanTone !== 'good') joints.push({ key: 'torso', tone: leanTone });

  const bodyVisible =
    vis(LM.LEFT_SHOULDER) && vis(LM.RIGHT_SHOULDER) && vis(LM.LEFT_HIP) && vis(LM.RIGHT_HIP);

  return { angles, cue, formScore: bodyVisible ? formScore : 0, bodyVisible, joints };
}
