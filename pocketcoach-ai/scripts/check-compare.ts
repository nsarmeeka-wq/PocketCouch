/**
 * Guard against duplicate comparison rows.
 *
 * A skill can share a name between a metric and one of its signals (basketball's
 * jump shot has a `balance` metric *and* a `balance` signal). Both used to be
 * emitted with the same `key`, which collided as a React list key and let the
 * before/after view print the same label twice with different numbers.
 *
 * Run: npx esbuild scripts/check-compare.ts --bundle --platform=node --format=cjs
 *        --alias:@=./src --outfile=.tmp/check-compare.cjs && node .tmp/check-compare.cjs
 */
import { compareAnalyses, improvementRows, runAnalysis } from '@/lib/analysis/engine';
import { getSkill } from '@/data/sports';
import { DEMO_BASELINE_PROFILE, DEMO_IMPROVED_PROFILE, DEMO_SEEDS } from '@/data/sampleData';

const skill = getSkill('basketball-jump-shot');
if (!skill) throw new Error('jump-shot skill missing');

const shared = { sport: 'basketball' as const, skill, videoName: 'check.mp4', durationSec: 30 };
const before = await runAnalysis({ ...shared, signalProfile: DEMO_BASELINE_PROFILE, seed: DEMO_SEEDS.baseline });
const after = await runAnalysis({ ...shared, signalProfile: DEMO_IMPROVED_PROFILE, seed: DEMO_SEEDS.retest });

const comparison = compareAnalyses(before, after);
const keys = comparison.rows.map((row) => row.key);
const dupes = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
const labels = comparison.rows.map((row) => row.label);
const labelDupes = [...new Set(labels.filter((label, index) => labels.indexOf(label) !== index))];

console.log(`rows           : ${keys.join(', ')}`);
console.log(`dupe row keys  : ${dupes.length ? dupes.join(', ') : 'none ✓'}`);
console.log(
  `shared labels  : ${labelDupes.length ? `${labelDupes.join(', ')} (expected — a metric and its signal may share a name)` : 'none'}`,
);

const shown = improvementRows(comparison.rows, 4);
console.log('improvement view:');
for (const row of shown) console.log(`  ${row.label.padEnd(20)} ${row.before} → ${row.after}  (${row.source})`);

const shownKeys = shown.map((row) => row.key);
const shownDupes = shownKeys.filter((key, index) => shownKeys.indexOf(key) !== index);
const shownLabels = shown.map((row) => row.label);
const shownLabelDupes = shownLabels.filter((label, index) => shownLabels.indexOf(label) !== index);

if (dupes.length || shownDupes.length || shownLabelDupes.length) {
  console.error('\nFAIL — the before/after view still collides: a row would be dropped or printed twice.');
  process.exit(1);
}
console.log('\nOK — rows are uniquely identified and the before/after view never repeats a label.');
