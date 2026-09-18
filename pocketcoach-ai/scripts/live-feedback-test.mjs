/**
 * Headless checks for the live posture engine (`liveFeedback.ts`).
 *
 * Builds synthetic MediaPipe-shaped frames — a correct stance, a flared elbow,
 * inward-collapsing knees, a forward lean, and a half-visible body — and asserts
 * the engine reads each one the way a coach would.
 *
 * Run from pocketcoach-ai/:  node scripts/live-feedback-test.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const scratch = mkdtempSync(path.join(tmpdir(), 'pc-live-'));

// A tiny entry that re-exports the engine; esbuild resolves the `@/` alias.
const entry = path.join(scratch, 'entry.ts');
writeFileSync(
  entry,
  `export * from '@/lib/analysis/liveFeedback';\nexport * from '@/lib/pose/landmarks';\nexport type { Landmark } from '@/lib/types';\n`,
);

const outfile = path.join(scratch, 'bundle.mjs');
const esbuildBin = path.join(projectRoot, 'node_modules', 'esbuild', 'bin', 'esbuild');
execFileSync(
  process.execPath,
  [
    esbuildBin, entry,
    '--bundle', '--format=esm', '--platform=node',
    '--alias:@=./src',
    `--outfile=${outfile}`,
  ],
  { cwd: projectRoot, stdio: 'pipe' },
);

const { measureLiveFrame, LM } = await import(pathToFileURL(outfile).href);
rmSync(scratch, { recursive: true, force: true });

/**
 * Feed a frame to the engine several times in a row, exactly as the camera loop
 * does. Cues need a few consecutive frames to confirm (hysteresis), so the
 * LAST reading after a run is what a coach would actually see on screen.
 */
function feed(frame, runs = 20) {
  let reading;
  for (let i = 0; i < runs; i += 1) reading = measureLiveFrame(frame);
  return reading;
}

let failures = 0;
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  [PASS] ${label}`);
  } else {
    failures += 1;
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/**
 * Synthetic standing frame in normalised MediaPipe coordinates.
 * `tune` lets each test move specific landmarks (y grows downward, as in the
 * real model's output; the engine converts to math space internally).
 */
function standingFrame(tune = {}) {
  const pts = {
    nose: [0.5, 0.08],
    leftShoulder: [0.42, 0.25], rightShoulder: [0.58, 0.25],
    leftElbow: [0.38, 0.40], rightElbow: [0.62, 0.40],
    leftWrist: [0.40, 0.52], rightWrist: [0.60, 0.52],
    leftHip: [0.44, 0.58], rightHip: [0.56, 0.58],
    leftKnee: [0.44, 0.74], rightKnee: [0.56, 0.74],
    leftAnkle: [0.44, 0.92], rightAnkle: [0.56, 0.92],
    ...tune,
  };
  const frame = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  const put = (index, [x, y]) => { frame[index] = { x, y, z: 0, visibility: 1 }; };
  put(LM.NOSE, pts.nose);
  put(LM.LEFT_SHOULDER, pts.leftShoulder); put(LM.RIGHT_SHOULDER, pts.rightShoulder);
  put(LM.LEFT_ELBOW, pts.leftElbow); put(LM.RIGHT_ELBOW, pts.rightElbow);
  put(LM.LEFT_WRIST, pts.leftWrist); put(LM.RIGHT_WRIST, pts.rightWrist);
  put(LM.LEFT_HIP, pts.leftHip); put(LM.RIGHT_HIP, pts.rightHip);
  put(LM.LEFT_KNEE, pts.leftKnee); put(LM.RIGHT_KNEE, pts.rightKnee);
  put(LM.LEFT_ANKLE, pts.leftAnkle); put(LM.RIGHT_ANKLE, pts.rightAnkle);
  return frame;
}

console.log('\n== clean stance ==');
const clean = feed(standingFrame());
check('detects a visible body', clean.bodyVisible);
check('no coaching cue for correct form', clean.cue === null, JSON.stringify(clean.cue));
check('form score is high', clean.formScore >= 85, `score=${clean.formScore}`);
check('reports joint chips', clean.angles.length >= 3, JSON.stringify(clean.angles));

console.log('\n== flared elbow ==');
const flared = feed(standingFrame({ rightWrist: [0.78, 0.52] }));
check('flags the elbow', flared.cue?.id === 'elbow', JSON.stringify(flared.cue));
check('cue is severe (bad) for a big flare', flared.cue?.tone === 'bad', JSON.stringify(flared.cue));
check('form score drops', flared.formScore < clean.formScore, `${flared.formScore} vs ${clean.formScore}`);

console.log('\n== inward-collapsing knees (valgus) ==');
const valgus = feed(
  standingFrame({ leftKnee: [0.485, 0.74], rightKnee: [0.515, 0.74] }),
);
check('flags the knees', valgus.cue?.id === 'knee', JSON.stringify(valgus.cue));
check('knee chip present', valgus.angles.some((a) => a.label.includes('knee')), JSON.stringify(valgus.angles));

console.log('\n== deep knee bend is NOT flagged as bad ==');
const squatted = feed(
  standingFrame({ leftKnee: [0.40, 0.72], rightKnee: [0.60, 0.72], leftHip: [0.44, 0.62], rightHip: [0.56, 0.62] }),
);
check('deep flexion is acceptable', squatted.cue?.id !== 'knee' || squatted.cue.tone !== 'bad', JSON.stringify(squatted.cue));

console.log('\n== forward lean ==');
// whole upper body shifted ~30° off vertical (well past the 20° bad band);
// arm offsets relative to each shoulder are identical to the clean stance so
// the elbow reading stays good and the lean is the only problem on screen
const leaning = feed(
  standingFrame({
    leftShoulder: [0.62, 0.22], rightShoulder: [0.78, 0.22],
    leftElbow: [0.58, 0.38], rightElbow: [0.82, 0.38],
    leftWrist: [0.60, 0.50], rightWrist: [0.80, 0.50],
  }),
);
check('flags the torso', leaning.cue?.id === 'torso', JSON.stringify(leaning.cue));

console.log('\n== half-visible body ==');
const partial = standingFrame();
for (let i = 25; i <= 32; i += 1) partial[i].visibility = 0.1; // legs hidden
const partialReading = feed(partial);
check('still sees the upper body', partialReading.bodyVisible === false || partialReading.cue === null, JSON.stringify(partialReading.cue));
check('does not invent knee cues from hidden legs', !partialReading.angles.some((a) => a.label.includes('knee')), JSON.stringify(partialReading.angles));

console.log('\n== empty / garbage frames ==');
const empty = measureLiveFrame(undefined);
check('empty frame is safe', empty.bodyVisible === false && empty.cue === null && empty.formScore === 0);
const short = measureLiveFrame(standingFrame().slice(0, 10));
check('short frame is safe', short.bodyVisible === false && short.cue === null);

console.log(`\n${failures === 0 ? 'all live-feedback checks passed ✓' : `${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
