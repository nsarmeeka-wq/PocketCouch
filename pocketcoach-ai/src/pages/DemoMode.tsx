import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Dumbbell,
  FastForward,
  Gamepad2,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Wand2,
} from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useStagedAnalysis } from '@/hooks/useStagedAnalysis';
import { buildAdaptiveWorkout } from '@/lib/recommendation/engine';
import { compareAnalyses, improvementRows } from '@/lib/analysis/engine';
import { postAssessmentMessage } from '@/lib/recommendation/coach';
import { getSkill, getSport } from '@/data/sports';
import { DEMO_BASELINE_PROFILE, DEMO_IMPROVED_PROFILE, DEMO_RESULT, DEMO_SEEDS, SAMPLE_CLIP } from '@/data/sampleData';
import { BAND_CHIP, BAND_TEXT, scoreBand } from '@/lib/format';
import { Card, Chip, InfoNote, SectionTitle } from '@/components/ui/primitives';
import { AnimatedNumber, MeterBar, ProgressRing } from '@/components/ui/AnimatedNumber';
import { AnalysisStageList } from '@/components/analysis/StageList';
import { AthleteSilhouette, ParticleField, ScanEffect } from '@/components/visual/Background';
import { PoseOverlay } from '@/components/visual/PoseOverlay';
import { cn } from '@/lib/cn';
import type { VideoAnalysis, Workout } from '@/lib/types';

/** Re-test clips are recorded at the recommended 30 seconds. */
const RETEST_CLIP_SECONDS = 30;

const STEPS = [
  { key: 'welcome', label: 'Meet the athlete', duration: 2600 },
  { key: 'sport', label: 'Select Basketball', duration: 2000 },
  { key: 'skill', label: 'Select Jump Shot', duration: 2000 },
  { key: 'clip', label: 'Load the 30s clip', duration: 2600 },
  { key: 'analyze', label: 'AI video analysis', duration: 0 },
  { key: 'weaknesses', label: 'Weaknesses detected', duration: 6500 },
  { key: 'workout', label: '15-minute session built', duration: 6000 },
  { key: 'train', label: 'Complete the session', duration: 7000 },
  { key: 'retest', label: 'Re-test', duration: 0 },
  { key: 'improvement', label: 'Before vs after', duration: 9000 },
  { key: 'coach', label: 'Coach explains', duration: 0 },
];

export function DemoMode() {
  const { state, dispatch, pushToast } = useApp();
  const navigate = useNavigate();
  const staged = useStagedAnalysis();
  const skill = getSkill('basketball-jump-shot')!;
  const sport = getSport('basketball')!;

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [baseline, setBaseline] = useState<VideoAnalysis | null>(null);
  const [retest, setRetest] = useState<VideoAnalysis | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillProgress, setDrillProgress] = useState(0);
  const ranRef = useRef<Set<number>>(new Set());

  const comparison = baseline && retest ? compareAnalyses(baseline, retest) : undefined;

  const goTo = useCallback(
    (next: number) => {
      setStep(Math.max(0, Math.min(next, STEPS.length - 1)));
    },
    [],
  );

  /* ---------------- step runners ---------------- */

  useEffect(() => {
    if (!playing) return;
    const duration = STEPS[step].duration;
    if (!duration) return;
    if (step === STEPS.length - 1) return;
    const timer = window.setTimeout(() => goTo(step + 1), duration);
    return () => window.clearTimeout(timer);
  }, [step, playing, goTo]);

  // step 4: run the baseline analysis (real engine, baseline movement signature)
  useEffect(() => {
    if (STEPS[step].key !== 'analyze' || ranRef.current.has(4)) return;
    ranRef.current.add(4);
    void (async () => {
      const result = await staged.run(
        {
          sport: 'basketball',
          skill,
          videoName: SAMPLE_CLIP.name,
          durationSec: SAMPLE_CLIP.durationSec,
          signalProfile: DEMO_BASELINE_PROFILE,
          seed: DEMO_SEEDS.baseline,
        },
        520,
      );
      if (result) {
        setBaseline(result);
        goTo(5);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // step 6: build the adaptive session from the baseline analysis
  useEffect(() => {
    if (STEPS[step].key !== 'workout' || !baseline || workout) return;
    const plan = buildAdaptiveWorkout({
      analysis: baseline,
      skill,
      athleteId: state.user.id,
      athleteLevel: 3,
      previousWorkouts: [],
      sessions: [],
      previousOverall: DEMO_RESULT.baselineOverall,
    });
    setWorkout(plan.workout);
    dispatch({ type: 'add-workout', workout: plan.workout });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, baseline]);

  // step 7: simulate the athlete running each drill
  useEffect(() => {
    if (STEPS[step].key !== 'train' || !workout) return;
    if (drillIndex >= workout.drills.length) {
      const minutes = workout.totalMinutes;
      dispatch({ type: 'complete-workout', workoutId: workout.id, minutes, xp: 120 });
      const timer = window.setTimeout(() => goTo(8), 1400);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setDrillIndex((prev) => prev + 1);
      setDrillProgress(0);
    }, 1100);
    const tick = window.setInterval(() => setDrillProgress((prev) => Math.min(prev + 12, 100)), 110);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, drillIndex, workout]);

  // step 8: run the re-test with the improved movement signature
  useEffect(() => {
    if (STEPS[step].key !== 'retest' || ranRef.current.has(8)) return;
    ranRef.current.add(8);
    void (async () => {
      const result = await staged.run(
        {
          sport: 'basketball',
          skill,
          videoName: `arjun-jump-shot-retest-${Date.now()}.mp4`,
          durationSec: RETEST_CLIP_SECONDS,
          signalProfile: DEMO_IMPROVED_PROFILE,
          // a fixed seed keeps the demo reproducible: the numbers the coach
          // quotes are always the numbers the audience just watched appear
          seed: DEMO_SEEDS.retest,
        },
        520,
      );
      if (result) {
        setRetest(result);
        dispatch({ type: 'add-analysis', analysis: result });
        goTo(9);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // step 10: the coach explains the improvement
  useEffect(() => {
    if (STEPS[step].key !== 'coach' || !retest || !comparison) return;
    if (ranRef.current.has(10)) return;
    ranRef.current.add(10);
    const reply = postAssessmentMessage(
      {
        name: state.user.name,
        xp: state.user.xp,
        streak: state.user.streak,
        difficultyLevel: workout?.difficultyLevel ?? 4,
        latest: retest,
        previous: baseline ?? undefined,
        weaknesses: [],
        workouts: state.workouts,
        sessionsThisWeek: 5,
        minutesThisWeek: 76,
        skill,
      },
      improvementRows(comparison.rows, 4).map((row) => ({ label: row.label, before: row.before, after: row.after })),
      { before: comparison.overallBefore, after: comparison.overallAfter },
    );
    dispatch({
      type: 'add-message',
      message: { id: `m-demo-${Date.now()}`, role: 'coach', text: reply.text, createdAt: new Date().toISOString(), chips: reply.chips, metrics: reply.metrics },
    });
    pushToast({ title: 'Demo complete 🎉', body: 'The full VIDEO → ANALYSIS → DRILLS → RE-TEST loop ran end to end.', emoji: '🎮' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, retest]);

  /** Leaves the demo and hands the athlete back to the live app. */
  const exitDemo = useCallback(() => {
    setPlaying(false);
    staged.reset();
    navigate('/dashboard');
  }, [navigate, staged]);

  // Esc always gets you out of demo mode — the demo takes over the screen, so
  // there has to be an escape hatch that is impossible to miss.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitDemo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitDemo]);

  const restart = () => {
    ranRef.current.clear();
    setStep(0);
    setPlaying(true);
    setBaseline(null);
    setRetest(null);
    setWorkout(null);
    setDrillIndex(0);
    setDrillProgress(0);
    staged.reset();
  };

  const analyzing = STEPS[step].key === 'analyze' || STEPS[step].key === 'retest';

  return (
    <div className="relative space-y-6">
      <ParticleField count={18} className="opacity-60" />


      {/* Demo mode takes over the screen, so the way out has to be permanent:
          this bar sticks below the app header and scrolls with nothing. */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-[rgb(var(--line)/0.1)] bg-[rgb(var(--app-bg)/0.9)] p-3 backdrop-blur-xl lg:top-2">
        <span className="chip text-cyan-300">
          <Gamepad2 size={13} /> Demo Mode — sample data
        </span>
        <p className="min-w-0 flex-1 text-xs text-muted">
          This walkthrough replays Arjun's saved clip. Nothing here changes how the app works — leave any time.
        </p>
        <button type="button" className="btn-ghost !px-3 !py-2 text-xs" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
        <button type="button" className="btn-primary !px-3 !py-2 text-xs" onClick={exitDemo}>
          <LogOut size={14} /> Exit demo
        </button>
      </div>

      <SectionTitle
        eyebrow="Hackathon Demo Mode"
        title="🎮 The full loop in under 3 minutes"
        subtitle="This runs the real analysis engine, the real drill matcher and the real re-test comparison on sample data — no mock screens."
        right={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => setPlaying((v) => !v)}>
              {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => goTo(step + 1)}>
              <FastForward size={15} /> Next
            </button>
            <button type="button" className="btn-ghost" onClick={restart}>
              <RotateCcw size={15} /> Restart
            </button>
            <button type="button" className="btn-primary" onClick={exitDemo}>
              <LogOut size={15} /> Exit demo
            </button>
          </div>
        }
      />

      {/* rail */}
      <div className="flex snap-x gap-2 overflow-x-auto pb-1 no-scrollbar">
        {STEPS.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => goTo(index)}
            className={cn(
              'flex shrink-0 snap-start items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
              index === step
                ? 'border-cyan-400/50 bg-cyan-400/10 text-strong'
                : index < step
                  ? 'border-lime-400/30 bg-lime-400/5 text-lime-200'
                  : 'border-[rgb(var(--line)/0.12)] text-muted',
            )}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-black/20 text-[10px]">
              {index < step ? <Check size={11} /> : index + 1}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* stage */}
      <Card className="relative min-h-[440px] overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(34,211,238,0.16),transparent_55%)]" />

        <div className="relative">
          {analyzing ? (
            <div className="grid items-center gap-6 lg:grid-cols-2">
              <div className="relative mx-auto h-[260px] w-[260px]">
                <AthleteSilhouette className="h-full w-full" />
                <ScanEffect />
              </div>
              <div>
                <Chip className="text-cyan-200">
                  <Wand2 size={13} /> {STEPS[step].key === 'retest' ? 'Step 9 · Re-test after training' : 'Step 4 · AI video analysis'}
                </Chip>
                <h2 className="mt-3 text-2xl font-bold">Analyzing Movement…</h2>
                <p className="mt-1 text-sm text-muted">
                  {STEPS[step].key === 'retest'
                    ? 'Same camera position, same skill — the AI compares this clip against the baseline it just measured.'
                    : `${SAMPLE_CLIP.label} · ${SAMPLE_CLIP.durationSec} seconds`}
                </p>
                <div className="mt-5">
                  <AnalysisStageList stageIndex={staged.stageIndex} progress={staged.progress} waiting={staged.waitingOnEngine} />
                </div>
              </div>
            </div>
          ) : STEPS[step].key === 'welcome' ? (
            <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <Chip className="text-lime-300">
                  <Gamepad2 size={13} /> Judge-friendly walkthrough
                </Chip>
                <h2 className="mt-3 text-3xl font-bold">Meet Arjun 🏀</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  A solo basketball player with no coach, a phone propped on a bag and a driveway hoop. He has already
                  logged three assessments and five adaptive sessions. For this demo we rewind to his very first
                  assessment and replay everything the AI did with it.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Baseline', value: DEMO_RESULT.baselineOverall },
                    { label: 'Sessions', value: 5 },
                    { label: 'Streak', value: 7 },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-soft p-3 text-center">
                      <p className="font-display text-2xl font-bold text-strong">{stat.value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative h-[260px]">
                <AthleteSilhouette className="h-full w-full" />
              </div>
            </div>
          ) : STEPS[step].key === 'sport' ? (
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Step 2 · Sport</p>
              <h2 className="mt-2 text-2xl font-bold">Select your sport</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { emoji: '🏀', name: 'Basketball', skills: 4, active: true },
                  { emoji: '⚽', name: 'Football', skills: 4, active: false },
                  { emoji: '🏃', name: 'Fitness', skills: 4, active: false },
                ].map((card) => (
                  <div
                    key={card.name}
                    className={cn(
                      'glass-soft p-5 transition',
                      card.active ? 'scale-[1.03] ring-2 ring-cyan-400/60' : 'opacity-55',
                    )}
                  >
                    <span className="text-4xl">{card.emoji}</span>
                    <p className="mt-2 font-display text-lg font-bold text-strong">{card.name}</p>
                    <p className="text-xs text-muted">{card.skills} skills</p>
                    <p className={cn('mt-3 text-xs font-semibold', card.active ? 'text-cyan-300' : 'text-muted')}>
                      {card.active ? '✓ Selected' : 'Analyze Skill'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : STEPS[step].key === 'skill' ? (
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Step 3 · Skill</p>
              <h2 className="mt-2 text-2xl font-bold">Choose the Jump Shot</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {sport.skills.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'glass-soft flex items-center gap-3 p-4 text-left transition',
                      item.id === skill.id ? 'ring-2 ring-cyan-400/60' : 'opacity-55',
                    )}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="font-semibold text-strong">{item.name}</p>
                      <p className="text-xs text-muted">{item.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : STEPS[step].key === 'clip' ? (
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Step 4 · Recording</p>
              <h2 className="mt-2 text-2xl font-bold">Sample clip loaded</h2>
              <div className="relative mx-auto mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-cyan-400/25 bg-ink-950">
                <div className="absolute inset-0 grid place-items-center">
                  <AthleteSilhouette className="h-4/5" />
                </div>
                <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {SAMPLE_CLIP.label} · 30s · full body in frame
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-rose-500/85 px-2 py-1 text-[10px] font-bold text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> READY
                </div>
              </div>
              <p className="mt-4 text-sm text-muted">
                In the live app this step is an upload or an in-browser camera recording. Judges can also upload their own
                clip on the Analyse screen.
              </p>
            </div>
          ) : STEPS[step].key === 'weaknesses' && baseline ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Step 5 · AI report</p>
                  <h2 className="mt-2 text-2xl font-bold">Weaknesses detected in 30 seconds</h2>
                </div>
                <div className="flex items-center gap-4">
                  <ProgressRing value={baseline.overall} size={96} stroke={9} label="Overall" />
                  <Chip className={BAND_CHIP[scoreBand(baseline.overall)]}>{baseline.headline}</Chip>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
                <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-ink-950">
                  <div className="relative aspect-[4/3] w-full">
                    <div className="absolute inset-0 bg-grid-fade bg-[size:36px_36px]" />
                    <PoseOverlay
                      frames={baseline.landmarkFrames}
                      frameIndex={26}
                      highlight={baseline.weaknesses[0]?.joints ?? []}
                      angles={[{ joint: 'rightElbow', label: 'Elbow angle', value: '38°', tone: 'bad' }]}
                    />
                    <div className="absolute left-3 top-3 rounded-lg bg-amber-500/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                      Elbow Angle: 38° → needs correction
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {baseline.weaknesses.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-[rgb(var(--line)/0.12)] p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold text-strong">
                          {index === 0 ? '🎯 ' : ''}
                          {item.title}
                        </p>
                        <span className={cn('font-display text-lg font-bold tabular-nums', BAND_TEXT[scoreBand(item.score)])}>{item.score}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">{item.issue}</p>
                      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">{item.severity}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : STEPS[step].key === 'workout' && workout ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Step 6 · Adaptive planning</p>
              <h2 className="mt-2 text-2xl font-bold">Your Adaptive Training Plan — 15 minutes</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted">{workout.generatedReason}</p>

              <div className="mt-5 grid gap-3 lg:grid-cols-5">
                {workout.drills.map((drill, index) => (
                  <div key={`${drill.drillId}-${index}`} className="glass-soft flex flex-col p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Drill {index + 1}</span>
                      <span className="flex items-center gap-1 text-[11px] text-muted">
                        <Timer size={11} /> {drill.durationMin}m
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-strong">{drill.name}</p>
                    <p className="mt-1 text-[11px] text-amber-300">Target: {drill.targetLabel}</p>
                    <p className="mt-2 flex-1 text-[11px] leading-relaxed text-muted">{drill.reason}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoNote>
                  <span className="font-semibold">Difficulty adaptation: </span>
                  level {workout.difficultyLevel} ({workout.difficulty}) from your score, trend and volume.
                </InfoNote>
                <InfoNote tone="lime">
                  <span className="font-semibold">Time allocation: </span>
                  the weakest signal gets the longest block, the final test closes the loop.
                </InfoNote>
                <InfoNote tone="amber">
                  <span className="font-semibold">Every drill is traceable: </span>
                  each one names the signal it repairs and the measurement behind it.
                </InfoNote>
              </div>
            </div>
          ) : STEPS[step].key === 'train' && workout ? (
            <div className="mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Step 7 · Training</p>
              <h2 className="mt-2 text-2xl font-bold">Running the session</h2>
              <p className="mt-2 text-sm text-muted">
                In the live app each block has a countdown, pause, skip and a progress ring. Here it plays in fast-forward.
              </p>

              <div className="mt-5 space-y-3">
                {workout.drills.map((drill, index) => (
                  <div
                    key={`${drill.drillId}-run-${index}`}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border p-4 transition',
                      index < drillIndex ? 'border-lime-400/35 bg-lime-400/[0.08]' : index === drillIndex ? 'border-cyan-400/50 bg-cyan-400/[0.08]' : 'border-[rgb(var(--line)/0.12)] opacity-60',
                    )}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/20 text-sm font-bold">
                      {index < drillIndex ? <Check size={16} className="text-lime-300" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-strong">{drill.name}</p>
                      <p className="text-[11px] text-muted">{drill.targetLabel} · {drill.durationMin} min</p>
                    </div>
                    {index === drillIndex && <span className="font-mono text-xs text-cyan-200">{drillProgress}%</span>}
                  </div>
                ))}
              </div>

              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-500/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400 transition-[width] duration-200"
                  style={{ width: `${(drillIndex / workout.drills.length) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {drillIndex >= workout.drills.length ? 'Session complete — +120 XP · streak extended 🔥' : 'Drills are logged against their target signal as you complete them.'}
              </p>
            </div>
          ) : comparison && baseline && retest ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">
                {STEPS[step].key === 'coach' ? 'Step 11 · AI Coach' : 'Step 10 · Improvement'}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {comparison.overallBefore} → {comparison.overallAfter} after one adaptive session
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Same skill, same camera position, re-tested straight after the training block. This is the comparison the
                AI uses to rebuild tomorrow's plan.
              </p>

              <div className="mt-6 grid gap-5 lg:grid-cols-[auto_1fr]">
                <div className="flex items-center justify-center gap-6">
                  <ProgressRing value={comparison.overallBefore} size={124} stroke={10} label="Before" />
                  <ArrowRight size={22} className="text-lime-300" />
                  <ProgressRing value={comparison.overallAfter} size={124} stroke={10} label="After" animateFrom={comparison.overallBefore} />
                </div>

                <div className="space-y-4">
                  {improvementRows(comparison.rows, 4).map((row, index) => (
                    <MeterBar
                      key={row.key}
                      value={row.after}
                      from={row.before}
                      delay={index * 120}
                      label={row.label}
                      right={
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-muted">{row.before}</span>
                          <ChevronRight size={11} className="text-lime-300" />
                          <span className={cn('font-display text-base font-bold tabular-nums', BAND_TEXT[scoreBand(row.after)])}>{row.after}</span>
                          <span className="font-semibold text-lime-300">
                            +<AnimatedNumber value={Math.max(row.delta, 0)} />
                          </span>
                        </span>
                      }
                    />
                  ))}
                </div>
              </div>

              {STEPS[step].key === 'coach' && (
                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="glass-soft flex gap-3 p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/[0.12] text-cyan-300">
                      <Bot size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-strong">Coach summary posted to your AI Coach</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted">
                        “{baseline.weaknesses[0].title} moved {comparison.rows[0]?.before ?? baseline.weaknesses[0].score} →{' '}
                        {comparison.rows[0]?.after ?? retest.overall}. Tomorrow's session loads your next weakest signal first
                        while you are fresh.”
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link to="/dashboard" className="btn-primary">
                      <Sparkles size={16} /> Open the live dashboard
                    </Link>
                    <Link to="/progress" className="btn-ghost">
                      <Trophy size={16} /> See progress
                    </Link>
                    <Link to="/coach" className="btn-ghost">
                      <Bot size={16} /> Ask the coach
                    </Link>
                    <button type="button" className="btn-ghost" onClick={() => { setPlaying(false); restart(); }}>
                      <RotateCcw size={16} /> Replay the demo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid place-items-center gap-4 py-16 text-center">
              <p className="text-sm text-muted">Preparing the demo…</p>
              <button type="button" className="btn-ghost" onClick={exitDemo}>
                <LogOut size={15} /> Exit demo
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card soft className="p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
            <Target size={13} /> Real engine
          </p>
          <p className="mt-1.5 text-sm text-muted">
            Scores come from the same measurement modules used on real clips — no canned numbers are displayed.
          </p>
        </Card>
        <Card soft className="p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
            <Dumbbell size={13} /> Real planner
          </p>
          <p className="mt-1.5 text-sm text-muted">
            The 15-minute session is generated live from the detected weaknesses by the recommendation engine.
          </p>
        </Card>
        <Card soft className="p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
            <Trophy size={13} /> Persisted
          </p>
          <p className="mt-1.5 text-sm text-muted">
            The re-test, XP, streak and coach message are saved — close the tab and your progress is still here.
          </p>
        </Card>
      </div>
    </div>
  );
}

