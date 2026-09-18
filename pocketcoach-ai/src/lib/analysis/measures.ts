import type {
  Landmark,
  MeasureKey,
  Measurement,
  MotionTimeline,
  PoseFrames,
  RecordingQuality,
  SignalDefinition,
} from '@/lib/types';
import { JOINT_INDEX } from '@/lib/pose/landmarks';
import { toWorldX } from '@/lib/pose/view';
import {
  LM,
  angleAt,
  angleFromHorizontal,
  angleFromVertical,
  bodyHeight,
  bodyWidth,
  centerOfMass,
  clamp,
  cv,
  deviationFromVertical,
  dist,
  lm,
  mean,
  median,
  medianAbsDeviation,
  mid,
  side as jointOf,
  smooth,
  stdDev,
} from '@/lib/pose/landmarks';
import type { Vec } from '@/lib/pose/landmarks';
import { phaseRange } from '@/lib/pose/motion';

export interface MeasureContext {
  frames: PoseFrames;
  timeline: MotionTimeline;
  /** working (shooting / striking) side */
  side: 'left' | 'right';
  quality: RecordingQuality;
}

export type MeasureFn = (ctx: MeasureContext, signal: SignalDefinition) => Measurement;

/* ------------------------------------------------------------------ *
 * scoring helpers
 * ------------------------------------------------------------------ */

/** Score a single ideal value: 100 inside the tolerance band, 22 at the hard limit. */
function deviationScore(value: number, ideal: number, soft: number, hard: number): number {
  const d = Math.abs(value - ideal);
  if (d <= soft) return Math.round(100 - (d / (soft || 1)) * 8);
  if (d >= hard) return 22;
  const t = (d - soft) / (hard - soft);
  return Math.round(92 - t * 70);
}

/** Score a range: best in the middle of [low, high], 22 at the hard limits. */
function rangeScore(value: number, low: number, high: number, hardLow: number, hardHigh: number): number {
  const center = (low + high) / 2;
  const span = Math.max(high - low, 1e-6);
  if (value >= low && value <= high) {
    return Math.round(100 - (Math.abs(value - center) / (span / 2)) * 6);
  }
  if (value < low) {
    const t = clamp((low - value) / Math.max(low - hardLow, 1e-6), 0, 1);
    return Math.round(92 - t * 70);
  }
  const t = clamp((value - high) / Math.max(hardHigh - high, 1e-6), 0, 1);
  return Math.round(92 - t * 70);
}

function avgRange(timeline: MotionTimeline, phase: string, from: number, to: number, series: number[]): number {
  const [a, b] = phaseRange(timeline, phase);
  const lo = clamp(Math.round(a + (b - a) * from), 0, series.length - 1);
  const hi = clamp(Math.round(a + (b - a) * to), lo, series.length - 1);
  return mean(series.slice(lo, hi + 1));
}

function pick(frame: Landmark[] | undefined, joint: string): Vec {
  return jointOf(frame, joint);
}

/**
 * 3D angle at `b` in the chain a-b-c. MediaPipe supplies a z landmark, so
 * hinge measurements (elbow, wrist, knee) are read in three dimensions instead
 * of being distorted by the camera yaw.
 */
function angle3(frame: Landmark[] | undefined, ja: string, jb: string, jc: string): number {
  if (!frame) return 180;
  const a = frame[JOINT_INDEX[ja] ?? LM.LEFT_SHOULDER];
  const b = frame[JOINT_INDEX[jb] ?? LM.LEFT_ELBOW];
  const c = frame[JOINT_INDEX[jc] ?? LM.LEFT_WRIST];
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z ?? 0) - (b.z ?? 0) };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag = (Math.hypot(v1.x, v1.y, v1.z) || 1e-6) * (Math.hypot(v2.x, v2.y, v2.z) || 1e-6);
  return (Math.acos(clamp(dot / mag, -1, 1)) * 180) / Math.PI;
}

const p = (signal: SignalDefinition, key: string, fallback: number): number => signal.params?.[key] ?? fallback;

/* ------------------------------------------------------------------ *
 * measurement modules
 * ------------------------------------------------------------------ */

/**
 * Hoop / shooting: how far the working elbow drifts outside the shoulder line.
 *
 * "Elbow under the ball" is a frontal-plane question, so this measurement
 * un-projects each landmark out of the 3/4 camera view into body space instead
 * of naively reading image x (which would confuse a forward arm with a flared
 * elbow). MediaPipe's z landmark makes the same code work on real footage.
 */
const elbowAlignment: MeasureFn = (ctx, signal) => {
  const ideal = p(signal, 'idealFlare', 8);
  const soft = p(signal, 'softFlare', 6);
  const hard = p(signal, 'hardFlare', 30);
  const offsets: number[] = [];

  ctx.frames.forEach((frame) => {
    const shoulderJoint = JOINT_INDEX[`${ctx.side}Shoulder`];
    const elbowJoint = JOINT_INDEX[`${ctx.side}Elbow`];
    const shoulder = frame[shoulderJoint];
    const elbow = frame[elbowJoint];
    const left = frame[LM.LEFT_SHOULDER];
    const right = frame[LM.RIGHT_SHOULDER];
    const width = Math.abs(toWorldX(left.x, left.z ?? 0) - toWorldX(right.x, right.z ?? 0)) || 0.35;
    const offset = Math.abs(toWorldX(elbow.x, elbow.z ?? 0) - toWorldX(shoulder.x, shoulder.z ?? 0));
    offsets.push((offset / width) * 100);
  });

  const flare = avgRange(ctx.timeline, 'execution', 0, 0.8, smooth(offsets, 3));
  const release = ctx.timeline.phases.release;
  const frame = ctx.frames[release];
  const bend = 180 - angle3(frame, `${ctx.side}Shoulder`, `${ctx.side}Elbow`, `${ctx.side}Wrist`);
  const score = deviationScore(flare, ideal, soft, hard);
  return {
    value: Math.round(flare * 10) / 10,
    secondary: Math.round(bend),
    score,
    detail: `Shooting elbow drifts ${flare.toFixed(0)}% of the shoulder line outside the shooting line at release.`,
    note: `Arm bend at release ${bend.toFixed(0)}° (target under 20°)`,
  };
};

/** Guard / dribbling: elbow position relative to the ribcage. */
const elbowTuck: MeasureFn = (ctx, signal) => {
  const ideal = p(signal, 'idealAngle', 105);
  const angles: number[] = [];
  ctx.frames.forEach((frame) => {
    angles.push(angleAt(pick(frame, `${ctx.side}Shoulder`), pick(frame, `${ctx.side}Elbow`), pick(frame, `${ctx.side}Wrist`)));
  });
  const angle = avgRange(ctx.timeline, 'whole-movement', 0, 1, smooth(angles, 3));
  const score = rangeScore(angle, ideal - 25, ideal + 20, 40, 175);
  return {
    value: Math.round(angle),
    score,
    detail: `Elbows average ${angle.toFixed(0)}° of bend — ${angle > 150 ? 'arms are hanging straight down' : angle < 70 ? 'arms are pinned too tight' : 'in a stable guard position'}.`,
  };
};

/** Knee bend at the bottom of the movement. */
const kneeFlexion: MeasureFn = (ctx, signal) => {
  const angles = ctx.frames.map((frame) => {
    const l = angleAt(pick(frame, 'leftHip'), pick(frame, 'leftKnee'), pick(frame, 'leftAnkle'));
    const r = angleAt(pick(frame, 'rightHip'), pick(frame, 'rightKnee'), pick(frame, 'rightAnkle'));
    return (l + r) / 2;
  });
  const smoothed = smooth(angles, 3);
  const low = p(signal, 'idealLow', 95);
  const high = p(signal, 'idealHigh', 120);
  const load = smoothed[ctx.timeline.phases.load];
  const score = rangeScore(load, low, high, p(signal, 'hardLow', 50), p(signal, 'hardHigh', 175));
  return {
    value: Math.round(load),
    score,
    detail: `Deepest knee bend is ${load.toFixed(0)}° at the load phase (target ${low}–${high}°).`,
    note: load > high ? 'Not enough dip before the movement' : load < low ? 'Dipping too deep, losing power' : 'Loaded well',
  };
};

/** Knee tracking — do the knees collapse inward under load? */
const kneeValgus: MeasureFn = (ctx, signal) => {
  const values: number[] = [];
  ctx.frames.forEach((frame) => {
    const kneeGap = Math.abs(pick(frame, 'leftKnee').x - pick(frame, 'rightKnee').x);
    const ankleGap = Math.max(Math.abs(pick(frame, 'leftAnkle').x - pick(frame, 'rightAnkle').x), 0.08);
    values.push(((ankleGap * 1.02 - kneeGap) / ankleGap) * 100);
  });
  const collapse = Math.max(0, avgRange(ctx.timeline, 'load', 0, 1, smooth(values, 3)));
  const score = clamp(deviationScore(collapse, 2, 6, p(signal, 'hardCollapse', 34)), 22, 100);
  return {
    value: Math.round(collapse),
    score,
    detail: `Knees ${collapse > 12 ? 'collapse inward by' : 'track within'} ${collapse.toFixed(0)}% of the ankle line during the load.`,
  };
};

/**
 * Shooting: is the wrist held high after the release?
 *
 * "Hand in the cookie jar" means the shooting hand stays above the shoulder
 * line. The hold is read forward from the release frame, so this also captures
 * how early the athlete drops the hand to watch the ball.
 */
const followThroughHold: MeasureFn = (ctx, signal) => {
  const { release } = ctx.timeline.phases;
  const series = ctx.frames.map((frame) => pick(frame, `${ctx.side}Wrist`).y - pick(frame, `${ctx.side}Shoulder`).y);
  const fps = ctx.timeline.fps;
  // "in the cookie jar": how long the shooting hand *hovers at the top* of its
  // own release arc. Normalised against the athlete's clip peak (so body size
  // and jump height cancel out) and averaged per repetition, which makes it
  // robust to where the repetitions get segmented.
  const reps = Math.max(ctx.timeline.reps.length, 1);
  const peak = Math.max(...series);
  const threshold = peak * 0.7;
  let holdFrames = 0;
  for (let i = 0; i < series.length; i += 1) {
    if (series[i] > threshold) holdFrames += 1;
  }
  const perRepFrames = holdFrames / reps;
  const holdSec = perRepFrames / fps;
  const idealHold = p(signal, 'idealHoldSec', 0.9);
  const frame = ctx.frames[Math.min(release + Math.round(fps * 0.3), ctx.frames.length - 1)];
  const flexion = 180 - angle3(frame, `${ctx.side}Elbow`, `${ctx.side}Wrist`, `${ctx.side}Index`);
  const score = clamp(
    Math.round(rangeScore(holdSec, idealHold, idealHold + 1.2, 0, idealHold + 2) * 0.7 + rangeScore(flexion, 28, 55, 0, 95) * 0.3),
    22,
    100,
  );
  return {
    value: Math.round(holdSec * 10) / 10,
    secondary: Math.round(flexion),
    score,
    detail: `Follow-through is held for ${holdSec.toFixed(1)}s with ${flexion.toFixed(0)}° of wrist snap (target ${idealHold.toFixed(1)}s+).`,
    note: holdSec < idealHold ? 'Hand drops too early to read the result of the shot' : 'Textbook hold',
  };
};

/** Wrist angle at the moment of release. */
const wristSnapshot: MeasureFn = (ctx) => {
  const frames = [ctx.timeline.phases.release, ctx.timeline.phases.execution].filter((i) => i >= 0 && i < ctx.frames.length);
  const flexions = frames.map((i) => 180 - angle3(ctx.frames[i], `${ctx.side}Elbow`, `${ctx.side}Wrist`, `${ctx.side}Index`));
  const flexion = mean(flexions);
  const score = rangeScore(flexion, 26, 58, 0, 100);
  return {
    value: Math.round(flexion),
    score,
    detail: `Wrist is ${flexion.toFixed(0)}° into flexion at release — ${flexion < 20 ? 'almost flat, losing backspin' : 'snapping through the ball'}.`,
  };
};

/** Shoulder line level and square to the target. */
const shoulderSquareness: MeasureFn = (ctx, signal) => {
  const tilts: number[] = [];
  const rotations: number[] = [];
  ctx.frames.forEach((frame) => {
    const shoulderAngle = angleFromHorizontal(pick(frame, 'leftShoulder'), pick(frame, 'rightShoulder'));
    const hipAngle = angleFromHorizontal(pick(frame, 'leftHip'), pick(frame, 'rightHip'));
    tilts.push(Math.abs(shoulderAngle));
    rotations.push(Math.abs(shoulderAngle - hipAngle));
  });
  const tilt = avgRange(ctx.timeline, 'release', 0, 0.5, smooth(tilts, 3));
  const rotation = avgRange(ctx.timeline, 'release', 0, 0.5, smooth(rotations, 3));
  const score = clamp(
    Math.round(deviationScore(tilt, 2, 5, p(signal, 'hardTilt', 22)) * 0.65 + deviationScore(rotation, 3, 8, p(signal, 'hardRot', 28)) * 0.35),
    22,
    100,
  );
  return {
    value: Math.round(tilt * 10) / 10,
    secondary: Math.round(rotation),
    score,
    detail: `Shoulders tilt ${tilt.toFixed(1)}° at release with ${rotation.toFixed(0)}° of rotation off the hip line.`,
  };
};

/** How far the hips travel sideways compared to the base of support. */
const comSway: MeasureFn = (ctx, signal) => {
  const positions = ctx.frames.map((frame) => centerOfMass(frame).x);
  const widths = ctx.frames.map((frame) => {
    const base = Math.abs(pick(frame, 'leftFoot').x - pick(frame, 'rightFoot').x);
    return Math.max(base, bodyWidth(frame) * 0.5);
  });
  const [a, b] = phaseRange(ctx.timeline, 'whole-movement');
  const slice = positions.slice(a, b + 1);
  const width = mean(widths) || 0.15;
  const sway = ((Math.max(...slice) - Math.min(...slice)) / width) * 100;
  const score = clamp(deviationScore(sway, 12, 14, p(signal, 'hardSway', 95)), 22, 100);
  return {
    value: Math.round(sway),
    score,
    detail: `Centre of mass travels ${sway.toFixed(0)}% of the stance width — ${sway > 45 ? 'the body is drifting sideways' : 'well balanced over the base'}.`,
  };
};

/** Feet staying anchored through the movement. */
const footWorkStability: MeasureFn = (ctx, signal) => {
  const drift: number[] = [];
  const leftStart = pick(ctx.frames[ctx.timeline.phases.load], 'leftFoot');
  const rightStart = pick(ctx.frames[ctx.timeline.phases.load], 'rightFoot');
  const height = bodyHeight(ctx.frames[0]);
  ctx.frames.forEach((frame, i) => {
    if (i < ctx.timeline.phases.load) return;
    drift.push(Math.max(dist(pick(frame, 'leftFoot'), leftStart), dist(pick(frame, 'rightFoot'), rightStart)) / height);
  });
  const shift = mean(drift) * 100;
  const score = clamp(deviationScore(shift, 3, 8, p(signal, 'hardShift', 40)), 22, 100);
  return {
    value: Math.round(shift * 10) / 10,
    score,
    detail: `Feet travel ${shift.toFixed(1)}% of body height after loading — ${shift > 15 ? 'the stance is sliding' : 'anchored and stable'}.`,
  };
};

/** Left/right symmetry of the legs. */
const jumpSymmetry: MeasureFn = (ctx, signal) => {
  const load = ctx.timeline.phases.load;
  const release = ctx.timeline.phases.release;
  const frame = ctx.frames[load] ?? ctx.frames[0];
  const l = angleAt(pick(frame, 'leftHip'), pick(frame, 'leftKnee'), pick(frame, 'leftAnkle'));
  const r = angleAt(pick(frame, 'rightHip'), pick(frame, 'rightKnee'), pick(frame, 'rightAnkle'));
  const angleDiff = Math.abs(l - r);
  const landFrame = ctx.frames[Math.min(release + 2, ctx.frames.length - 1)];
  const height = bodyHeight(frame);
  const footDiff = (Math.abs(pick(landFrame, 'leftAnkle').y - pick(landFrame, 'rightAnkle').y) / height) * 100;
  const asymmetry = angleDiff + footDiff;
  const score = clamp(deviationScore(asymmetry, 4, 9, p(signal, 'hardAsymmetry', 38)), 22, 100);
  return {
    value: Math.round(asymmetry * 10) / 10,
    score,
    detail: `Left/right leg difference is ${angleDiff.toFixed(0)}° at the knee and ${footDiff.toFixed(1)}% of body height at the feet.`,
    note: angleDiff > 14 ? 'One leg is doing most of the work' : 'Balanced leg contribution',
  };
};

/** Rep-to-rep repetition quality. */
const repConsistency: MeasureFn = (ctx, signal) => {
  const reps = ctx.timeline.reps;
  if (reps.length < 2) return { value: 0, score: 62, detail: 'Only one repetition detected — repeat the movement 3–5 times for a consistency readout.', note: 'Low sample size' };
  const travels = reps.map((rep) => {
    const slice = ctx.timeline.hipTrace.slice(rep.start, rep.end + 1);
    return Math.max(...slice) - Math.min(...slice);
  });
  const variation = cv(travels) * 100;
  const score = clamp(deviationScore(variation, p(signal, 'ideal', 4), p(signal, 'soft', 7), p(signal, 'hard', 30)), 22, 100);
  return {
    value: Math.round(variation * 10) / 10,
    score,
    detail: `Repetition size varies by ${variation.toFixed(1)}% across ${reps.length} repetitions.`,
  };
};

/** Rhythm between repetitions. */
const tempoRegularity: MeasureFn = (ctx) => {
  const reps = ctx.timeline.reps;
  if (reps.length < 2) return { value: 0, score: 60, detail: 'Not enough repetitions detected to measure rhythm — repeat the skill 3–5 times.', note: 'Low sample size' };
  const raw = reps.slice(1).map((rep, i) => (rep.peak - reps[i].peak) / ctx.timeline.fps);
  // The movement cycle is what the athlete repeats; a stray half-cycle (an
  // extra detection inside one rep) should not read as erratic rhythm, so the
  // cycle length comes from the median and short intervals are discounted.
  const cycle = median(raw);
  const intervals = raw.filter((interval) => interval >= cycle * 0.6);
  const variation = medianAbsDeviation(intervals, cycle) / cycle;
  const score = clamp(Math.round(100 - variation * 165), 22, 100);
  return {
    value: Math.round(cycle * 10) / 10,
    score,
    detail: `Repetitions come every ${cycle.toFixed(1)}s with ${(variation * 100).toFixed(0)}% timing drift.`,
  };
};

/** Trunk angle through the movement. */
const torsoLean: MeasureFn = (ctx, signal) => {
  const leans = ctx.frames.map((frame) => {
    const hip = mid(pick(frame, 'leftHip'), pick(frame, 'rightHip'));
    const shoulder = mid(pick(frame, 'leftShoulder'), pick(frame, 'rightShoulder'));
    return angleFromVertical(hip, shoulder);
  });
  const lean = avgRange(ctx.timeline, 'whole-movement', 0.15, 0.85, smooth(leans, 4));
  const low = p(signal, 'idealLow', 4);
  const high = p(signal, 'idealHigh', 16);
  const score = rangeScore(lean, low, high, p(signal, 'hardLow', -14), p(signal, 'hardHigh', 48));
  return {
    value: Math.round(lean * 10) / 10,
    score,
    detail: `Torso sits ${Math.abs(lean).toFixed(1)}° ${lean >= 0 ? 'forward' : 'backward'} of vertical (target ${low}–${high}°).`,
    note: lean > high ? 'Leaning too far forward, hips can\'t drive' : lean < low ? 'Too upright, no athletic tilt' : 'Athletic posture',
  };
};

/** Squat/load depth — where the hips sit relative to the knees. */
const hipDepth: MeasureFn = (ctx, signal) => {
  const legLength = dist(pick(ctx.frames[0], 'leftHip'), pick(ctx.frames[0], 'leftAnkle')) || 0.5;
  const depths = ctx.frames.map((frame) => {
    const hip = mid(pick(frame, 'leftHip'), pick(frame, 'rightHip'));
    const knee = mid(pick(frame, 'leftKnee'), pick(frame, 'rightKnee'));
    return ((knee.y - hip.y) / legLength) * 100;
  });
  const depth = depths[ctx.timeline.phases.load];
  const low = p(signal, 'idealLow', 28);
  const high = p(signal, 'idealHigh', 62);
  const score = rangeScore(depth, low, high, p(signal, 'hardLow', 5), p(signal, 'hardHigh', 95));
  return {
    value: Math.round(depth),
    score,
    detail: `Hips travel to ${depth.toFixed(0)}% of leg length below the knee line (target ${low}–${high}%).`,
    note: depth < low ? 'Not reaching depth' : 'Hitting depth with control',
  };
};

/** Explosive extension from load to release. */
const legDrive: MeasureFn = (ctx, signal) => {
  const angles = ctx.frames.map((frame) => {
    const l = angleAt(pick(frame, 'leftHip'), pick(frame, 'leftKnee'), pick(frame, 'leftAnkle'));
    const r = angleAt(pick(frame, 'rightHip'), pick(frame, 'rightKnee'), pick(frame, 'rightAnkle'));
    return (l + r) / 2;
  });
  const loadAngle = angles[ctx.timeline.phases.load];
  const releaseAngle = angles[ctx.timeline.phases.release];
  const seconds = Math.max((ctx.timeline.phases.release - ctx.timeline.phases.load) / ctx.timeline.fps, 0.08);
  const rate = (releaseAngle - loadAngle) / seconds;
  const ideal = p(signal, 'idealRate', 300);
  const score = scoreAscending(rate, ideal * 0.55, ideal * 1.35, 40, ideal * 2.2);
  return {
    value: Math.round(rate),
    score,
    detail: `Legs extend at ${Math.abs(rate).toFixed(0)}°/s out of the load (target ${ideal}°/s).`,
    note: rate < ideal * 0.55 ? 'Extension is slow and passive' : 'Explosive extension',
  };
};

function scoreAscending(value: number, low: number, high: number, hardLow: number, hardHigh: number): number {
  if (value >= low && value <= high) return 96;
  if (value < low) return Math.round(clamp(96 - ((low - value) / Math.max(low - hardLow, 1e-6)) * 74, 22, 96));
  return Math.round(clamp(96 - ((value - high) / Math.max(hardHigh - high, 1e-6)) * 74, 22, 96));
}

/** Toe / foot orientation. */
const footOrientation: MeasureFn = (ctx, signal) => {
  const angles = ctx.frames.map((frame) => Math.abs(angleFromHorizontal(pick(frame, 'leftAnkle'), pick(frame, 'leftFoot'))));
  const angle = avgRange(ctx.timeline, 'whole-movement', 0.2, 0.8, smooth(angles, 3));
  const ideal = p(signal, 'idealAngle', 8);
  const score = deviationScore(angle, ideal, 8, p(signal, 'hardAngle', 48));
  return {
    value: Math.round(angle * 10) / 10,
    score,
    detail: `Feet sit ${angle.toFixed(0)}° off the target line (${angle > 22 ? 'toes are splayed, killing rotation' : 'consistently pointed'}).`,
  };
};

/** Upper body quietness while the legs work. */
const upperBodyControl: MeasureFn = (ctx, signal) => {
  const shoulderX = ctx.frames.map((frame) => mid(pick(frame, 'leftShoulder'), pick(frame, 'rightShoulder')).x);
  const hipX = ctx.frames.map((frame) => centerOfMass(frame).x);
  const relative = shoulderX.map((v, i) => v - hipX[i]);
  const [a, b] = phaseRange(ctx.timeline, 'whole-movement');
  const slice = relative.slice(a, b + 1);
  const width = bodyWidth(ctx.frames[0]);
  const sway = ((Math.max(...slice) - Math.min(...slice)) / width) * 100;
  const score = clamp(deviationScore(sway, 14, 16, p(signal, 'hardSway', 90)), 22, 100);
  return {
    value: Math.round(sway),
    score,
    detail: `Shoulders sway ${sway.toFixed(0)}% of shoulder width relative to the hips (${sway > 50 ? 'upper body is chasing the ball' : 'quiet, controlled upper body'}).`,
  };
};

/** Step / touch cadence regularity — dribbling control. */
const cadenceControl: MeasureFn = (ctx) => {
  const trace2 = smooth(
    ctx.frames.map((frame) => (1 - Math.min(pick(frame, 'leftAnkle').y, pick(frame, 'rightAnkle').y))),
    3,
  );
  const contacts: number[] = [];
  for (let i = 1; i < trace2.length - 1; i += 1) {
    if (trace2[i] <= trace2[i - 1] && trace2[i] <= trace2[i + 1]) {
      if (!contacts.length || i - contacts[contacts.length - 1] > 2) contacts.push(i);
    }
  }
  if (contacts.length < 3) return { value: 0, score: 58, detail: 'Not enough foot contacts detected to measure your touch rhythm — keep the ball moving for the full 30 seconds.' };
  const intervals = contacts.slice(1).map((c, i) => (c - contacts[i]) / ctx.timeline.fps);
  const variation = cv(intervals) * 100;
  const score = clamp(Math.round(100 - variation * 1.6), 22, 100);
  return {
    value: Math.round(variation),
    score,
    detail: `${contacts.length} touches at ${mean(intervals).toFixed(2)}s intervals with ${variation.toFixed(0)}% rhythm variation.`,
  };
};

/** Stance width relative to the shoulders. */
const baseWidth: MeasureFn = (ctx, signal) => {
  const ratios = ctx.frames.map((frame) => {
    const feet = Math.abs(pick(frame, 'leftFoot').x - pick(frame, 'rightFoot').x);
    const shoulders = bodyWidth(frame);
    return feet / shoulders;
  });
  const ratio = avgRange(ctx.timeline, 'whole-movement', 0.1, 0.6, smooth(ratios, 3));
  const low = p(signal, 'idealLow', 0.95);
  const high = p(signal, 'idealHigh', 1.55);
  const score = rangeScore(ratio, low, high, p(signal, 'hardLow', 0.35), p(signal, 'hardHigh', 2.6));
  return {
    value: Math.round(ratio * 100) / 100,
    score,
    detail: `Stance is ${ratio.toFixed(2)}× shoulder width (target ${low}–${high}×).`,
    note: ratio < low ? 'Base is too narrow for stability' : ratio > high ? 'Stance is too wide to move quickly' : 'Athletic base',
  };
};

/** Spine / chain alignment. */
const bodyLine: MeasureFn = (ctx, signal) => {
  const deviations = ctx.frames.map((frame) => {
    const shoulder = mid(pick(frame, 'leftShoulder'), pick(frame, 'rightShoulder'));
    const hip = mid(pick(frame, 'leftHip'), pick(frame, 'rightHip'));
    const knee = mid(pick(frame, 'leftKnee'), pick(frame, 'rightKnee'));
    const ankle = mid(pick(frame, 'leftAnkle'), pick(frame, 'rightAnkle'));
    const trunk = angleFromVertical(hip, shoulder);
    const shank = deviationFromVertical(knee, ankle);
    const bend = 180 - angleAt(shoulder, hip, knee);
    return Math.abs(trunk - shank) + bend;
  });
  const deviation = avgRange(ctx.timeline, 'whole-movement', 0.1, 0.9, smooth(deviations, 4));
  const score = clamp(deviationScore(deviation, 8, 12, p(signal, 'hardDeviation', 55)), 22, 100);
  return {
    value: Math.round(deviation * 10) / 10,
    score,
    detail: `Spine-to-shin alignment deviates ${deviation.toFixed(0)}° from a stacked line.`,
    note: deviation > 34 ? 'Hips are shooting back and the chest is collapsing' : 'Strong stacked position',
  };
};

/** Head stability — a quiet head keeps the shot / strike repeatable. */
export const MEASURES: Record<MeasureKey, MeasureFn> = {
  elbowAlignment,
  elbowTuck,
  kneeFlexion,
  kneeValgus,
  followThroughHold,
  wristSnapshot,
  shoulderSquareness,
  comSway,
  footWorkStability,
  jumpSymmetry,
  repConsistency,
  tempoRegularity,
  torsoLean,
  hipDepth,
  legDrive,
  footOrientation,
  upperBodyControl,
  cadenceControl,
  baseWidth,
  bodyLine,
};

/** Small helper used by the engine to scale scores by recording quality. */
export function qualityConfidence(quality: RecordingQuality): number {
  if (!quality.bodyDetected) return 0;
  return clamp(0.72 + quality.score / 360, 0.72, 1);
}

/** Utility exposed for the overlay: measured angle between three joints. */
export function measureAngle(frames: PoseFrames, index: number, a: number, b: number, c: number): number {
  const frame = frames[clamp(index, 0, frames.length - 1)];
  if (!frame) return 0;
  return angleAt(lm(frame, a), lm(frame, b), lm(frame, c));
}

export { stdDev, LM };
