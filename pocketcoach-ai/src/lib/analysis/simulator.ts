/**
 * Demo-mode motion engine.
 *
 * PocketCoach AI never depends on an external model being reachable. When the
 * MediaPipe pose backend is unavailable (offline, no WebGL, permission denied,
 * unsupported browser) the analysis pipeline falls back to this deterministic
 * *synthetic athlete*: a forward-kinematic human model that is driven by an
 * explicit movement signature (dip depth, elbow flare, follow-through hold,
 * sway, rhythm...). The same rule modules then measure the generated landmarks
 * exactly as they measure a real video, so every score, angle badge and
 * skeleton overlay stays real math over real landmarks.
 *
 * Swap it out by supplying another `PoseProvider` — see providers/index.ts.
 */
import type { Landmark, MeasureKey, PoseFrames, RecordingQuality, SkillDefinition } from '@/lib/types';
import { LM, clamp, lerp } from '@/lib/pose/landmarks';
import { VIEW_COS, VIEW_SCALE, VIEW_SIN } from '@/lib/pose/view';
import { SAMPLE_FPS } from '@/lib/pose/motion';

/* ------------------------------------------------------------------ *
 * deterministic randomness
 * ------------------------------------------------------------------ */

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * movement signature — what is wrong with this athlete right now
 * ------------------------------------------------------------------ */

export interface FlawSet {
  /** degrees the working elbow drifts off the shooting line */
  elbowFlare: number;
  /** how long the follow-through is held after release, seconds */
  holdSec: number;
  /** 0..1 multiplier on how deeply the athlete loads the hips */
  dipFactor: number;
  /** lateral pelvis travel in metres */
  swayAmp: number;
  /** left/right leg asymmetry in metres */
  asym: number;
  /** 0..1 rep-to-rep randomness */
  repVariance: number;
  /** 0..1 timing jitter */
  tempoJitter: number;
  /** shoulder tilt in degrees at release */
  shoulderTilt: number;
  /** trunk lean offset in degrees vs the ideal */
  leanOffset: number;
  /** 0..1 speed of the movement (1 = explosive) */
  speed: number;
  /** 0..1 how wide the base is */
  baseWidth: number;
  /** degrees the foot is turned off the target line */
  footTurn: number;
  /** 0..1 upper body noise */
  upperBodyNoise: number;
  /** 0..1 knee inward collapse */
  valgus: number;
}

export const CLEAN_FLAWS: FlawSet = {
  elbowFlare: 5,
  holdSec: 1.3,
  dipFactor: 1,
  swayAmp: 0.012,
  asym: 0,
  repVariance: 0.02,
  tempoJitter: 0.02,
  shoulderTilt: 2,
  leanOffset: 0,
  speed: 1,
  baseWidth: 1,
  footTurn: 6,
  upperBodyNoise: 0.02,
  valgus: 0,
};

/** severity 0 (elite) .. 1 (major flaw) for a 0-100 score */
function severity(score: number): number {
  return clamp((100 - score) / 55, 0, 1);
}

/**
 * Turn measured signal scores into a movement signature. Each measurement
 * module drives one physical property of the synthetic athlete, which is why
 * the demo analysis genuinely reflects the athlete's weaknesses instead of
 * printing canned numbers.
 *
 * Scores arrive keyed by *signal* key (e.g. "balance"), while the flaw table is
 * organised by *measurement module* (e.g. "comSway"), so the skill's rulebook is
 * used to translate between the two.
 */
export function deriveFlaws(signals: Record<string, number>, skill?: SkillDefinition): FlawSet {
  const resolve = (key: MeasureKey): number | undefined => {
    const signalKey = skill?.signals.find((s) => s.measure === key)?.key ?? key;
    return signals[signalKey] ?? signals[key];
  };
  const get = (key: MeasureKey, fallback = 88) => resolve(key) ?? fallback;
  const s = (key: MeasureKey, fallback?: number) => severity(get(key, fallback));
  return {
    // A near-perfect elbow still carries a couple of degrees of natural flare,
    // and a badly-flared elbow is visibly off the shooting line.
    elbowFlare: lerp(2, 34, s('elbowAlignment', 82)),
    holdSec: lerp(1.35, 0.12, s('followThroughHold', 84)),
    dipFactor: clamp(1 - s('kneeFlexion', 86) * 0.75, 0.15, 1),
    swayAmp: lerp(0.012, 0.115, s('comSway', 88)),
    asym: lerp(0, 20, s('jumpSymmetry', 90)) * 0.01,
    repVariance: lerp(0.02, 0.32, s('repConsistency', 86)),
    tempoJitter: lerp(0.02, 0.35, s('tempoRegularity', 86)),
    shoulderTilt: lerp(2, 17, s('shoulderSquareness', 88)),
    leanOffset: (0.5 - get('torsoLean', 90) / 100) * 26,
    speed: clamp(1 - s('legDrive', 84) * 0.55, 0.35, 1),
    baseWidth: lerp(1, 0.55, s('baseWidth', 90)),
    footTurn: lerp(6, 34, s('footOrientation', 88)),
    upperBodyNoise: lerp(0.02, 0.6, s('upperBodyControl', 88)),
    valgus: s('kneeValgus', 92),
  };
}

/* ------------------------------------------------------------------ *
 * 3D body model → 3/4 view projection
 * ------------------------------------------------------------------ */

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const SEG = {
  torso: 0.52,
  neck: 0.06,
  headR: 0.11,
  upperArm: 0.3,
  foreArm: 0.27,
  hand: 0.14,
  thigh: 0.45,
  shin: 0.45,
  foot: 0.24,
  shoulder: 0.38,
  hip: 0.22,
};

const GROUND = 0.05;

function project(p: Vec3): Landmark {
  const x = p.x * VIEW_COS + p.z * VIEW_SIN;
  return {
    x: clamp(0.5 + x * VIEW_SCALE, 0.02, 0.98),
    y: clamp(1 - (GROUND + p.y * VIEW_SCALE), 0.02, 0.98),
    // depth stays in the same units as x so measurements can un-project
    z: p.z * VIEW_SCALE,
    visibility: 0.95,
  };
}

function rotZ(v: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  return { x: v.x * Math.cos(r) - v.y * Math.sin(r), y: v.x * Math.sin(r) + v.y * Math.cos(r), z: v.z };
}

function rotX(v: Vec3, deg: number): Vec3 {
  const r = (deg * Math.PI) / 180;
  return { x: v.x, y: v.y * Math.cos(r) - v.z * Math.sin(r), z: v.y * Math.sin(r) + v.z * Math.cos(r) };
}

function addV(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function mulV(a: Vec3, k: number): Vec3 {
  return { x: a.x * k, y: a.y * k, z: a.z * k };
}

/** Two-bone IK in the sagittal (y/z) plane, knee driving forward. */
function kneeIK(hip: Vec3, ankle: Vec3, l1: number, l2: number): Vec3 {
  const dy = ankle.y - hip.y;
  const dz = ankle.z - hip.z;
  const d = clamp(Math.hypot(dy, dz), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const uy = dy / d;
  const uz = dz / d;
  // perpendicular pointing forward (+z)
  let py = -uz;
  let pz = uy;
  if (pz < 0) {
    py = uz;
    pz = -uy;
  }
  return {
    x: lerp(hip.x, ankle.x, a / d),
    y: hip.y + uy * a + py * h,
    z: hip.z + uz * a + pz * h,
  };
}

interface PoseParams {
  /** hip height above the standing reference, metres (+ = jumped) */
  hipHeight: number;
  hipDepth: number;
  lateralShift: number;
  torsoLean: number;
  torsoTwist: number;
  shoulderTilt: number;
  stanceWidth: number;
  leftAnkleZ: number;
  rightAnkleZ: number;
  leftFootLift: number;
  rightFootLift: number;
  leftElbow: number;
  rightElbow: number;
  leftAbduct: number;
  rightAbduct: number;
  leftFlex: number;
  rightFlex: number;
  leftWrist: number;
  rightWrist: number;
  kneeInward: number;
  headTilt: number;
  footTurn: number;
}

const BASE: PoseParams = {
  hipHeight: -0.03,
  hipDepth: 0,
  lateralShift: 0,
  torsoLean: 6,
  torsoTwist: 0,
  shoulderTilt: 0,
  stanceWidth: 0.34,
  leftAnkleZ: 0,
  rightAnkleZ: 0,
  leftFootLift: 0,
  rightFootLift: 0,
  leftElbow: 168,
  rightElbow: 168,
  leftAbduct: 12,
  rightAbduct: 12,
  leftFlex: 5,
  rightFlex: 5,
  leftWrist: 5,
  rightWrist: 5,
  kneeInward: 0,
  headTilt: 0,
  footTurn: 8,
};

/**
 * Forward-kinematic body model. `_side` documents which arm is the working arm
 * — the pose itself is fully mirrored by the caller's parameter vector.
 */
export function buildLandmarks(p: PoseParams, _side: 'left' | 'right' = 'right'): Landmark[] {
  const out: Landmark[] = new Array(33).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.2 }));

  const hipY = 0.92 + p.hipHeight;
  const hipCenter: Vec3 = { x: p.lateralShift, y: hipY, z: p.hipDepth };

  // torso
  const up = rotX({ x: 0, y: 1, z: 0 }, p.torsoLean);
  const shoulderCenter = addV(hipCenter, mulV(up, SEG.torso));
  const neck = addV(hipCenter, mulV(up, SEG.torso + SEG.neck));

  const shoulderLineAxis = rotZ(rotX({ x: 1, y: 0, z: 0 }, p.torsoLean * 0.4), p.shoulderTilt);
  const shoulderAxis = rotZ(shoulderLineAxis, p.torsoTwist);
  const leftShoulder = addV(shoulderCenter, mulV(shoulderAxis, -SEG.shoulder / 2));
  const rightShoulder = addV(shoulderCenter, mulV(shoulderAxis, SEG.shoulder / 2));

  // head
  const headDir = rotZ(up, p.headTilt);
  const headCenter = addV(neck, mulV(headDir, SEG.headR + 0.03));
  const nose = addV(headCenter, mulV(rotZ(headDir, 0), SEG.headR * 0.92));
  const earAxis = rotZ({ x: 1, y: 0, z: 0 }, p.torsoLean * 0.4);

  const place = (index: number, v: Vec3, vis = 0.96) => {
    const lm = project(v);
    out[index] = { ...lm, visibility: vis };
  };

  place(LM.NOSE, nose);
  place(LM.LEFT_EYE_INNER, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.55), mulV(earAxis, -0.035))));
  place(LM.LEFT_EYE, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.6), mulV(earAxis, -0.05))));
  place(LM.LEFT_EYE_OUTER, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.5), mulV(earAxis, -0.07))));
  place(LM.RIGHT_EYE_INNER, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.55), mulV(earAxis, 0.035))));
  place(LM.RIGHT_EYE, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.6), mulV(earAxis, 0.05))));
  place(LM.RIGHT_EYE_OUTER, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.5), mulV(earAxis, 0.07))));
  place(LM.LEFT_EAR, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.2), mulV(earAxis, -SEG.headR * 0.95))));
  place(LM.RIGHT_EAR, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.2), mulV(earAxis, SEG.headR * 0.95))));
  place(LM.MOUTH_LEFT, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.85), mulV(earAxis, -0.03))));
  place(LM.MOUTH_RIGHT, addV(headCenter, addV(mulV(headDir, SEG.headR * 0.85), mulV(earAxis, 0.03))));

  const armFor = (sideName: 'left' | 'right') => {
    const sign = sideName === 'left' ? -1 : 1;
    const shoulder = sideName === 'left' ? leftShoulder : rightShoulder;
    const abduct = sideName === 'left' ? p.leftAbduct : p.rightAbduct;
    const flex = sideName === 'left' ? p.leftFlex : p.rightFlex;
    const elbowAngle = sideName === 'left' ? p.leftElbow : p.rightElbow;
    const wristFlex = sideName === 'left' ? p.leftWrist : p.rightWrist;

    // upper arm swings from the shoulder (abduction = lateral, flex = forward)
    const upperDir = rotX(rotZ({ x: 0, y: -1, z: 0 }, sign * abduct), -flex);
    const elbow = addV(shoulder, mulV(upperDir, SEG.upperArm));
    // the forearm folds *from the upper arm*, so a straight elbow keeps the arm
    // extended and a bent elbow lifts the hand up in front of the body
    const foreDir = rotX(upperDir, -(180 - elbowAngle));
    const wrist = addV(elbow, mulV(foreDir, SEG.foreArm));
    const handDir = rotX(foreDir, wristFlex);
    const index = addV(wrist, mulV(handDir, SEG.hand));
    return { shoulder, elbow, wrist, index, sign };
  };

  const left = armFor('left');
  const right = armFor('right');
  place(LM.LEFT_SHOULDER, left.shoulder);
  place(LM.RIGHT_SHOULDER, right.shoulder);
  place(LM.LEFT_ELBOW, left.elbow, 0.94);
  place(LM.RIGHT_ELBOW, right.elbow, 0.94);
  place(LM.LEFT_WRIST, left.wrist, 0.93);
  place(LM.RIGHT_WRIST, right.wrist, 0.93);

  const handDetails = (pinky: number, index: number, thumb: number, hand: typeof left) => {
    place(index, hand.index, 0.9);
    place(pinky, addV(hand.wrist, mulV(rotZ(hand.index, hand.sign * 12), SEG.hand * 0.82)), 0.85);
    place(thumb, addV(hand.wrist, mulV(rotZ(hand.index, hand.sign * -26), SEG.hand * 0.55)), 0.85);
  };
  handDetails(LM.LEFT_PINKY, LM.LEFT_INDEX, LM.LEFT_THUMB, left);
  handDetails(LM.RIGHT_PINKY, LM.RIGHT_INDEX, LM.RIGHT_THUMB, right);

  // legs
  const legFor = (sideName: 'left' | 'right') => {
    const sign = sideName === 'left' ? -1 : 1;
    const ankleZ = sideName === 'left' ? p.leftAnkleZ : p.rightAnkleZ;
    const lift = sideName === 'left' ? p.leftFootLift : p.rightFootLift;
    const hip = addV(hipCenter, mulV(earAxis, (sign * SEG.hip) / 2));
    const ankle: Vec3 = { x: hipCenter.x * 0.6 + (sign * p.stanceWidth) / 2, y: lift, z: ankleZ };
    const knee = kneeIK(hip, ankle, SEG.thigh, SEG.shin);
    return { hip, knee, ankle, sign };
  };

  const legL = legFor('left');
  const legR = legFor('right');
  place(LM.LEFT_HIP, legL.hip);
  place(LM.RIGHT_HIP, legR.hip);

  const kneeShift = p.kneeInward;
  place(LM.LEFT_KNEE, { ...legL.knee, x: legL.knee.x - kneeShift }, 0.95);
  place(LM.RIGHT_KNEE, { ...legR.knee, x: legR.knee.x + kneeShift }, 0.95);
  place(LM.LEFT_ANKLE, legL.ankle, 0.92);
  place(LM.RIGHT_ANKLE, legR.ankle, 0.92);

  const footFor = (leg: typeof legL, kneeIndex: number) => {
    const turn = (p.footTurn * Math.PI) / 180;
    const dir: Vec3 = { x: leg.sign * Math.sin(turn) * 0.4, y: 0, z: Math.cos(turn) };
    const toe = addV(leg.ankle, mulV(dir, SEG.foot));
    const heel = addV(leg.ankle, mulV(dir, -SEG.foot * 0.35));
    place(kneeIndex === LM.LEFT_KNEE ? LM.LEFT_FOOT_INDEX : LM.RIGHT_FOOT_INDEX, toe, 0.9);
    place(kneeIndex === LM.LEFT_KNEE ? LM.LEFT_HEEL : LM.RIGHT_HEEL, heel, 0.9);
  };
  footFor(legL, LM.LEFT_KNEE);
  footFor(legR, LM.RIGHT_KNEE);

  return out;
}

/* ------------------------------------------------------------------ *
 * per-skill motion archetypes
 * ------------------------------------------------------------------ */

export type Archetype =
  | 'jumpShot'
  | 'freeThrow'
  | 'dribble'
  | 'defense'
  | 'footballDribble'
  | 'ballControl'
  | 'passing'
  | 'strike'
  | 'squat'
  | 'lunge'
  | 'pushup'
  | 'verticalJump';

export const SKILL_ARCHETYPE: Record<string, Archetype> = {
  'basketball-jump-shot': 'jumpShot',
  'basketball-free-throw': 'freeThrow',
  'basketball-dribbling': 'dribble',
  'basketball-defensive-stance': 'defense',
  'football-dribbling': 'footballDribble',
  'football-ball-control': 'ballControl',
  'football-passing': 'passing',
  'football-shooting': 'strike',
  'fitness-squat': 'squat',
  'fitness-lunge': 'lunge',
  'fitness-pushup': 'pushup',
  'fitness-jumping': 'verticalJump',
};

interface Keyframe {
  at: number;
  params: Partial<PoseParams>;
}

interface MotionSpec {
  /** seconds per repetition for an average athlete */
  repSec: number;
  /** number of clean repetitions shown to the athlete in the recording guide */
  expectedReps: number;
  keys: Keyframe[];
}

function keysFor(archetype: Archetype, flaws: FlawSet, side: 'left' | 'right'): MotionSpec {
  const s = side === 'left' ? 'left' : 'right';
  const other = side === 'left' ? 'right' : 'left';
  const flare = flaws.elbowFlare;
  const dip = flaws.dipFactor;
  const stance = BASE.stanceWidth * flaws.baseWidth;
  const hold = flaws.holdSec;
  const tilt = flaws.shoulderTilt;
  const lean = flaws.leanOffset;
  const speed = flaws.speed;

  // helper to set only the working arm
  const arm = (elbow: number, abduct: number, flex: number, wrist: number) =>
    s === 'left'
      ? { leftElbow: elbow, leftAbduct: abduct + flare, leftFlex: flex, leftWrist: wrist }
      : { rightElbow: elbow, rightAbduct: abduct + flare, rightFlex: flex, rightWrist: wrist };
  const offArm = (elbow: number, abduct: number, flex: number, wrist: number) =>
    other === 'left'
      ? { leftElbow: elbow, leftAbduct: abduct, leftFlex: flex, leftWrist: wrist }
      : { rightElbow: elbow, rightAbduct: abduct, rightFlex: flex, rightWrist: wrist };

  const asymLeg = flaws.asym;
  const base: Partial<PoseParams> = { stanceWidth: stance, footTurn: flaws.footTurn, torsoLean: BASE.torsoLean + lean * 0.4 };

  switch (archetype) {
    case 'jumpShot':
    case 'freeThrow': {
      const isJump = archetype === 'jumpShot';
      const apex = isJump ? 0.16 : 0.02;
      const dipDepth = -0.2 * dip;
      const repSec = lerp(4.6, 2.9, speed);
      // the release hold is a *timing* property: how long the hand stays up
      const holdFrac = clamp(hold / repSec, 0.02, 0.3);
      const releaseAt = 0.5;
      const holdEnd = clamp(releaseAt + holdFrac, releaseAt + 0.03, 0.92);
      // a rushed release also loses the wrist snap — the two faults travel together
      const snap = clamp(-8 + hold * 26, -8, 30);
      return {
        repSec,
        expectedReps: 6,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.05, hipDepth: 0.02, torsoLean: 8 + lean * 0.3, stanceWidth: stance, footTurn: flaws.footTurn, leftFootLift: asymLeg * 0.4, rightFootLift: -asymLeg * 0.4, ...arm(148, 16, 12, 4), ...offArm(132, 26, 20, 6) } },
          { at: 0.16, params: { hipHeight: dipDepth, hipDepth: 0.05 * dip + 0.02, torsoLean: 14 + lean, shoulderTilt: tilt * 0.4, leftFootLift: asymLeg, rightFootLift: -asymLeg, ...arm(96, 15, 34, snap * 0.4), ...offArm(104, 32, 36, 10) } },
          { at: 0.32, params: { hipHeight: dipDepth * 0.45, hipDepth: 0.02, torsoLean: 10 + lean, shoulderTilt: tilt * 0.6, leftFootLift: asymLeg * 0.8, rightFootLift: -asymLeg * 0.8, ...arm(78, 17 + flare * 0.5, 74, snap * 0.7), ...offArm(88, 34, 66, 14) } },
          { at: releaseAt, params: { hipHeight: apex, hipDepth: -0.01, torsoLean: 5 + lean * 0.5, shoulderTilt: tilt, leftFootLift: asymLeg * 0.5, rightFootLift: -asymLeg * 0.5, ...arm(150, 13 + flare * 0.7, 118, snap), ...offArm(150, 30, 96, 18) } },
          { at: releaseAt + (holdEnd - releaseAt) * 0.55, params: { hipHeight: apex * 0.8, torsoLean: 4 + lean * 0.3, shoulderTilt: tilt, ...arm(172, 11 + flare, 150, snap * 0.9), ...offArm(160, 24, 88, 16) } },
          { at: holdEnd, params: { hipHeight: apex * 0.5, torsoLean: 5 + lean * 0.4, shoulderTilt: tilt * 0.8, ...arm(168, 13 + flare * 0.8, 140, snap * 0.8), ...offArm(150, 26, 80, 14) } },
          { at: Math.min(holdEnd + 0.06, 0.97), params: { hipHeight: -0.02 * dip, torsoLean: 8 + lean * 0.4, ...arm(118, 16 + flare * 0.6, 26, snap * 0.2), ...offArm(120, 26, 34, 10) } },
          // the landing absorb stays shallow: a repetition is defined by the load dip,
          // and an equally deep absorb makes repetition detection ambiguous
          { at: 0.9, params: { hipHeight: -0.06 * dip, hipDepth: 0.02, torsoLean: 13 + lean, shoulderTilt: tilt * 0.3, ...arm(126, 18 + flare * 0.4, 44, snap * 0.2), ...offArm(112, 30, 34, 8) } },
          { at: 1, params: { ...BASE, hipHeight: -0.05, torsoLean: 8 + lean * 0.3, stanceWidth: stance, footTurn: flaws.footTurn, leftFootLift: asymLeg * 0.4, rightFootLift: -asymLeg * 0.4, ...arm(148, 16, 12, 4), ...offArm(132, 26, 20, 6) } },
        ],
      };
    }
    case 'dribble': {
      return {
        repSec: lerp(0.9, 0.55, speed),
        expectedReps: 26,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.09 * dip, hipDepth: 0.03, torsoLean: 12 + lean, stanceWidth: stance, ...arm(164, 22, 18, 6), ...offArm(150, 34, 26, 6) } },
          { at: 0.5, params: { hipHeight: -0.13 * dip, hipDepth: 0.05, torsoLean: 14 + lean, ...arm(96, 20 + flare * 0.6, 30, 30), ...offArm(146, 32, 24, 6) } },
          { at: 1, params: { ...base, ...BASE, hipHeight: -0.09 * dip, hipDepth: 0.03, torsoLean: 12 + lean, stanceWidth: stance, ...arm(164, 22 + flare * 0.4, 18, 6), ...offArm(150, 34, 26, 6) } },
        ],
      };
    }
    case 'defense': {
      return {
        repSec: lerp(1.5, 0.9, speed),
        expectedReps: 16,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.2 * dip, hipDepth: 0.06, torsoLean: 16 + lean, stanceWidth: stance * 1.5, leftAnkleZ: -0.12, rightAnkleZ: 0.12, ...arm(110, 52 + flare, 24, 6), ...offArm(112, 50, 26, 6) } },
          { at: 0.5, params: { hipHeight: -0.24 * dip, torsoLean: 15 + lean, stanceWidth: stance * 1.5, leftAnkleZ: -0.02, rightAnkleZ: 0.02, ...arm(102, 55 + flare, 30, 8), ...offArm(108, 52, 28, 8) } },
          { at: 1, params: { ...base, ...BASE, hipHeight: -0.2 * dip, hipDepth: 0.06, torsoLean: 16 + lean, stanceWidth: stance * 1.5, leftAnkleZ: -0.12, rightAnkleZ: 0.12, ...arm(110, 52 + flare, 24, 6), ...offArm(112, 50, 26, 6) } },
        ],
      };
    }
    case 'footballDribble':
    case 'ballControl': {
      return {
        repSec: lerp(0.75, 0.45, speed),
        expectedReps: 32,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.07 * dip, torsoLean: 9 + lean, stanceWidth: stance * 0.85, leftFootLift: 0, rightFootLift: 0, ...arm(162, 18, 14, 6), ...offArm(160, 20, 14, 6) } },
          { at: 0.5, params: { hipHeight: -0.1 * dip, torsoLean: 12 + lean, leftAnkleZ: s === 'left' ? 0.22 : -0.05, rightAnkleZ: s === 'left' ? -0.05 : 0.22, leftFootLift: s === 'left' ? 0.11 : asymLeg * 0.3, rightFootLift: s === 'left' ? asymLeg * 0.3 : 0.11, ...arm(150, 24, 20, 8), ...offArm(152, 26, 20, 8) } },
          { at: 1, params: { ...base, ...BASE, hipHeight: -0.07 * dip, torsoLean: 9 + lean, stanceWidth: stance * 0.85, leftFootLift: 0, rightFootLift: 0, ...arm(162, 18, 14, 6), ...offArm(160, 20, 14, 6) } },
        ],
      };
    }
    case 'passing':
    case 'strike': {
      const big = archetype === 'strike' ? 1.25 : 1;
      return {
        repSec: lerp(2.6, 1.7, speed),
        expectedReps: 12,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.06 * dip, torsoLean: 10 + lean, torsoTwist: -6, leftAnkleZ: 0.12, rightAnkleZ: -0.12, ...arm(150, 22, 16, 6), ...offArm(150, 24, 16, 6) } },
          { at: 0.3, params: { hipHeight: -0.11 * dip, torsoLean: 6 + lean, torsoTwist: -14, leftFootLift: 0, rightFootLift: 0, ...arm(140, 26, 20, 8), ...offArm(142, 28, 20, 8) } },
          { at: 0.55, params: { hipHeight: -0.05, torsoLean: 4 + lean, torsoTwist: 16, leftFootLift: 0, rightFootLift: 0.02, leftAnkleZ: 0.1, rightAnkleZ: -0.3 * big, ...arm(158, 30, 26, 10), ...offArm(150, 34, 22, 10) } },
          { at: 1, params: { ...base, ...BASE, hipHeight: -0.06 * dip, torsoLean: 10 + lean, torsoTwist: -6, leftAnkleZ: 0.12, rightAnkleZ: -0.12, ...arm(150, 22, 16, 6), ...offArm(150, 24, 16, 6) } },
        ],
      };
    }
    case 'squat':
    case 'verticalJump': {
      const jump = archetype === 'verticalJump';
      return {
        repSec: lerp(3.4, 2.1, speed),
        expectedReps: 10,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.04, torsoLean: 8 + lean, stanceWidth: stance * 1.05, ...arm(170, 14, 60, 6), ...offArm(170, 14, 60, 6) } },
          { at: 0.3, params: { hipHeight: jump ? -0.34 * dip : -0.4 * dip, hipDepth: 0.09 * dip, torsoLean: 26 + lean, kneeInward: flaws.valgus * 0.05, ...arm(166, 18, 96, 8), ...offArm(166, 18, 96, 8) } },
          { at: 0.45, params: { hipHeight: -(jump ? 0.2 : 0.26) * dip, hipDepth: 0.06 * dip, torsoLean: 20 + lean, kneeInward: flaws.valgus * 0.06, leftFootLift: asymLeg * 0.4, rightFootLift: -asymLeg * 0.4, ...arm(168, 16, 84, 8), ...offArm(168, 16, 84, 8) } },
          { at: 0.62, params: { hipHeight: jump ? 0.2 : -0.05, torsoLean: 8 + lean, ...arm(172, 12, 30, 6), ...offArm(172, 12, 30, 6) } },
          { at: 0.8, params: { hipHeight: jump ? -0.05 : -0.08, torsoLean: 12 + lean, ...arm(170, 16, 66, 8), ...offArm(170, 16, 66, 8) } },
          { at: 1, params: { ...base, ...BASE, hipHeight: -0.04, torsoLean: 8 + lean, stanceWidth: stance * 1.05, ...arm(170, 14, 60, 6), ...offArm(170, 14, 60, 6) } },
        ],
      };
    }
    case 'lunge': {
      return {
        repSec: lerp(3.6, 2.2, speed),
        expectedReps: 8,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.05, torsoLean: 8 + lean, stanceWidth: stance * 0.8, leftAnkleZ: 0.3, rightAnkleZ: -0.3, ...arm(160, 20, 20, 6), ...offArm(160, 20, 20, 6) } },
          { at: 0.4, params: { hipHeight: -0.3 * dip, hipDepth: 0.04, torsoLean: 12 + lean, kneeInward: flaws.valgus * 0.06, leftAnkleZ: 0.3, rightAnkleZ: -0.3, ...arm(150, 24, 30, 8), ...offArm(150, 24, 30, 8) } },
          { at: 0.65, params: { hipHeight: -0.1, torsoLean: 9 + lean, leftAnkleZ: 0.28, rightAnkleZ: -0.28, ...arm(158, 22, 24, 8), ...offArm(158, 22, 24, 8) } },
          { at: 1, params: { ...base, ...BASE, hipHeight: -0.05, torsoLean: 8 + lean, stanceWidth: stance * 0.8, leftAnkleZ: 0.3, rightAnkleZ: -0.3, ...arm(160, 20, 20, 6), ...offArm(160, 20, 20, 6) } },
        ],
      };
    }
    case 'pushup': {
      return {
        repSec: lerp(3.2, 2, speed),
        expectedReps: 10,
        keys: [
          { at: 0, params: { ...base, ...BASE, hipHeight: -0.52, torsoLean: 62 + lean, stanceWidth: stance * 0.9, leftAnkleZ: -0.72, rightAnkleZ: -0.72, ...arm(170, 26, 78, 8), ...offArm(170, 26, 78, 8) } },
          { at: 0.45, params: { hipHeight: -0.62 * (0.6 + dip * 0.4), torsoLean: 60 + lean, leftAnkleZ: -0.72, rightAnkleZ: -0.72, ...arm(96, 30, 70, 30), ...offArm(96, 30, 70, 30) } },
          { at: 1, params: { ...base, ...BASE, hipHeight: -0.52, torsoLean: 62 + lean, stanceWidth: stance * 0.9, leftAnkleZ: -0.72, rightAnkleZ: -0.72, ...arm(170, 26, 78, 8), ...offArm(170, 26, 78, 8) } },
        ],
      };
    }
    default:
      return { repSec: 3, expectedReps: 8, keys: [{ at: 0, params: base }, { at: 1, params: base }] };
  }
}

/* ------------------------------------------------------------------ *
 * pose generation
 * ------------------------------------------------------------------ */

function interp(a: number, b: number, t: number): number {
  const e = t * t * (3 - 2 * t);
  return lerp(a, b, e);
}

function sampleParams(keys: Keyframe[], t: number): PoseParams {
  const sorted = keys;
  let from = sorted[0];
  let to = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    if (t >= sorted[i].at && t <= sorted[i + 1].at) {
      from = sorted[i];
      to = sorted[i + 1];
      break;
    }
  }
  const span = Math.max(to.at - from.at, 1e-6);
  const local = clamp((t - from.at) / span, 0, 1);
  const out: PoseParams = { ...BASE };
  (Object.keys(BASE) as (keyof PoseParams)[]).forEach((key) => {
    const a = from.params[key] ?? to.params[key] ?? BASE[key];
    const b = to.params[key] ?? from.params[key] ?? BASE[key];
    out[key] = interp(a, b, local);
  });
  return out;
}

/**
 * A single clean jump-shot pose at cycle position `t` (0..1). Used by the
 * landing hero animation so the marketing visual is the same body model the
 * analysis pipeline runs on.
 */
export function heroPose(t: number, side: 'left' | 'right' = 'right'): Landmark[] {
  const spec = keysFor('jumpShot', CLEAN_FLAWS, side);
  return buildLandmarks(sampleParams(spec.keys, clamp(t, 0, 1)), side);
}

export interface SimulationInput {
  skill: SkillDefinition;
  flaws: FlawSet;
  side: 'left' | 'right';
  seed: string;
  durationSec: number;
}

export function simulatePoseFrames(input: SimulationInput): { frames: PoseFrames; quality: RecordingQuality } {
  const rand = mulberry32(hashSeed(input.seed));
  const archetype = SKILL_ARCHETYPE[input.skill.id] ?? 'squat';
  const spec = keysFor(archetype, input.flaws, input.side);
  const fps = SAMPLE_FPS;
  const totalFrames = Math.max(Math.round(input.durationSec * fps), 24);
  const frames: PoseFrames = [];

  // per-rep variation so consistency metrics have something real to chew on
  const repCount = Math.max(1, Math.round(input.durationSec / spec.repSec));
  const repJitter = Array.from({ length: repCount + 2 }, () => 1 + (rand() * 2 - 1) * input.flaws.repVariance * 1.4);
  const durationJitter = Array.from({ length: repCount + 2 }, () => 1 + (rand() * 2 - 1) * input.flaws.tempoJitter);

  let frameCursor = 0;
  let rep = 0;
  while (frameCursor < totalFrames && rep < repCount + 2) {
    const framesThisRep = Math.max(4, Math.round(spec.repSec * durationJitter[rep] * fps));
    for (let f = 0; f < framesThisRep && frameCursor < totalFrames; f += 1, frameCursor += 1) {
      const t = f / framesThisRep;
      const params = sampleParams(spec.keys, t);
      const drift = repJitter[rep];
      params.hipHeight *= drift;
      // lateral sway and upper-body noise are driven by real sinusoids, so the
      // balance metrics measure a genuine movement, not random jitter
      const sway = Math.sin(t * Math.PI * 2 + rep) * input.flaws.swayAmp;
      params.lateralShift += sway;
      const headFloor = 0;
      if (params.hipHeight < -0.62) params.hipHeight = headFloor - 0.62;
      params.torsoLean += Math.sin(t * Math.PI * 3) * input.flaws.upperBodyNoise * 6;
      params.shoulderTilt += Math.sin(t * Math.PI * 2.5 + 0.6) * input.flaws.upperBodyNoise * 10;
      params.torsoTwist += Math.sin(t * Math.PI * 2 + 1.2) * input.flaws.upperBodyNoise * 12;
      frames.push(scaleNoise(buildLandmarks(params, input.side), rand).map(sanitize));
    }
    rep += 1;
  }

  return { frames, quality: simulateQuality(input, rand) };
}

/**
 * Guards against a degenerate parameter set (an extreme movement signature can
 * push a joint through a division by zero): a non-finite landmark is clamped to
 * a neutral position instead of poisoning every downstream measure with NaN.
 */
function sanitize(landmark: Landmark): Landmark {
  return {
    x: Number.isFinite(landmark.x) ? clamp(landmark.x, -0.5, 1.5) : 0.5,
    y: Number.isFinite(landmark.y) ? clamp(landmark.y, -0.5, 1.5) : 0.5,
    z: Number.isFinite(landmark.z) ? landmark.z : 0,
    visibility: clamp(Number.isFinite(landmark.visibility) ? (landmark.visibility as number) : 0.9, 0, 1),
  };
}

/** Tiny landmark noise so the overlay + smoothing behave like a real detector. */
function scaleNoise(frame: Landmark[], rand: () => number): Landmark[] {
  return frame.map((lm) => ({
    x: clamp(lm.x + (rand() - 0.5) * 0.004, 0, 1),
    y: clamp(lm.y + (rand() - 0.5) * 0.004, 0, 1),
    z: lm.z,
    visibility: lm.visibility,
  }));
}

function simulateQuality(input: SimulationInput, rand: () => number): RecordingQuality {
  const avgVisibility = 0.88 + rand() * 0.1;
  const stability = 0.82 + rand() * 0.15;
  const score = Math.round(avgVisibility * 55 + stability * 45);
  const warnings: string[] = [];
  if (input.durationSec < 8) warnings.push('The clip was shorter than the recommended 30 seconds.');
  return {
    bodyDetected: true,
    multiplePeople: false,
    avgVisibility,
    framing: 'good',
    lighting: 'good',
    stability,
    durationSec: input.durationSec,
    score,
    warnings,
  };
}

export type { PoseParams };
