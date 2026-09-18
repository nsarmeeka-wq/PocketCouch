import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleDashed,
  Clock,
  Dumbbell,
  Flame,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Star,
  Timer,
  Trophy,
} from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { completionXp } from '@/lib/recommendation/engine';
import { BAND_CHIP, relativeDay, scoreBand } from '@/lib/format';
import { Card, Chip, EmptyState, InfoNote, Modal, SectionTitle } from '@/components/ui/primitives';
import { AnimatedNumber, ProgressRing } from '@/components/ui/AnimatedNumber';
import { getSkill } from '@/data/sports';
import { cn } from '@/lib/cn';
import type { Workout } from '@/lib/types';

export function Training() {
  const { workoutId } = useParams();
  if (workoutId) return <SessionPlayer workoutId={workoutId} />;
  return <TrainingOverview />;
}

function TrainingOverview() {
  const { state } = useApp();
  const pending = state.workouts.filter((w) => !w.completed).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const done = state.workouts.filter((w) => w.completed).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Adaptive training"
        title="Your training sessions"
        subtitle="Every session is generated from your latest analysis. Nothing here is a generic workout."
        right={
          <Link to="/analyze" className="btn-primary">
            <Sparkles size={16} /> New analysis
          </Link>
        }
      />

      {pending.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Dumbbell size={20} />}
          title="No session waiting"
          body="Analyse a skill and PocketCoach AI will build your next 15-minute session around whatever it finds."
          action={
            <Link to="/analyze" className="btn-primary">
              Analyse a skill
            </Link>
          }
        />
      )}

      <div>
        <h2 className="text-xl font-bold">Completed sessions</h2>
        <div className="mt-4 space-y-3">
          {done.length === 0 && <p className="text-sm text-muted">Your completed sessions will appear here with the XP you earned.</p>}
          {done.map((workout) => (
            <Card key={workout.id} soft className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-lime-400/15 text-lime-300">
                  <Check size={18} />
                </span>
                <div>
                  <p className="font-semibold text-strong">
                    {workout.skillName} · <span className="text-muted">{workout.difficulty}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {relativeDay(workout.completedAt ?? workout.createdAt)} · {workout.totalMinutes} min · {workout.drills.length} drills · +{workout.xpEarned} XP
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Chip className="text-muted">
                  <Flame size={12} /> level {workout.difficultyLevel}
                </Chip>
                <Link to={`/training/${workout.id}`} className="btn-ghost">
                  Review
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Chip className="text-cyan-200">
            <Sparkles size={12} /> AI adaptive session
          </Chip>
          <h3 className="mt-3 text-2xl font-bold">{workout.skillName}</h3>
          <p className="text-sm text-muted">
            {workout.totalMinutes} minutes · {workout.drills.length} drills · adaptive level {workout.difficultyLevel}
          </p>
        </div>
        <Chip className="text-lime-300">{workout.difficulty}</Chip>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{workout.generatedReason}</p>

      <div className="mt-4 space-y-2">
        {workout.drills.map((drill, index) => (
          <div key={drill.drillId} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--line)/0.1)] p-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-cyan-400/[0.12] text-[11px] font-bold text-cyan-300">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-strong">{drill.name}</p>
              <p className="truncate text-[11px] text-muted">{drill.targetLabel}</p>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted">{drill.durationMin}m</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-xs text-muted">
          Focus: {workout.focusSignals.join(', ').replace(/([A-Z])/g, ' $1').toLowerCase()}
        </span>
        <Link to={`/training/${workout.id}`} className="btn-primary">
          Start Training <ArrowRight size={15} />
        </Link>
      </div>
    </Card>
  );
}

function SessionPlayer({ workoutId }: { workoutId: string }) {
  const navigate = useNavigate();
  const { state, dispatch, pushToast } = useApp();
  const workout = state.workouts.find((w) => w.id === workoutId);
  const skill = workout ? getSkill(workout.skill) : undefined;

  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState((workout?.drills[0]?.durationMin ?? 3) * 60);
  const [running, setRunning] = useState(false);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [transition, setTransition] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const drills = workout?.drills ?? [];
  const current = drills[index];
  const completedCount = drills.filter((d) => d.completed).length;
  const completionRatio = drills.length ? completedCount / drills.length : 0;

  useEffect(() => {
    setSecondsLeft((drills[index]?.durationMin ?? 3) * 60);
  }, [index, drills]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
      setElapsedTotal((prev) => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index]);

  // a drill is done when its countdown reaches zero
  useEffect(() => {
    if (running && secondsLeft === 0) void completeCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);

  const completeCurrent = async () => {
    if (!workout || !current) return;
    dispatch({ type: 'complete-drill', workoutId: workout.id, drillId: current.drillId });
    if (index < drills.length - 1) {
      setTransition(true);
      window.setTimeout(() => {
        setIndex((prev) => prev + 1);
        setTransition(false);
      }, 900);
      setRunning(true);
    } else {
      setRunning(false);
      setShowComplete(true);
    }
  };

  const skip = () => {
    if (index < drills.length - 1) {
      setIndex((prev) => prev + 1);
      setRunning(false);
    } else {
      setRunning(false);
      setShowComplete(true);
    }
  };

  const finishSession = () => {
    if (!workout) return;
    const minutes = Math.round(elapsedTotal / 60) || workout.totalMinutes;
    const xp = completionXp(workout, Math.max(completionRatio, 0.6), state.user.streak);
    dispatch({ type: 'complete-workout', workoutId: workout.id, minutes, xp });
    pushToast({ title: `Session complete · +${xp} XP`, body: `🔥 ${state.user.streak + 1} day streak · ${workout.skillName}`, emoji: '🏆' });
    setShowComplete(false);
  };

  if (!workout) {
    return (
      <EmptyState
        icon={<CircleDashed size={20} />}
        title="Session not found"
        body="That session is no longer available. Generate a new one from your latest analysis."
        action={
          <Link to="/training" className="btn-primary">
            Back to training
          </Link>
        }
      />
    );
  }

  const totalSeconds = (current?.durationMin ?? 3) * 60;
  const progressPct = totalSeconds ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const overallProgress = Math.round(((index + (1 - secondsLeft / totalSeconds)) / drills.length) * 100);

  return (
    <div className="space-y-6">
      <Link to="/training" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-strong">
        <ArrowLeft size={15} /> All sessions
      </Link>

      <SectionTitle
        eyebrow={`Adaptive level ${workout.difficultyLevel} · ${workout.difficulty}`}
        title="Your Adaptive Training Plan"
        subtitle={`Duration: ${workout.totalMinutes} minutes · built from your ${workout.skillName} analysis`}
        right={
          <div className="flex items-center gap-2">
            <Chip className={BAND_CHIP[scoreBand(workout.baselineOverall)]}>Baseline {workout.baselineOverall}</Chip>
            <Chip className="text-lime-300">
              <Trophy size={12} /> +{completionXp(workout, 1, state.user.streak)} XP available
            </Chip>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {/* timer card */}
          <Card className={cn('relative overflow-hidden p-6 transition', transition && 'scale-[0.99] opacity-60')}>
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  Drill {index + 1} of {drills.length}
                </p>
                <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">{current?.name}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip className="text-amber-300">Target: {current?.targetLabel}</Chip>
                  <Chip className="text-muted">
                    <Clock size={12} /> {current?.durationMin} min
                  </Chip>
                  <Chip className="text-muted">Intensity {current?.intensity}/3</Chip>
                </div>
              </div>

              <div className="relative">
                <ProgressRing
                  value={Math.round(progressPct)}
                  size={140}
                  stroke={11}
                  showValue={false}
                  animateFrom={0}
                  tone="#22d3ee"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-bold tabular-nums text-strong">
                    {minutes}:{String(seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {running ? 'in progress' : 'paused'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-500/15">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400 transition-[width] duration-500" style={{ width: `${overallProgress}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted">Session progress {overallProgress}% · {completedCount}/{drills.length} drills complete</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {!running ? (
                <button type="button" className="btn-primary !px-5" onClick={() => setRunning(true)}>
                  <Play size={16} /> {secondsLeft === totalSeconds ? 'Start Drill' : 'Resume'}
                </button>
              ) : (
                <button type="button" className="btn-ghost !px-5" onClick={() => setRunning(false)}>
                  <Pause size={16} /> Pause
                </button>
              )}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setRunning(false);
                  setSecondsLeft(totalSeconds);
                }}
              >
                <RotateCcw size={15} /> Restart drill
              </button>
              <button type="button" className="btn-ghost" onClick={skip}>
                <SkipForward size={15} /> {index < drills.length - 1 ? 'Skip to next' : 'Finish session'}
              </button>
              <button type="button" className="btn-soft" onClick={() => void completeCurrent()}>
                <Check size={15} /> Mark complete
              </button>
            </div>
          </Card>

          {/* drill detail */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ListChecks size={17} className="text-cyan-300" />
              <h3 className="text-xl font-bold">{current?.name}</h3>
            </div>
            <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] p-3 text-sm text-amber-100/90">
              <span className="font-semibold">Why this drill: </span>
              {current?.reason}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Setup</p>
                <p className="mt-1 text-sm text-muted">{current?.setup}</p>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-cyan-300">Equipment</p>
                <p className="mt-1 text-sm text-muted">{current?.equipment.join(' · ')}</p>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-cyan-300">Volume</p>
                <p className="mt-1 text-sm text-muted">{current?.volume}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">How to run it</p>
                <ol className="mt-2 space-y-2">
                  {current?.steps.map((step, stepIndex) => (
                    <li key={step} className="flex gap-2.5 text-sm text-muted">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-cyan-400/[0.12] text-[10px] font-bold text-cyan-300">
                        {stepIndex + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-lime-400/25 bg-lime-500/[0.08] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-lime-300">Coaching cue</p>
              <p className="mt-1 text-sm text-lime-50/95">“{current?.coachingCue}”</p>
            </div>
          </Card>
        </div>

        {/* plan sidebar */}
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Timer size={17} className="text-cyan-300" />
            <h3 className="text-lg font-bold">Today's plan</h3>
          </div>
          <div className="space-y-2">
            {drills.map((drill, drillIndex) => {
              const isCurrent = drillIndex === index;
              return (
                <button
                  key={`${drill.drillId}-${drillIndex}`}
                  type="button"
                  onClick={() => {
                    setIndex(drillIndex);
                    setRunning(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                    isCurrent ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-[rgb(var(--line)/0.1)] hover:border-cyan-400/30',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold',
                      drill.completed ? 'bg-lime-400/20 text-lime-300' : isCurrent ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-muted',
                    )}
                  >
                    {drill.completed ? <Check size={13} /> : drillIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-strong">{drill.name}</p>
                    <p className="truncate text-[11px] text-muted">{drill.targetLabel} · {drill.durationMin} min</p>
                  </div>
                  {isCurrent && <ChevronRight size={15} className="shrink-0 text-cyan-300" />}
                </button>
              );
            })}
          </div>

          <InfoNote>
            <span className="font-semibold">Adaptive difficulty: level {workout.difficultyLevel}</span>
            <span className="mt-1 block">{workout.generatedReason}</span>
          </InfoNote>

          <div className="glass-soft p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Root causes being trained</p>
            <ul className="mt-2 space-y-1.5">
              {workout.rootCauses.map((cause) => (
                <li key={cause} className="text-xs text-muted">• {cause}</li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => {
              setRunning(false);
              setShowComplete(true);
            }}
          >
            <BadgeCheck size={16} /> Finish &amp; claim XP
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => navigate('/training')}>
            Save and exit
          </button>
        </Card>
      </div>

      <Modal open={showComplete} onClose={() => setShowComplete(false)} title="Session complete 🏆">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-lime-400/25 bg-lime-500/[0.08] p-4">
            <div>
              <p className="text-sm font-semibold text-lime-200">{workout.skillName} · {workout.difficulty}</p>
              <p className="text-xs text-lime-100/70">
                {drills.length} drills · {Math.max(1, Math.round(elapsedTotal / 60))} minutes trained
              </p>
            </div>
            <span className="font-display text-2xl font-bold text-lime-300">
              +<AnimatedNumber value={completionXp(workout, Math.max(completionRatio, 0.6), state.user.streak)} /> XP
            </span>
          </div>

          <div className="space-y-2 text-sm text-muted">
            <p className="flex items-center gap-2">
              <Star size={14} className="text-cyan-300" /> Every completed drill is logged against its target signal.
            </p>
            <p className="flex items-center gap-2">
              <Flame size={14} className="text-flame-400" /> Streak continues — train tomorrow to keep it alive.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/[0.08] p-4">
            <p className="text-sm font-bold text-cyan-100">Ready to test your improvement?</p>
            <p className="mt-1 text-xs text-cyan-100/80">
              Record another 30-second clip and the AI will compare your technique against the baseline it just measured.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  finishSession();
                  navigate(`/analyze/${workout.sport}/${workout.skill}`);
                }}
              >
                Record New 30-Second Test <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  finishSession();
                  navigate('/progress');
                }}
              >
                See my progress
              </button>
            </div>
          </div>

          {skill && (
            <p className="text-[11px] text-muted">
              Reminder: {skill.cameraTip}. Consistent framing keeps your re-test comparison fair.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
