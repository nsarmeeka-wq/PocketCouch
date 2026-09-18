import type { Landmark, MotionTimeline, PoseFrames, Rep, SkillDefinition } from '@/lib/types';
import { LM, mean, median, mid, smooth } from '@/lib/pose/landmarks';

/** Poses are sampled at a fixed rate so measurements are time-consistent. */
export const SAMPLE_FPS = 12;
/** Landmark frames kept for the overlay after analysis (localStorage friendly). */
export const OVERLAY_FRAMES = 40;

function trace(frames: PoseFrames, mode: SkillDefinition['repIndicator'], side: 'left' | 'right'): number[] {
  return frames.map((frame) => {
    const hip = mid(frame[LM.LEFT_HIP], frame[LM.RIGHT_HIP]);
    if (mode === 'hipVertical') return 1 - hip.y;
    if (mode === 'wristVertical') {
      const wrist = frame[side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST];
      return 1 - (wrist?.y ?? hip.y);
    }
    const l = frame[LM.LEFT_ANKLE];
    const r = frame[LM.RIGHT_ANKLE];
    return 1 - (l.y + r.y) / 2;
  });
}

/**
 * Which arm is the athlete's working arm? For shooting skills it is the arm
 * that spends the most time above the shoulder line.
 */
export function detectWorkingSide(frames: PoseFrames): 'left' | 'right' {
  let leftScore = 0;
  let rightScore = 0;
  for (const frame of frames) {
    const shoulderY = (frame[LM.LEFT_SHOULDER].y + frame[LM.RIGHT_SHOULDER].y) / 2;
    leftScore += shoulderY - frame[LM.LEFT_WRIST].y;
    rightScore += shoulderY - frame[LM.RIGHT_WRIST].y;
  }
  return leftScore >= rightScore ? 'left' : 'right';
}

function findReps(values: number[], fps: number): Rep[] {
  if (values.length < 6) return [{ start: 0, peak: Math.floor(values.length / 2), end: values.length - 1 }];
  const range = Math.max(...values) - Math.min(...values);
  const minProminence = Math.max(0.012, range * 0.28);
  const minSeparation = Math.max(3, Math.round(fps * 0.35));
  const candidates: number[] = [];
  for (let i = 1; i < values.length - 1; i += 1) {
    if (values[i] <= values[i - 1] && values[i] <= values[i + 1]) {
      const last = candidates[candidates.length - 1];
      if (last !== undefined && i - last < minSeparation) {
        if (values[i] < values[last]) candidates[candidates.length - 1] = i;
      } else {
        candidates.push(i);
      }
    }
  }
  let significant = candidates.filter((i) => {
    const from = Math.max(0, i - Math.round(fps * 0.5));
    const to = Math.min(values.length - 1, i + Math.round(fps * 0.5));
    const window = values.slice(from, to + 1);
    return Math.max(...window) - values[i] >= minProminence;
  });

  // A jump shot has two low points per repetition (the load dip and the landing
  // absorb). Keep only the deepest minimum inside a movement-sized window so a
  // "repetition" is one real repetition. This is what makes the consistency and
  // rhythm metrics meaningful.
  const suppression = Math.round(fps * 1.1);
  significant = significant.filter((i) =>
    significant.every((j) => j === i || Math.abs(j - i) > suppression || values[j] > values[i]),
  );

  // A landing absorb or a settle between repetitions shows up as an extra low
  // point. A repetition is one movement cycle, so drop any minimum that lands
  // inside the previous cycle — keeping the deeper of the two, because the
  // load position goes lower than the landing. Reps that are merely shallower
  // than their neighbours are kept: that inconsistency is the measurement.
  if (significant.length > 3) {
    const gaps: number[] = [];
    for (let k = 1; k < significant.length; k += 1) gaps.push(significant[k] - significant[k - 1]);
    const cycle = median(gaps);
    const kept: number[] = [significant[0]];
    for (let k = 1; k < significant.length; k += 1) {
      const current = significant[k];
      const previous = kept[kept.length - 1];
      if (current - previous < cycle * 0.6) {
        if (values[current] < values[previous]) kept[kept.length - 1] = current;
      } else {
        kept.push(current);
      }
    }
    if (kept.length >= 2) significant = kept;
  }

  // Defensive: a trace holding a non-finite sample resolves to index -1, so
  // only real frames ever become repetitions.
  const peaks = (significant.length ? significant : [values.indexOf(Math.min(...values))]).filter(
    (i) => Number.isFinite(i) && i >= 0 && i < values.length,
  );
  if (!peaks.length) peaks.push(Math.max(0, Math.floor(values.length / 2)));
  return peaks.map((peak, idx) => {
    const prev = idx === 0 ? 0 : peaks[idx - 1];
    const next = idx === peaks.length - 1 ? values.length - 1 : peaks[idx + 1];
    // boundaries sit at the highest point between two bottoms
    const startSegment = values.slice(prev, peak + 1);
    const endSegment = values.slice(peak, next + 1);
    const start = prev + startSegment.indexOf(Math.max(...startSegment));
    const end = peak + endSegment.indexOf(Math.max(...endSegment));
    return { start, peak, end };
  });
}

export function buildTimeline(frames: PoseFrames, skill: SkillDefinition, side: 'left' | 'right', fps = SAMPLE_FPS): MotionTimeline {
  const raw = trace(frames, skill.repIndicator, side);
  const hipTrace = smooth(raw, 5);
  const activityTrace = smooth(
    hipTrace.map((v, i) => Math.abs(v - (hipTrace[i - 1] ?? v))),
    3,
  );
  const reps = findReps(hipTrace, fps);

  // representative rep = largest travel, i.e. the cleanest full repetition
  const representative = reps.reduce((best, rep) => {
    const travel = Math.max(...hipTrace.slice(rep.start, rep.end + 1)) - hipTrace[rep.peak];
    const bestTravel = Math.max(...hipTrace.slice(best.start, best.end + 1)) - hipTrace[best.peak];
    return travel > bestTravel ? rep : best;
  }, reps[0]);

  const { start, peak, end } = representative;
  const kneeAngleAt = (i: number) => {
    const frame = frames[i];
    if (!frame) return 175;
    const l = frame[LM.LEFT_HIP];
    const lk = frame[LM.LEFT_KNEE];
    const la = frame[LM.LEFT_ANKLE];
    const r = frame[LM.RIGHT_HIP];
    const rk = frame[LM.RIGHT_KNEE];
    const ra = frame[LM.RIGHT_ANKLE];
    const angle = (a: Landmark, b: Landmark, c: Landmark) => {
      const v1 = { x: a.x - b.x, y: a.y - b.y };
      const v2 = { x: c.x - b.x, y: c.y - b.y };
      const d = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1e-6;
      const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / d));
      return (Math.acos(cos) * 180) / Math.PI;
    };
    return (angle(l, lk, la) + angle(r, rk, ra)) / 2;
  };

  let load = peak;
  let lowestKnee = 999;
  for (let i = start; i <= peak; i += 1) {
    const value = kneeAngleAt(i);
    if (value < lowestKnee) {
      lowestKnee = value;
      load = i;
    }
  }

  let release = end;
  if (skill.repIndicator === 'hipVertical') {
    // release = the frame the working wrist stops rising
    let best = -Infinity;
    for (let i = start; i <= end; i += 1) {
      const wrist = frames[i][side === 'left' ? LM.LEFT_WRIST : LM.RIGHT_WRIST];
      if (1 - wrist.y > best) {
        best = 1 - wrist.y;
        release = i;
      }
    }
    release = Math.max(release, peak);
  }

  const setup = start;
  const execution = Math.min(load + 1, release);
  const recovery = Math.min(Math.max(release + 1, end), frames.length - 1);

  return {
    phases: { setup, load, execution, release, recovery },
    reps,
    fps,
    durationSec: frames.length / fps,
    hipTrace,
    activityTrace,
  };
}

/** Average value of a per-frame series inside a phase range. */
export function phaseAverage(series: number[], from: number, to: number): number {
  const slice = series.slice(Math.max(0, from), Math.max(1, to + 1));
  return mean(slice);
}

/** Range of frames belonging to a movement phase. */
export function phaseRange(timeline: MotionTimeline, phase: string): [number, number] {
  const p = timeline.phases;
  switch (phase) {
    case 'setup':
      return [p.setup, p.load];
    case 'load':
      return [p.load, p.load];
    case 'execution':
      return [p.execution, p.release];
    case 'release':
      return [Math.max(p.release - 1, 0), p.release];
    case 'recovery':
      return [p.release, p.recovery];
    default:
      return [0, Math.max(0, p.recovery)];
  }
}
