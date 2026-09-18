/** Print the engine's actual readings for the synthetic test frames. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = process.cwd();
const scratch = mkdtempSync(path.join(tmpdir(), 'pc-probe-'));
const entry = path.join(scratch, 'entry.ts');
writeFileSync(entry, `export * from '@/lib/analysis/liveFeedback';\nexport * from '@/lib/pose/landmarks';\n`);
const outfile = path.join(scratch, 'bundle.mjs');
execFileSync(process.execPath, [path.join(projectRoot, 'node_modules', 'esbuild', 'bin', 'esbuild'), entry, '--bundle', '--format=esm', '--platform=node', '--alias:@=./src', `--outfile=${outfile}`], { cwd: projectRoot, stdio: 'pipe' });

const { measureLiveFrame, LM } = await import(pathToFileURL(outfile).href);
rmSync(scratch, { recursive: true, force: true });

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
  const put = (i, [x, y]) => { frame[i] = { x, y, z: 0, visibility: 1 }; };
  put(LM.NOSE, pts.nose);
  put(LM.LEFT_SHOULDER, pts.leftShoulder); put(LM.RIGHT_SHOULDER, pts.rightShoulder);
  put(LM.LEFT_ELBOW, pts.leftElbow); put(LM.RIGHT_ELBOW, pts.rightElbow);
  put(LM.LEFT_WRIST, pts.leftWrist); put(LM.RIGHT_WRIST, pts.rightWrist);
  put(LM.LEFT_HIP, pts.leftHip); put(LM.RIGHT_HIP, pts.rightHip);
  put(LM.LEFT_KNEE, pts.leftKnee); put(LM.RIGHT_KNEE, pts.rightKnee);
  put(LM.LEFT_ANKLE, pts.leftAnkle); put(LM.RIGHT_ANKLE, pts.rightAnkle);
  return frame;
}

const show = (label, r) =>
  console.log(label, JSON.stringify({ cue: r.cue?.id ?? null, tone: r.cue?.tone ?? null, score: r.formScore, angles: r.angles.map(a => `${a.label}:${a.value}:${a.tone}`) }));

show('clean   ', measureLiveFrame(standingFrame()));
show('flare   ', measureLiveFrame(standingFrame({ rightWrist: [0.78, 0.52] })));
show('valgus  ', measureLiveFrame(standingFrame({ leftKnee: [0.485, 0.74], rightKnee: [0.515, 0.74] })));
show('lean    ', measureLiveFrame(standingFrame({ leftShoulder: [0.48, 0.22], rightShoulder: [0.64, 0.22], leftElbow: [0.44, 0.38], rightElbow: [0.68, 0.38], leftWrist: [0.46, 0.50], rightWrist: [0.66, 0.50] })));
