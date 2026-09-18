/**
 * Dev tool: print what the analysis engine measures for the demo movement
 * profiles. The demo mode drives the synthetic athlete with these profiles, so
 * the numbers printed here are exactly what a judge sees in the walkthrough —
 * use them to keep `src/data/sampleData.ts` in sync.
 *
 *   npx esbuild scripts/calibrate.ts --bundle --format=esm --platform=node \
 *     --alias:@=./src --outfile=.tmp/calibrate.mjs && node .tmp/calibrate.mjs
 */
import { compareAnalyses, runAnalysis } from '@/lib/analysis/engine';
import { getSkill } from '@/data/sports';
import { DEMO_BASELINE_PROFILE, DEMO_IMPROVED_PROFILE } from '@/data/sampleData';
import type { VideoAnalysis } from '@/lib/types';

const skill = getSkill('basketball-jump-shot')!;

async function report(label: string, profile: Record<string, number>, seed: string): Promise<VideoAnalysis> {
  const analysis = await runAnalysis({
    sport: 'basketball',
    skill,
    videoName: `${label}.mp4`,
    durationSec: 30,
    signalProfile: profile,
    seed,
  });
  console.log(`\n=== ${label} ===`);
  console.log(`overall ${analysis.overall} | ${analysis.headline} | pose ${analysis.poseSource}`);
  console.log('metrics ', analysis.metrics.map((m) => `${m.label}=${m.score}`).join('  '));
  console.log('signals ', analysis.signals.map((s) => `${s.key}=${s.score}`).join('  '));
  console.log(
    'seedSignals',
    `{ ${analysis.signals.map((s) => `${s.key}: ${s.score}`).join(', ')} }`,
  );
  console.log(
    'seedMetrics',
    `{ ${analysis.metrics.map((m) => `${m.key}: ${m.score}`).join(', ')} }`,
  );
  console.log('weaknesses', analysis.weaknesses.map((w) => `${w.title}=${w.score} (${w.severity})`).join('  '));
  console.log('narrative', analysis.narrative);
  return analysis;
}

const baseline = await report('demo-baseline', DEMO_BASELINE_PROFILE, 'demo-baseline');
const improved = await report('demo-improved', DEMO_IMPROVED_PROFILE, 'demo-improved');
const comparison = compareAnalyses(baseline, improved);
console.log(`\nBEFORE/AFTER ${comparison.overallBefore} -> ${comparison.overallAfter} (${comparison.delta >= 0 ? '+' : ''}${comparison.delta})`);
console.log(comparison.rows.map((r) => `${r.label}: ${r.before}->${r.after}`).join('  |  '));
