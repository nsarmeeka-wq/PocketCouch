import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Brain,
  Eye,
  EyeOff,
  Gauge,
  Info,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { getSkill } from '@/data/sports';
import { useApp } from '@/store/AppStore';
import { analysesForSkill, difficultyForSkill } from '@/store/selectors';
import { buildAdaptiveWorkout } from '@/lib/recommendation/engine';
import { BAND_CHIP, BAND_STROKE, BAND_TEXT, SEVERITY_CHIP, relativeDay, scoreBand } from '@/lib/format';
import { Card, Chip, EmptyState, InfoNote, SectionTitle } from '@/components/ui/primitives';
import { AnimatedNumber, MeterBar, ProgressRing } from '@/components/ui/AnimatedNumber';
import { PoseOverlay } from '@/components/visual/PoseOverlay';
import { ParticleField } from '@/components/visual/Background';
import { JOINT_INDEX, JOINT_LABEL, angleAt, lm as jointVec } from '@/lib/pose/landmarks';
import type { DetectedWeakness, PoseFrames } from '@/lib/types';
import { cn } from '@/lib/cn';

function jointAngle(frames: PoseFrames, index: number, a: string, b: string, c: string): number {
  const frame = frames[Math.min(Math.max(index, 0), Math.max(frames.length - 1, 0))];
  if (!frame) return 0;
  const ia = JOINT_INDEX[a] ?? 11;
  const ib = JOINT_INDEX[b] ?? 13;
  const ic = JOINT_INDEX[c] ?? 15;
  return Math.round(angleAt(jointVec(frame, ia), jointVec(frame, ib), jointVec(frame, ic)));
}

const ANGLE_TRIPLETS: Record<string, [string, string, string]> = {
  elbowAlignment: ['rightShoulder', 'rightElbow', 'rightWrist'],
  followThrough: ['rightElbow', 'rightWrist', 'rightIndex'],
  kneeBend: ['rightHip', 'rightKnee', 'rightAnkle'],
  balance: ['leftHip', 'rightHip', 'nose'],
  bodyLine: ['rightShoulder', 'rightHip', 'rightKnee'],
  depth: ['rightHip', 'rightKnee', 'rightAnkle'],
  kneeTracking: ['rightHip', 'rightKnee', 'rightAnkle'],
  posture: ['rightHip', 'rightShoulder', 'nose'],
  handControl: ['rightShoulder', 'rightElbow', 'rightWrist'],
  legDrive: ['rightHip', 'rightKnee', 'rightAnkle'],
  elbowAngle: ['rightShoulder', 'rightElbow', 'rightWrist'],
  frontKnee: ['rightHip', 'rightKnee', 'rightAnkle'],
  kneeLift: ['rightHip', 'rightKnee', 'rightAnkle'],
  footOrientation: ['rightKnee', 'rightAnkle', 'rightFoot'],
};

export function AnalysisReport() {
  const { analysisId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const videoUrlFromState = (location.state as { videoUrl?: string } | null)?.videoUrl;

  const { state, dispatch, pushToast } = useApp();
  const analysis = state.analyses.find((a) => a.id === analysisId);
  const skill = analysis ? getSkill(analysis.skill) : undefined;

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [selectedWeakness, setSelectedWeakness] = useState(0);
  const [generating, setGenerating] = useState(false);

  const history = analysis ? analysesForSkill(state, analysis.skill) : [];
  const previous = history.find((a) => a.id !== analysisId && new Date(a.createdAt) < new Date(analysis?.createdAt ?? Date.now()));

  useEffect(() => {
    if (!playing || !analysis) return;
    const frames = Math.max(analysis.landmarkFrames.length, 1);
    const interval = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames);
    }, 1000 / Math.max(analysis.overlayFps, 8));
    return () => window.clearInterval(interval);
  }, [playing, analysis]);

  const weakness = analysis?.weaknesses[selectedWeakness] as DetectedWeakness | undefined;

  const angles = useMemo(() => {
    if (!analysis || !weakness) return [];
    const triplet = ANGLE_TRIPLETS[weakness.signalKey] ?? ['rightShoulder', 'rightElbow', 'rightWrist'];
    const value = jointAngle(analysis.landmarkFrames, frameIndex, ...triplet);
    const band = scoreBand(weakness.score);
    return [
      {
        joint: triplet[1],
        label: JOINT_LABEL[triplet[1]] ?? 'Joint',
        value: `${value}°`,
        tone: (band === 'critical' || band === 'developing' ? 'bad' : band === 'solid' ? 'warn' : 'good') as 'good' | 'warn' | 'bad',
      },
    ];
  }, [analysis, weakness, frameIndex]);

  if (!analysis) {
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="Report not found"
        body="That analysis is no longer in your history. Record a new clip to generate a fresh report."
        action={
          <Link to="/analyze" className="btn-primary">
            Analyse a skill
          </Link>
        }
      />
    );
  }

  const band = scoreBand(analysis.overall);
  const noFrames = analysis.landmarkFrames.length === 0;

  const generateWorkout = () => {
    if (!skill) return;
    setGenerating(true);
    const plan = buildAdaptiveWorkout({
      analysis,
      skill,
      athleteId: state.user.id,
      athleteLevel: difficultyForSkill(state, skill.id),
      previousWorkouts: state.workouts.filter((w) => w.skill === skill.id),
      sessions: state.sessions,
      previousOverall: previous?.overall,
    });
    dispatch({ type: 'add-workout', workout: plan.workout });
    pushToast({ title: `Session built · ${plan.workout.totalMinutes} min`, body: `Adaptive level ${plan.difficultyLevel} targeting ${plan.focusSignals.map((s) => s.label).join(', ')}`, emoji: '🧠' });
    navigate(`/training/${plan.workout.id}`);
  };

  return (
    <div className="relative space-y-6">
      <ParticleField count={12} className="opacity-60" />

      <Link to="/analyze" className="relative inline-flex items-center gap-2 text-sm text-muted transition hover:text-strong">
        <ArrowLeft size={15} /> Analyse another skill
      </Link>

      {/* headline */}
      <Card className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_-10%,rgba(34,211,238,0.22),transparent_55%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <Chip className="text-cyan-200">
              <Brain size={13} /> {analysis.skillName} · {relativeDay(analysis.createdAt)}
            </Chip>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Your AI Performance Report</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {analysis.narrative}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Chip className={BAND_CHIP[band]}>{analysis.headline}</Chip>
              <Chip className="text-muted">
                {analysis.frameCount} frames · {analysis.poseSource === 'mediapipe' ? 'MediaPipe Pose' : 'demo motion engine'}
              </Chip>
              <Chip className="text-muted">Recording quality {analysis.quality.score}/100</Chip>
              {previous && (
                <Chip className={analysis.overall >= previous.overall ? 'text-lime-300' : 'text-amber-300'}>
                  {analysis.overall >= previous.overall ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {previous.overall} → {analysis.overall}
                </Chip>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6">
            <ProgressRing value={analysis.overall} size={152} stroke={12} label="Overall" sublabel="/ 100" />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* visual feedback */}
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Visual AI Feedback</h2>
              <p className="text-xs text-muted">
                {showSkeleton ? 'Body landmarks, joint connections and highlighted problem areas' : 'Skeleton overlay hidden'}
                {weakness ? ` · tracking ${weakness.title.toLowerCase()}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost !px-2.5 !py-2" onClick={() => setShowSkeleton((v) => !v)}>
                {showSkeleton ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button type="button" className="btn-ghost !px-2.5 !py-2" onClick={() => setPlaying((v) => !v)} disabled={noFrames}>
                {playing ? <Pause size={15} /> : <Play size={15} />}
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-ink-950">
            <div className="relative aspect-video w-full">
              {videoUrlFromState ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={videoUrlFromState} className="h-full w-full object-contain opacity-80" muted playsInline autoPlay loop />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-grid-fade bg-[size:44px_44px]">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/35">skeleton replay</p>
                </div>
              )}
              {showSkeleton && !noFrames && (
                <PoseOverlay frames={analysis.landmarkFrames} frameIndex={frameIndex} highlight={weakness?.joints ?? []} angles={angles} />
              )}
              {noFrames && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-white/60">
                  Landmark replay is unavailable for this seeded assessment — record a new clip to see the full skeleton overlay.
                </div>
              )}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                  {analysis.poseSource === 'mediapipe' ? 'MediaPipe' : 'Demo engine'}
                </span>
                {weakness && (
                  <span className="rounded-lg bg-amber-500/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                    {weakness.title} · {weakness.score}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 bg-black/40 px-4 py-3">
              <input
                type="range"
                min={0}
                max={Math.max(analysis.landmarkFrames.length - 1, 0)}
                value={frameIndex}
                onChange={(event) => setFrameIndex(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-cyan-400"
                aria-label="Scrub frames"
              />
              <span className="w-16 shrink-0 text-right font-mono text-[11px] text-white/70">
                {noFrames ? '–' : `${frameIndex + 1}/${analysis.landmarkFrames.length}`}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {analysis.weaknesses.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedWeakness(index)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                  index === selectedWeakness ? 'border-amber-400/50 bg-amber-400/10' : 'border-[rgb(var(--line)/0.12)] hover:border-cyan-400/40',
                )}
              >
                <span className="font-medium text-strong">{item.title}</span>
                <span className={cn('font-display text-base font-bold tabular-nums', BAND_TEXT[scoreBand(item.score)])}>{item.score}</span>
              </button>
            ))}
          </div>

          {analysis.quality.warnings.length > 0 && (
            <InfoNote tone="amber">
              <span className="font-semibold">Recording notes: </span>
              {analysis.quality.warnings.join(' ')}
            </InfoNote>
          )}
        </Card>

        {/* metrics */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Gauge size={17} className="text-cyan-300" />
              <h2 className="text-xl font-bold">Movement metrics</h2>
            </div>
            <div className="mt-4 space-y-4">
              {analysis.metrics.map((metric, index) => {
                const before = previous?.metrics.find((m) => m.key === metric.key)?.score;
                return (
                  <MeterBar
                    key={metric.key}
                    value={metric.score}
                    from={0}
                    delay={index * 110}
                    label={metric.label}
                    gradient={`linear-gradient(90deg,${BAND_STROKE[scoreBand(metric.score)]},rgba(163,230,53,0.9))`}
                    right={
                      <span className="flex items-center gap-2">
                        {before !== undefined && (
                          <span className={cn('text-[11px] font-semibold', metric.score >= before ? 'text-lime-300' : 'text-amber-300')}>
                            {metric.score >= before ? '+' : ''}
                            {metric.score - before}
                          </span>
                        )}
                        <span className={cn('font-display text-lg font-bold tabular-nums', BAND_TEXT[scoreBand(metric.score)])}>
                          <AnimatedNumber value={metric.score} duration={900 + index * 90} />
                        </span>
                      </span>
                    }
                  />
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-muted">{analysis.metrics[0]?.blurb}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Activity size={17} className="text-cyan-300" />
              <h2 className="text-xl font-bold">Signal readout</h2>
            </div>
            <div className="mt-3 space-y-2">
              {[...analysis.signals].sort((a, b) => a.score - b.score).slice(0, 6).map((signal) => (
                <div key={signal.key} className="flex items-start justify-between gap-3 rounded-xl border border-[rgb(var(--line)/0.1)] p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-strong">{signal.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{signal.detail}</p>
                    <p className="mt-1 font-mono text-[11px] text-cyan-200">target {signal.ideal}</p>
                  </div>
                  <span className={cn('font-display text-lg font-bold tabular-nums', BAND_TEXT[scoreBand(signal.score)])}>{signal.score}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* weaknesses */}
      <div>
        <SectionTitle
          eyebrow="Detected weaknesses"
          title="What the AI wants you to fix"
          subtitle="Ranked by how many points each fault costs you — the training session below follows this order."
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {analysis.weaknesses.map((item, index) => (
            <Card key={item.id} className={cn('p-5', index === 0 && 'ring-1 ring-amber-400/40')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{index === 0 ? '🎯' : '•'}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {index === 0 ? 'Primary weakness' : `Weakness ${index + 1}`}
                    </span>
                  </div>
                  <h3 className="mt-2 text-2xl font-bold">{item.title}</h3>
                </div>
                <div className="text-right">
                  <p className={cn('font-display text-3xl font-bold tabular-nums', BAND_TEXT[scoreBand(item.score)])}>{item.score}</p>
                  <span className={cn('chip mt-1', SEVERITY_CHIP[item.severity])}>{item.severity}</span>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Detected issue</p>
                  <p className="mt-1 text-muted">{item.issue}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Why it matters</p>
                  <p className="mt-1 text-muted">{item.whyItMatters}</p>
                </div>
                <div className="rounded-xl border border-lime-400/25 bg-lime-500/[0.08] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-lime-300">Recommended correction</p>
                  <p className="mt-1 text-lime-50/90">{item.correction}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Card className="flex flex-wrap items-center justify-between gap-5 p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-lime-400/20 text-cyan-200">
            <Wand2 size={20} />
          </span>
          <div>
            <h2 className="text-xl font-bold">Your adaptive 15-minute session is ready to build</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              PocketCoach AI ranks your {analysis.weaknesses.length} detected faults, matches them to drills and allocates
              the minutes where they will earn you the most points.
            </p>
          </div>
        </div>
        <button type="button" className="btn-primary !px-6 !py-3" onClick={generateWorkout} disabled={generating}>
          <Sparkles size={17} /> {generating ? 'Building session…' : 'Generate my training session'}
        </button>
      </Card>

      <Card soft className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs text-muted">
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-lime-300" /> Your clip was processed locally and is never published.
        </span>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-rose-500/10 hover:text-rose-200"
          onClick={() => {
            dispatch({ type: 'delete-analysis', analysisId: analysis.id });
            pushToast({ title: 'Analysis deleted', body: 'The report and its footage reference were removed.', emoji: '🗑️' });
            navigate('/progress');
          }}
        >
          Delete this analysis
        </button>
      </Card>

      <InfoNote>
        <span className="flex items-center gap-2 font-semibold">
          <Target size={14} /> How to read this report
        </span>
        <span className="mt-1 block">
          Scores above 85 mean the movement is holding up under fatigue. Below 60 means the fault is costing you
          repetitions right now, which is why it leads the session. <Info size={12} className="inline" /> Re-test with the
          same camera position to compare fairly.
        </span>
      </InfoNote>
    </div>
  );
}
