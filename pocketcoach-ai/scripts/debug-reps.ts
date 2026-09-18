import { getSkill } from '@/data/sports';
import { CLEAN_FLAWS, simulatePoseFrames } from '@/lib/analysis/simulator';
import { buildTimeline } from '@/lib/pose/motion';

const skill = getSkill('basketball-jump-shot')!;

function stats(flaws: Partial<typeof CLEAN_FLAWS>, label: string) {
  const sim = simulatePoseFrames({
    skill,
    flaws: { ...CLEAN_FLAWS, ...flaws },
    side: 'right',
    seed: 'demo-baseline',
    durationSec: 30,
  });
  const timeline = buildTimeline(sim.frames, skill, 'right');
  const travels = timeline.reps.map((rep) => {
    const slice = timeline.hipTrace.slice(rep.start, rep.end + 1);
    return Math.max(...slice) - Math.min(...slice);
  });
  const spans = timeline.reps.slice(1).map((rep, i) => (rep.peak - timeline.reps[i].peak) / timeline.fps);
  const mean = travels.reduce((a, b) => a + b, 0) / travels.length;
  const sd = Math.sqrt(travels.reduce((a, b) => a + (b - mean) ** 2, 0) / travels.length);
  const spanMean = spans.reduce((a, b) => a + b, 0) / (spans.length || 1);
  const spanSd = Math.sqrt(spans.reduce((a, b) => a + (b - spanMean) ** 2, 0) / (spans.length || 1));
  console.log(
    `${label.padEnd(26)} reps=${String(timeline.reps.length).padStart(2)} ` +
      `travel cv=${((sd / mean) * 100).toFixed(1).padStart(5)}%  cycle cv=${((spanSd / spanMean) * 100).toFixed(1).padStart(5)}%`,
  );
}

console.log('repetition size (consistency) — clean flaws, varying rep variance');
for (const repVariance of [0.02, 0.1, 0.2, 0.32]) stats({ repVariance }, `repVariance=${repVariance}`);

console.log('\ntempo regularity — clean flaws, varying tempo jitter');
for (const tempoJitter of [0.02, 0.1, 0.2, 0.35]) stats({ tempoJitter }, `tempoJitter=${tempoJitter}`);

console.log('\nknee load depth — clean flaws, varying dip factor');
for (const dipFactor of [1, 0.8, 0.6, 0.4]) stats({ dipFactor }, `dipFactor=${dipFactor}`);
