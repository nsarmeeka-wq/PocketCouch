/**
 * Demo calibration tool.
 *
 * The guided demo claims a specific before/after story ("elbow 55 → 76,
 * overall 72 → 82"). Those numbers must come from the real analysis engine —
 * not from hard-coded copies — so this tool fits the *signal profile* the demo
 * replays until the engine measures the story we want to tell.
 *
 * Coordinate descent, one signal at a time, score = measured signals + overall.
 *
 * Run: npx esbuild scripts/tune-demo.ts --bundle --platform=node --format=cjs
 *        --alias:@=./src --outfile=.tmp/tune.cjs && node .tmp/tune.cjs
 */
import { getSkill } from '@/data/sports';
import { runAnalysis } from '@/lib/analysis/engine';
import type { VideoAnalysis } from '@/lib/types';

const skill = getSkill('basketball-jump-shot');
if (!skill) throw new Error('jump-shot skill missing');

const KEYS = skill.signals.map((s) => s.key);

interface Target {
  label: string;
  overall: number;
  signals: Record<string, number>;
}

const TARGETS: Target[] = [
  {
    // Only the signals the demo actually talks about are fitted: elbow flare,
    // follow-through, balance and the landing. The rest are free to move so the
    // headline story lands where the brief says it should.
    label: 'baseline',
    overall: 72,
    signals: {
      elbowAlignment: 55,
      followThrough: 60,
      balance: 69,
      landingSymmetry: 74,
      // kept in range so the re-test story is a clean climb, never a dip
      kneeBend: 92,
      shoulderAlignment: 78,
      jumpConsistency: 65,
      releaseRhythm: 84,
    },
  },
  {
    label: 'improved',
    overall: 84,
    signals: {
      elbowAlignment: 78,
      followThrough: 80,
      balance: 84,
      landingSymmetry: 90,
      kneeBend: 95,
      shoulderAlignment: 85,
      jumpConsistency: 92,
      releaseRhythm: 88,
    },
  },
];

async function measure(profile: Record<string, number>, seed: string): Promise<VideoAnalysis> {
  return runAnalysis({
    sport: 'basketball',
    skill: skill!,
    videoName: `${seed}.mp4`,
    durationSec: 30,
    signalProfile: profile,
    seed,
  });
}

function errorOf(analysis: VideoAnalysis, target: Target, floor?: VideoAnalysis): number {
  let total = (analysis.overall - target.overall) ** 2 * 6;
  for (const [key, want] of Object.entries(target.signals)) {
    const got = analysis.signals.find((s) => s.key === key)?.score ?? 0;
    total += (got - want) ** 2;
  }
  // The re-test must never look worse than the baseline: a signal that goes
  // backwards after training would undermine the whole product story.
  if (floor) {
    for (const signal of analysis.signals) {
      const before = floor.signals.find((s) => s.key === signal.key)?.score ?? 0;
      if (signal.score < before) total += (before - signal.score) ** 2 * 5;
    }
  }
  return total;
}

async function fit(target: Target, floor?: VideoAnalysis) {
  // signals that are not part of this story start from a neutral "no fault"
  // value and are free to move while the fitted signals land on target
  let profile: Record<string, number> = {};
  KEYS.forEach((key) => (profile[key] = target.signals[key] ?? 88));

  let best = await measure(profile, target.label);
  let bestError = errorOf(best, target, floor);
  console.log(`\n== ${target.label} ==  start error ${bestError.toFixed(0)}`);

  for (let pass = 0; pass < 4; pass += 1) {
    let improved = false;
    for (const key of KEYS) {
      for (const delta of [24, 12, 6, 3]) {
        for (const direction of [1, -1]) {
          const candidate = { ...profile };
          candidate[key] = Math.max(15, Math.min(100, candidate[key] + delta * direction));
          if (candidate[key] === profile[key]) continue;
          const analysis = await measure(candidate, target.label);
          const score = errorOf(analysis, target, floor);
          if (score < bestError - 0.01) {
            bestError = score;
            best = analysis;
            profile = candidate;
            improved = true;
          }
        }
      }
    }
    if (!improved) break;
  }

  const measured = Object.fromEntries(best.signals.map((s) => [s.key, s.score]));
  console.log(`   fitted error ${bestError.toFixed(0)} → overall ${best.overall}`);
  console.log(`   profile:  ${JSON.stringify(profile, null, 0)}`);
  console.log(`   measured: ${JSON.stringify(measured, null, 0)}`);
  console.log(`   target:   overall ${target.overall} ${JSON.stringify(target.signals)}`);
  return { profile, analysis: best };
}

async function main() {
  const fitted = [];
  for (const target of TARGETS) {
    fitted.push(await fit(target, fitted[0]?.analysis));
  }

  console.log('\n== before → after monotonicity check ==');
  const [before, after] = fitted;
  const keys = before.analysis.signals.map((s) => s.key);
  keys.forEach((key, index) => {
    const from = before.analysis.signals[index].score;
    const to = after.analysis.signals.find((s) => s.key === key)?.score ?? 0;
    console.log(`   ${to >= from ? '✓' : '✗ REGRESSION'} ${key.padEnd(20)} ${from} → ${to}`);
  });
  console.log(`   overall ${before.analysis.overall} → ${after.analysis.overall}`);
}

void main();
