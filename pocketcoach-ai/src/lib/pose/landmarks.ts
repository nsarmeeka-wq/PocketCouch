import type { Landmark, PoseFrames } from '@/lib/types';

/**
 * MediaPipe Pose landmark indices (33 points). Kept numeric so the MediaPipe
 * backend and the built-in motion simulator speak exactly the same language.
 */
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/** Joint names used by signal definitions to highlight problem areas. */
export const JOINT_INDEX: Record<string, number> = {
  nose: LM.NOSE,
  leftShoulder: LM.LEFT_SHOULDER,
  rightShoulder: LM.RIGHT_SHOULDER,
  leftElbow: LM.LEFT_ELBOW,
  rightElbow: LM.RIGHT_ELBOW,
  leftWrist: LM.LEFT_WRIST,
  rightWrist: LM.RIGHT_WRIST,
  leftIndex: LM.LEFT_INDEX,
  rightIndex: LM.RIGHT_INDEX,
  leftHip: LM.LEFT_HIP,
  rightHip: LM.RIGHT_HIP,
  leftKnee: LM.LEFT_KNEE,
  rightKnee: LM.RIGHT_KNEE,
  leftAnkle: LM.LEFT_ANKLE,
  rightAnkle: LM.RIGHT_ANKLE,
  leftFoot: LM.LEFT_FOOT_INDEX,
  rightFoot: LM.RIGHT_FOOT_INDEX,
};

export const JOINT_LABEL: Record<string, string> = {
  nose: 'Head',
  leftShoulder: 'L shoulder',
  rightShoulder: 'R shoulder',
  leftElbow: 'L elbow',
  rightElbow: 'R elbow',
  leftWrist: 'L wrist',
  rightWrist: 'R wrist',
  leftIndex: 'L hand',
  rightIndex: 'R hand',
  leftHip: 'L hip',
  rightHip: 'R hip',
  leftKnee: 'L knee',
  rightKnee: 'R knee',
  leftAnkle: 'L ankle',
  rightAnkle: 'R ankle',
  leftFoot: 'L foot',
  rightFoot: 'R foot',
};

/** Skeleton edges drawn on the analyse overlay. */
export const SKELETON: [number, number][] = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
  [LM.LEFT_ELBOW, LM.LEFT_WRIST],
  [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  [LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  [LM.LEFT_SHOULDER, LM.LEFT_HIP],
  [LM.RIGHT_SHOULDER, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_HIP, LM.LEFT_KNEE],
  [LM.LEFT_KNEE, LM.LEFT_ANKLE],
  [LM.LEFT_ANKLE, LM.LEFT_HEEL],
  [LM.LEFT_HEEL, LM.LEFT_FOOT_INDEX],
  [LM.RIGHT_HIP, LM.RIGHT_KNEE],
  [LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  [LM.RIGHT_ANKLE, LM.RIGHT_HEEL],
  [LM.RIGHT_HEEL, LM.RIGHT_FOOT_INDEX],
  [LM.NOSE, LM.LEFT_SHOULDER],
  [LM.NOSE, LM.RIGHT_SHOULDER],
];

export interface Vec {
  x: number;
  y: number;
}

/* ------------------------------------------------------------------ *
 * geometry helpers — all angles in degrees, measured in "math" space
 * (y grows upward) so the numbers read like a coach would expect.
 * ------------------------------------------------------------------ */

export function toVec(lm: Landmark): Vec {
  return { x: lm.x, y: 1 - lm.y };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(a: Vec, k: number): Vec {
  return { x: a.x * k, y: a.y * k };
}

export function len(a: Vec): number {
  return Math.hypot(a.x, a.y);
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function mid(a: Vec, b: Vec): Vec {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalize(a: Vec): Vec {
  const l = len(a) || 1e-6;
  return { x: a.x / l, y: a.y / l };
}

export function rotate(a: Vec, deg: number): Vec {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

/** Interior angle at vertex b for the chain a-b-c, in degrees (0..180). */
export function angleAt(a: Vec, b: Vec, c: Vec): number {
  const v1 = sub(a, b);
  const v2 = sub(c, b);
  const d = (len(v1) * len(v2)) || 1e-6;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / d));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Angle of vector a→b relative to vertical (0 = straight up), in degrees. */
export function angleFromVertical(a: Vec, b: Vec): number {
  const v = sub(b, a);
  return (Math.atan2(v.x, v.y) * 180) / Math.PI;
}

/**
 * Size- and direction-agnostic deviation from the vertical axis in degrees:
 * 0 means the segment is perfectly vertical (pointing up or down),
 * 90 means it is horizontal. This is what coaches call "alignment".
 */
export function deviationFromVertical(a: Vec, b: Vec): number {
  const v = sub(b, a);
  return (Math.atan2(Math.abs(v.x), Math.abs(v.y)) * 180) / Math.PI;
}

/** Signed angle of a segment from horizontal in degrees (0 = level). */
export function deviationFromHorizontal(a: Vec, b: Vec): number {
  const v = sub(b, a);
  return (Math.atan2(v.y, v.x) * 180) / Math.PI;
}

/** Angle of vector a→b relative to horizontal, in degrees (-180..180). */
export function angleFromHorizontal(a: Vec, b: Vec): number {
  const v = sub(b, a);
  return (Math.atan2(v.y, v.x) * 180) / Math.PI;
}

/** Perpendicular signed distance from point p to the infinite line a→b. */
export function pointLineDistance(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const l = len(ab) || 1e-6;
  const ap = sub(p, a);
  return (ab.x * ap.y - ab.y * ap.x) / l;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Coefficient of variation, capped so a single outlier cannot explode it. */
export function cv(values: number[]): number {
  const m = mean(values);
  if (!m) return 0;
  return clamp(stdDev(values) / Math.abs(m), 0, 1);
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Median absolute deviation — the outlier-resistant cousin of stdDev. */
export function medianAbsDeviation(values: number[], centre = median(values)): number {
  if (!values.length) return 0;
  return median(values.map((v) => Math.abs(v - centre)));
}

/** Moving average smoothing that keeps the array length. */
export function smooth(values: number[], window = 3): number[] {
  if (values.length <= 2) return values.slice();
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length - 1, i + half);
    let sum = 0;
    for (let j = from; j <= to; j += 1) sum += values[j];
    return sum / (to - from + 1);
  });
}

/* ------------------------------------------------------------------ *
 * frame accessors
 * ------------------------------------------------------------------ */

export function frameAt(frames: PoseFrames, i: number): Landmark[] | undefined {
  return frames[clamp(Math.round(i), 0, frames.length - 1)];
}

export function lm(frame: Landmark[] | undefined, index: number): Vec {
  if (!frame || !frame[index]) return { x: 0.5, y: 0.5 };
  return toVec(frame[index]);
}

export function side(frame: Landmark[] | undefined, joint: string): Vec {
  return lm(frame, JOINT_INDEX[joint] ?? LM.NOSE);
}

export function visibility(frame: Landmark[] | undefined): number {
  if (!frame) return 0;
  const ids = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE];
  const values = ids.map((i) => frame[i]?.visibility ?? 0.8);
  return mean(values);
}

/** Body height in normalised units — used to make measurements size-invariant. */
export function bodyHeight(frame: Landmark[] | undefined): number {
  if (!frame) return 0.7;
  const head = lm(frame, LM.NOSE);
  const feet = mid(lm(frame, LM.LEFT_FOOT_INDEX), lm(frame, LM.RIGHT_FOOT_INDEX));
  return Math.abs(head.y - feet.y) || 0.7;
}

export function bodyWidth(frame: Landmark[] | undefined): number {
  if (!frame) return 0.2;
  return dist(lm(frame, LM.LEFT_SHOULDER), lm(frame, LM.RIGHT_SHOULDER)) || 0.2;
}

export function centerOfMass(frame: Landmark[] | undefined): Vec {
  if (!frame) return { x: 0.5, y: 0.5 };
  return mid(lm(frame, LM.LEFT_HIP), lm(frame, LM.RIGHT_HIP));
}

export function baseOfSupport(frame: Landmark[] | undefined): Vec {
  if (!frame) return { x: 0.5, y: 0.05 };
  return mid(lm(frame, LM.LEFT_FOOT_INDEX), lm(frame, LM.RIGHT_FOOT_INDEX));
}
