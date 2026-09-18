/**
 * Verifies everything the guided demo depends on and prints the values the
 * seeded history should carry, straight from the analysis engine:
 *
 *  1. the seeded athlete history builds and every workout drill resolves
 *  2. the baseline clip the demo replays
 *  3. the post-training re-test
 *  4. that every signal improves between baseline and re-test
 *
 * Run: npx esbuild scripts/verify-seed.ts --bundle --platform=node --format=cjs
 *        --alias:@=./src --outfile=.tmp/verify.cjs && node .tmp/verify.cjs
 */
import { DEMO_BASELINE_PROFILE, DEMO_IMPROVED_PROFILE, DEMO_SEEDS, seedState } from '@/data/sampleData';
import { DRILLS_BY_ID } from '@/data/drills';
import { getSkill } from '@/data/sports';
import { runAnalysis } from '@/lib/analysis/engine';
import type { VideoAnalysis } from '@/lib/types';

const state = seedState();
console.log(
  `seed: ${state.analyses.length} analyses, ${state.workouts.length} workouts, ` +
    `${state.sessions.length} sessions, ${state.user.xp} XP, streak ${state.user.streak}`,
);
console.log(`      overall history : ${state.analyses.map((a) => a.overall).reverse().join(' → ')}`);

let failed = false;
for (const workout of state.workouts) {
  for (const drill of workout.drills) {
    if (!DRILLS_BY_ID[drill.drillId]) {
      failed = true;
      console.error(`FAIL ${workout.id}: unknown drill "${drill.drillId}"`);
    }
  }
}

const skill = getSkill('basketball-jump-shot');
if (!skill) throw new Error('jump-shot skill missing');

async function measure(label: string, profile: Record<string, number>): Promise<VideoAnalysis> {
  return runAnalysis({
    sport: 'basketball',
    skill: skill!,
    videoName: `${label}.mp4`,
    durationSec: 30,
    signalProfile: profile,
    seed: label,
  });
}

function report(label: string, analysis: VideoAnalysis) {
  const signals = Object.fromEntries(analysis.signals.map((s) => [s.key, s.score]));
  const metrics = Object.fromEntries(analysis.metrics.map((m) => [m.key, m.score]));
  console.log(`\n${label}`);
  console.log(`  overall ${analysis.overall} — ${analysis.headline}`);
  console.log(`  metrics:  ${JSON.stringify(metrics)}`);
  console.log(`  signals:  ${JSON.stringify(signals)}`);
  console.log(
    `  weaknesses: ${analysis.weaknesses.map((w) => `${w.title} ${w.score} (${w.severity})`).join(', ') || 'none'}`,
  );
  return analysis;
}

async function main() {
  const baseline = await measure(DEMO_SEEDS.baseline, DEMO_BASELINE_PROFILE);
  report('== baseline (seeded first assessment) ==', baseline);
  const after = report('== retest (post-training) ==', await measure(DEMO_SEEDS.retest, DEMO_IMPROVED_PROFILE));

  console.log('\n== re-test comparison ==');
  const before = baseline;
  before.signals.forEach((signal, index) => {
    const target = after.signals[index].score;
    console.log(`   ${target >= signal.score ? '✓' : '✗ REGRESSION'} ${signal.key.padEnd(20)} ${signal.score} → ${target}`);
  });
  console.log(`   overall ${before.overall} → ${after.overall}`);

  process.exit(failed ? 1 : 0);
}

void main();
