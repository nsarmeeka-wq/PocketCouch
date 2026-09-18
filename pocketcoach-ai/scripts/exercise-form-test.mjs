/**
 * Headless checks for `exerciseForm.ts` — the push-up / pull-up form engine.
 *
 *  A. angle math: synthetic landmark frames in known poses
 *  B. thresholds: replayed joint angles sampled from data/exercise_angles.csv
 *     (MediaPipe-extracted push-up / pull-up frames) to confirm the engine
 *     scores real good reps high and flags real faults
 *
 * Run from pocketcoach-ai/:  node scripts/exercise-form-test.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const scratch = mkdtempSync(path.join(tmpdir(), 'pc-exform-'));

const entry = path.join(scratch, 'entry.ts');
writeFileSync(
  entry,
  `export * from '@/lib/analysis/exerciseForm';\nexport { LM } from '@/lib/pose/landmarks';\n`,
);

const outfile = path.join(scratch, 'bundle.mjs');
execFileSync(
  process.execPath,
  [path.join(projectRoot, 'node_modules', 'esbuild', 'bin', 'esbuild'), entry, '--bundle', '--format=esm', '--platform=node', '--alias:@=./src', `--outfile=${outfile}`],
  { cwd: projectRoot, stdio: 'pipe' },
);

const { assessExerciseForm, scoreExerciseForm, formScoreFeedback, LM } = await import(pathToFileURL(outfile).href);
rmSync(scratch, { recursive: true, force: true });

let failures = 0;
function check(label, cond, detail = '') {
  if (cond) console.log(`  [PASS] ${label}`);
  else { failures += 1; console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`); }
}

/* --- synthetic landmark frame builder ------------------------------------- */
// MediaPipe-ish frame; y grows DOWN in this builder (like raw MediaPipe),
// visibility 1 everywhere. The engine only uses interior angles, which are
// rotation/axis invariant, so screen space works fine here.
function frameFrom(points) {
  const frame = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 }));
  for (const [idx, [x, y]] of Object.entries(points)) frame[idx] = { x, y, z: 0, visibility: 1 };
  return frame;
}

// Top of push-up, side view: body horizontal (head left, feet right), arms
// straight down under the shoulders. Hip angle 180, elbow 180 (locked),
// shoulder fold 90 (arm ⟂ torso) — all in-window, score must be high.
const PLANK = {
  [LM.LEFT_SHOULDER]: [0.30, 0.50], [LM.RIGHT_SHOULDER]: [0.30, 0.50],
  [LM.LEFT_ELBOW]: [0.30, 0.62], [LM.RIGHT_ELBOW]: [0.30, 0.62],
  [LM.LEFT_WRIST]: [0.30, 0.74], [LM.RIGHT_WRIST]: [0.30, 0.74],
  [LM.LEFT_HIP]: [0.55, 0.50], [LM.RIGHT_HIP]: [0.55, 0.50],
  [LM.LEFT_KNEE]: [0.72, 0.50], [LM.RIGHT_KNEE]: [0.72, 0.50],
  [LM.LEFT_ANKLE]: [0.88, 0.50], [LM.RIGHT_ANKLE]: [0.88, 0.50],
};

const mk = (key, value, range) => ({ key, label: key, value, range, tone: 'good' });

console.log('\n== A. angle math (synthetic poses) ==');
{
  const plank = frameFrom(PLANK);
  const r = assessExerciseForm('pushup', plank);
  check('plank body line measured ~180', Math.abs(r.metrics.find((m) => m.key === 'hip')?.value - 180) < 2, JSON.stringify(r.metrics));
  check('plank (arms straight under shoulders) scores >= 90', r.score >= 90, `score=${r.score}`);

  // sagging hips: hip dropped BELOW the shoulder–ankle line (perpendicular to
  // the body, like a real side-view sag) → hip angle well under 160
  const sag = frameFrom({ ...PLANK, [LM.LEFT_HIP]: [0.55, 0.58], [LM.RIGHT_HIP]: [0.55, 0.58] });
  const sr = assessExerciseForm('pushup', sag);
  const hipErr = sr.errors.find((e) => e.id === 'pushup:hip');
  check('sagging hips flagged', !!hipErr, JSON.stringify(sr.errors));
  check('sag message mentions core/glutes', !!hipErr && (hipErr.message.includes('core') || hipErr.message.includes('glutes')), hipErr?.message);
  check('sagging hips score drops below 85', sr.score < 85, `score=${sr.score}`);

  // hidden limbs produce no errors and score 0-visibility handling
  const hidden = frameFrom(PLANK);
  for (let i = 25; i <= 32; i += 1) hidden[i].visibility = 0.1;
  const hr = assessExerciseForm('pushup', hidden);
  check('legs hidden → no knee metric invented', !hr.metrics.some((m) => m.key === 'knee'), JSON.stringify(hr.metrics.map((m) => m.key)));
}

console.log('\n== B. scoring curve (scoreExerciseForm) ==');
{
  // metrics shape: [{key,label,value,range,tone}]
  const perfect = [mk('elbow', 90, [75, 178]), mk('hip', 172, [160, 180]), mk('knee', 172, [150, 180]), mk('shoulder', 50, [20, 90])];
  check('all-in-window scores 100', scoreExerciseForm('pushup', perfect) === 100, String(scoreExerciseForm('pushup', perfect)));

  const slight = [...perfect.slice(1), mk('elbow', 70, [75, 178])]; // 5° below min, tol 15
  const slightScore = scoreExerciseForm('pushup', slight);
  check('5° outside window decays (70–99, not <55)', slightScore > 70 && slightScore < 99, String(slightScore));

  const gross = [...perfect.slice(1), mk('elbow', 20, [75, 178])]; // 55° below, 40 past tolerance
  const grossScore = scoreExerciseForm('pushup', gross);
  // elbow carries weight 3 of 8.5; perfect other joints hold the mean up —
  // one catastrophic joint must still cost ~30 points
  check('one gross joint costs ~30 points', grossScore <= 75 && grossScore >= 55, String(grossScore));

  const allGross = [mk('elbow', 20, [75, 178]), mk('hip', 120, [160, 180]), mk('knee', 100, [150, 180]), mk('shoulder', 150, [20, 90])];
  const allGrossScore = scoreExerciseForm('pushup', allGross);
  check('all joints gross floors near 15–35', allGrossScore <= 40, String(allGrossScore));

  check('monotonic: perfect > slight > gross', 100 > slightScore && slightScore > grossScore, `${slightScore} vs ${grossScore}`);
  check('feedback bands cover 0–100', [95, 85, 70, 50, 10].every((s) => typeof formScoreFeedback(s) === 'string'));
}

console.log('\n== C. dataset replay (data/exercise_angles.csv) ==');
{
  // CSV columns: Side, Shoulder_Angle, Elbow_Angle, Hip_Angle, Knee_Angle, ..., Label
  const csv = readFileSync(path.join(projectRoot, '..', 'data', 'exercise_angles.csv'), 'utf8');
  const rows = csv.trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  // NOTE: dataset elbow angle convention is the same interior angle (180 = straight)
  const pushRows = rows.filter((r) => r[11] === 'Push Ups').map((r) => ({ elbow: +r[2], hip: +r[3], knee: +r[4], shoulder: +r[1] }));
  const pullRows = rows.filter((r) => r[11] === 'Pull ups').map((r) => ({ elbow: +r[2], hip: +r[3], knee: +r[4], shoulder: +r[1] }));

  // good-rep windows (aligned with the engine's spec): elbow/hip/knee within window
  const inWin = (v, [lo, hi]) => v >= lo && v <= hi;
  const pushGood = pushRows.filter((r) => inWin(r.hip, [160, 180]) && inWin(r.knee, [150, 180]));
  const pushGoodScores = pushGood.slice(0, 2000).map((r) => scoreExerciseForm('pushup', [mk('elbow', r.elbow, [75, 178]), mk('hip', r.hip, [160, 180]), mk('knee', r.knee, [150, 180]), mk('shoulder', r.shoulder, [20, 90])]));
  const mean = (a) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
  check('real good push-up frames score >= 85 on average', mean(pushGoodScores) >= 85, `mean=${mean(pushGoodScores).toFixed(1)} n=${pushGoodScores.length}`);

  const sagging = pushRows.filter((r) => r.hip < 150);
  const sagScores = sagging.slice(0, 1500).map((r) => scoreExerciseForm('pushup', [mk('elbow', r.elbow, [75, 178]), mk('hip', r.hip, [160, 180]), mk('knee', r.knee, [150, 180]), mk('shoulder', r.shoulder, [20, 90])]));
  check('real sagging-hip frames score much lower', mean(sagScores) < 70, `mean=${mean(sagScores).toFixed(1)} n=${sagScores.length}`);

  const pullGood = pullRows.filter((r) => inWin(r.hip, [155, 180]));
  const pullGoodScores = pullGood.slice(0, 2000).map((r) => scoreExerciseForm('pullup', [mk('elbow', r.elbow, [30, 178]), mk('hip', r.hip, [155, 180]), mk('knee', r.knee, [140, 180]), mk('shoulder', r.shoulder, [40, 175])]));
  check('real good pull-up frames score >= 85 on average', mean(pullGoodScores) >= 85, `mean=${mean(pullGoodScores).toFixed(1)} n=${pullGoodScores.length}`);

  // kipping pull-ups: hip < 150
  const kipping = pullRows.filter((r) => r.hip < 150);
  const kipScores = kipping.slice(0, 1500).map((r) => scoreExerciseForm('pullup', [mk('elbow', r.elbow, [30, 178]), mk('hip', r.hip, [155, 180]), mk('knee', r.knee, [140, 180]), mk('shoulder', r.shoulder, [40, 175])]));
  check('real kipping frames score lower than strict', mean(kipScores) < mean(pullGoodScores) - 15, `kip=${mean(kipScores).toFixed(1)} vs strict=${mean(pullGoodScores).toFixed(1)}`);
}

console.log(failures === 0 ? '\nall exercise-form checks passed ✓' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
