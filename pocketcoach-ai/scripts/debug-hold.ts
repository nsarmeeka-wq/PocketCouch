/**
 * Focused debug for the follow-through measurement.
 *
 *   npx esbuild scripts/debug-hold.ts --bundle --format=esm --platform=node \
 *     --alias:@=./src --outfile=.tmp/debug-hold.mjs && node .tmp/debug-hold.mjs
 */
import { deriveFlaws, simulatePoseFrames } from '@/lib/analysis/simulator';
import { buildTimeline } from '@/lib/pose/motion';
import { getSkill } from '@/data/sports';
import { LM, angleAt } from '@/lib/pose/landmarks';
import { DEMO_BASELINE_PROFILE, DEMO_IMPROVED_PROFILE } from '@/data/sampleData';

const skill = getSkill('basketball-jump-shot')!;

for (const [label, profile] of [
  ['baseline', DEMO_BASELINE_PROFILE],
  ['improved', DEMO_IMPROVED_PROFILE],
] as [string, Record<string, number>][]) {
  const flaws = deriveFlaws(profile, skill);
  const frames = simulatePoseFrames({ skill, flaws, side: 'right', seed: `demo-${label}`, durationSec: 30 }).frames;
  const timeline = buildTimeline(frames, skill, 'right', 12);
  const clearance = frames.map((f) => {
    const shoulderY = f[LM.RIGHT_SHOULDER].y;
    const wristY = f[LM.RIGHT_WRIST].y;
    const nose = f[LM.NOSE].y;
    const feet = (f[LM.LEFT_FOOT_INDEX].y + f[LM.RIGHT_FOOT_INDEX].y) / 2;
    return (shoulderY - wristY) / Math.abs(nose - feet);
  });
  const above = clearance.filter((c) => c > 0.11).length;
  console.log(`\n${label}: holdSec=${flaws.holdSec.toFixed(2)} reps=${timeline.reps.length} release=${timeline.phases.release} phases=${JSON.stringify(timeline.phases)}`);
  console.log(`  frames above 0.11 clearance: ${above} (${(above / timeline.reps.length / timeline.fps).toFixed(2)}s per rep)`);
  console.log(`  max clearance ${Math.max(...clearance).toFixed(3)}  clearance sample ${clearance.slice(0, 40).map((c) => c.toFixed(2)).join(' ')}`);
  const flex = frames.map((f) => {
    const a = f[LM.RIGHT_ELBOW];
    const b = f[LM.RIGHT_WRIST];
    const c = f[LM.RIGHT_INDEX];
    return 180 - angleAt({ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: c.x, y: c.y });
  });
  console.log(`  wrist flexion sample ${flex.slice(0, 40).map((v) => v.toFixed(0)).join(' ')}`);
}
