import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleDot,
  Film,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Video,
  Wand2,
} from 'lucide-react';
import { getSkill, getSport } from '@/data/sports';
import { ANALYSIS_STAGES } from '@/lib/analysis/engine';
import { AnalysisStageList } from '@/components/analysis/StageList';
import { LiveTrackingOverlay } from '@/components/analysis/LiveTrackingOverlay';
import { SAMPLE_CLIP } from '@/data/sampleData';
import { useStagedAnalysis } from '@/hooks/useStagedAnalysis';
import { useApp } from '@/store/AppStore';
import { analysesForSkill } from '@/store/selectors';
import { Card, Chip, EmptyState, ErrorNote, InfoNote, SectionTitle } from '@/components/ui/primitives';
import { ProgressRing } from '@/components/ui/AnimatedNumber';
import { AthleteSilhouette, ScanEffect } from '@/components/visual/Background';
import { cn } from '@/lib/cn';

const RECORDING_TIPS = [
  'Place your phone approximately 2–3 metres away.',
  'Make sure your full body is visible.',
  'Perform the selected skill naturally.',
  'Keep the camera stable (prop it up, do not hold it).',
  'Make sure lighting is sufficient — avoid shooting into the sun.',
];

const MAX_FILE_MB = 250;

export function Analyze() {
  const { sportId = '', skillId = '' } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, pushToast } = useApp();
  const sport = getSport(sportId);
  const skill = getSkill(skillId);
  const staged = useStagedAnalysis();

  const [mode, setMode] = useState<'upload' | 'record'>('upload');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; duration: number; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const previousSignals = analysesForSkill(state, skillId)[0]?.signals.reduce<Record<string, number>>((acc, signal) => {
    acc[signal.key] = signal.score;
    return acc;
  }, {});

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => () => {
    stopStream();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, [stopStream]);

  if (!sport || !skill) {
    return (
      <EmptyState
        icon={<AlertTriangle size={20} />}
        title="Unknown skill"
        body="That skill is not part of the rulebook yet."
        action={
          <Link to="/analyze" className="btn-primary">
            Choose a sport
          </Link>
        }
      />
    );
  }

  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('video/')) {
      setError(`“${file.name}” is not a video file. Upload an MP4, MOV or WebM clip — most phone cameras record MP4 by default.`);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`That clip is ${(file.size / 1024 / 1024).toFixed(0)}MB. Please trim it below ${MAX_FILE_MB}MB — 30 seconds is all the AI needs.`);
      return;
    }
    const url = URL.createObjectURL(file);
    probeDuration(url, file.name, file.size);
  };

  const probeDuration = (url: string, name: string, size: number) => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = url;
    probe.onloadedmetadata = () => {
      const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
      if (duration && duration < 4) {
        setError(`That clip is only ${duration.toFixed(1)} seconds. Record at least 10 seconds so the AI can measure a few repetitions — 30 seconds is ideal.`);
        URL.revokeObjectURL(url);
        return;
      }
      setVideoUrl(url);
      setMeta({ name, duration: duration || 30, size });
    };
    probe.onerror = () => {
      setError('That video could not be read. Try a different clip or re-record directly in the app.');
      URL.revokeObjectURL(url);
    };
  };

  const useSampleClip = () => {
    setError(null);
    setMode('upload');
    setVideoUrl(null);
    setMeta({ name: SAMPLE_CLIP.name, duration: SAMPLE_CLIP.durationSec, size: 0 });
    setVideoUrl('sample://demo');
    pushToast({ title: 'Sample clip loaded', body: SAMPLE_CLIP.label, emoji: '🎬' });
  };

  const startCamera = async () => {
    setCameraError(null);
    setMode('record');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => undefined);
      }
      setCameraReady(true);
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraError('Camera permission was denied. Allow camera access in your browser settings, or upload a clip instead — both paths give the same analysis.');
      } else if (name === 'NotFoundError') {
        setCameraError('No camera was found on this device. Upload a clip recorded on your phone instead.');
      } else {
        setCameraError('We could not start the camera. Upload a clip instead — the analysis is identical.');
      }
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
    const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setMeta({ name: `recording-${new Date().toISOString().slice(11, 19)}.webm`, duration: Math.max(elapsed, 1), size: blob.size });
        stopStream();
        pushToast({ title: 'Clip captured', body: `${elapsed.toFixed(0)}s ready to analyse`, emoji: '🎥' });
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 0.1;
          if (next >= 45) stopRecording();
          return next;
        });
      }, 100);
    } catch {
      setCameraError('Recording is not supported by this browser. Upload a clip instead — the analysis is identical.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const discard = () => {
    if (videoUrl && videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setMeta(null);
    setError(null);
    staged.reset();
  };

  const runPipeline = async () => {
    if (!meta) return;
    setError(null);

    let element: HTMLVideoElement | null = null;
    if (videoUrl && videoUrl !== 'sample://demo') {
      element = document.createElement('video');
      element.src = videoUrl;
      element.muted = true;
      element.playsInline = true;
      element.preload = 'auto';
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        element!.addEventListener('loadeddata', done, { once: true });
        element!.addEventListener('error', done, { once: true });
        window.setTimeout(done, 4000);
      });
    }

    const analysis = await staged.run({
      sport: sport.id,
      skill,
      videoName: meta.name,
      durationSec: meta.duration,
      videoEl: element,
      signalProfile: previousSignals,
      seed: `${meta.name}-${state.analyses.length}`,
    });

    dispatch({ type: 'set-goal', skillId: skill.id, sport: sport.id });

    if (analysis) {
      dispatch({ type: 'add-analysis', analysis });
      pushToast({
        title: `Analysis complete · ${analysis.overall}/100`,
        body: `${analysis.weaknesses[0]?.title ?? 'No weaknesses'} is your top priority`,
        emoji: '🧠',
      });
      navigate(`/report/${analysis.id}`, {
        state: { videoUrl: videoUrl && videoUrl !== 'sample://demo' ? videoUrl : undefined },
      });
    }
  };

  const analyzing = staged.running;

  return (
    <div className="space-y-6">
      <Link to={`/analyze/${sport.id}`} className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-strong">
        <ArrowLeft size={15} /> Back to {sport.name} skills
      </Link>

      <SectionTitle
        eyebrow={`Step 3 of 3 · ${sport.name} · ${skill.name}`}
        title="Record your 30-second clip"
        subtitle={`${skill.focus} · ${skill.cameraTip}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden p-0">
          {/* mode switcher */}
          <div className="flex items-center gap-1 border-b border-[rgb(var(--line)/0.08)] p-3">
            {[
              { key: 'upload' as const, label: 'Upload video', icon: Upload },
              { key: 'record' as const, label: 'Record now', icon: Video },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (tab.key === 'record') void startCamera();
                  else {
                    setMode('upload');
                    stopStream();
                  }
                }}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  mode === tab.key ? 'nav-link-active text-strong' : 'text-muted hover:text-strong',
                )}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {analyzing ? (
              <AnalysisPipeline
                stageIndex={staged.stageIndex}
                waiting={staged.waitingOnEngine}
                progress={staged.progress}
                poseSource={videoUrl === 'sample://demo' ? 'demo motion engine' : 'MediaPipe Pose'}
              />
            ) : !videoUrl ? (
              mode === 'upload' ? (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    'flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition',
                    dragging ? 'border-cyan-400 bg-cyan-400/5' : 'border-[rgb(var(--line)/0.16)]',
                  )}
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/[0.12] text-cyan-300">
                    <Film size={24} />
                  </span>
                  <div>
                    <p className="text-lg font-bold">Drop your clip here</p>
                    <p className="mt-1 text-sm text-muted">MP4, MOV or WebM · up to {MAX_FILE_MB}MB · 10–45 seconds</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button type="button" className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={16} /> Choose file
                    </button>
                    <button type="button" className="btn-ghost" onClick={useSampleClip}>
                      <Sparkles size={16} /> Use sample clip
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                  />
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-black">
                  <video ref={liveVideoRef} className="aspect-[3/4] w-full object-cover sm:aspect-video" muted playsInline />
                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 grid place-items-center bg-ink-950/70 text-sm text-white">
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Starting camera…
                      </span>
                    </div>
                  )}

                  {/* live skeleton + posture coaching, drawn over the feed */}
                  <LiveTrackingOverlay videoRef={liveVideoRef} active={cameraReady} mirrored={false} />

                  {/* framing guide sits above the overlay's video but below its UI */}
                  <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-cyan-300/25" />
                  {!recording && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-16 text-center text-[11px] font-semibold text-white/70">
                      Keep your full body inside the frame
                    </div>
                  )}
                  {recording && (
                    <div className="pointer-events-none absolute inset-x-0 top-8 flex items-center justify-center gap-2">
                      <span className="flex items-center gap-2 rounded-full bg-rose-500/90 px-3 py-1 text-xs font-bold text-white">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC {elapsed.toFixed(1)}s
                      </span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-3 bottom-[4.5rem] flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                      <div
                        className={cn('h-full rounded-full transition-all', elapsed >= 30 ? 'bg-lime-400' : 'bg-cyan-400')}
                        style={{ width: `${Math.min((elapsed / 30) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-white/80">{elapsed < 30 ? `${(30 - elapsed).toFixed(0)}s to go` : 'ready'}</span>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-black">
                  {videoUrl === 'sample://demo' ? (
                    <div className="relative grid aspect-video w-full place-items-center">
                      <AthleteSilhouette className="h-4/5" />
                      <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                        Sample clip · {SAMPLE_CLIP.label}
                      </div>
                    </div>
                  ) : (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={videoUrl} controls playsInline className="aspect-video w-full object-contain" />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-strong">{meta?.name}</p>
                    <p className="text-xs text-muted">
                      {meta ? `${meta.duration.toFixed(1)}s` : ''}
                      {meta && meta.size ? ` · ${(meta.size / 1024 / 1024).toFixed(1)}MB` : ''} · ready for analysis
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-ghost" onClick={discard}>
                      <Trash2 size={15} /> {mode === 'record' ? 'Retake' : 'Remove'}
                    </button>
                    <button type="button" className="btn-primary" onClick={() => void runPipeline()}>
                      <Wand2 size={16} /> Start AI Analysis
                    </button>
                  </div>
                </div>
                <InfoNote tone="lime">
                  <span className="font-semibold">Privacy:</span> your clip is processed in your browser session for this
                  analysis and is never uploaded, published or shared. Press “Remove” and it is gone immediately.
                </InfoNote>
              </div>
            )}

            {mode === 'record' && !recording && cameraReady && !videoUrl && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={startRecording}>
                  <CircleDot size={16} /> Start recording
                </button>
                <button type="button" className="btn-ghost" onClick={stopStream}>
                  Stop camera
                </button>
              </div>
            )}
            {recording && (
              <div className="mt-4">
                <button type="button" className="btn-ghost w-full !border-rose-400/40 text-rose-200" onClick={stopRecording}>
                  <Square size={15} /> Stop recording ({elapsed.toFixed(1)}s)
                </button>
              </div>
            )}

            {cameraError && (
              <div className="mt-4">
                <ErrorNote title="Camera unavailable" body={cameraError} action={<button type="button" className="btn-ghost" onClick={useSampleClip}>Use sample clip instead</button>} />
              </div>
            )}
            {error && !analyzing && (
              <div className="mt-4">
                <ErrorNote title="We could not use that clip" body={error} />
              </div>
            )}
            {staged.error && (
              <div className="mt-4">
                <ErrorNote
                  title="Analysis could not complete"
                  body={staged.error.message}
                  action={<button type="button" className="btn-primary" onClick={() => { staged.clearError(); void runPipeline(); }}>Try again</button>}
                />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Recording guide</h3>
              <Chip className="text-lime-300">Recommended: 30s</Chip>
            </div>
            <ol className="mt-4 space-y-3">
              {RECORDING_TIPS.map((tip, index) => (
                <li key={tip} className="flex gap-3 text-sm text-muted">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-400/[0.12] text-[11px] font-bold text-cyan-300">
                    {index + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold">Skill checklist</h3>
            <ul className="mt-3 space-y-2">
              {skill.cueList.map((cue) => (
                <li key={cue} className="flex items-start gap-2 text-sm text-muted">
                  <Check size={15} className="mt-0.5 shrink-0 text-lime-300" /> {cue}
                </li>
              ))}
            </ul>
          </Card>

          <Card soft className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-300">
              <ShieldCheck size={15} /> What the AI will measure
            </h3>
            <div className="mt-3 space-y-2">
              {skill.signals.slice(0, 5).map((signal) => (
                <div key={signal.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted">{signal.label}</span>
                  <span className="font-mono text-xs text-cyan-200">{signal.ideal}</span>
                </div>
              ))}
            </div>
          </Card>

          {videoUrl && !analyzing && (
            <button type="button" className="btn-primary w-full !py-3" onClick={() => void runPipeline()}>
              <Play size={16} /> Start AI Analysis
            </button>
          )}
          {videoUrl && (
            <button type="button" className="btn-ghost w-full" onClick={discard}>
              <RefreshCw size={15} /> Start over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The animated "Analysing Movement…" stage list. */
function AnalysisPipeline({
  stageIndex,
  waiting,
  progress,
  poseSource,
}: {
  stageIndex: number;
  waiting: boolean;
  progress: number;
  poseSource: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-[rgb(var(--surface-2)/0.6)] p-5">
      <ScanEffect />
      <div className="relative grid gap-5 sm:grid-cols-[200px_1fr]">
        <div className="relative mx-auto hidden h-[200px] w-[200px] sm:block">
          <AthleteSilhouette className="h-full w-full" />
          <div className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-300/40" style={{ animationDelay: '0.6s' }} />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Analyzing Movement…</p>
              <h3 className="mt-1 text-xl font-bold">{ANALYSIS_STAGES[stageIndex]?.label}</h3>
              <p className="text-sm text-muted">{ANALYSIS_STAGES[stageIndex]?.detail}</p>
            </div>
            <ProgressRing value={Math.round(progress * 100)} size={76} stroke={7} label="done" animateFrom={0} />
          </div>

          <div className="mt-5">
            <AnalysisStageList stageIndex={stageIndex} progress={progress} waiting={waiting} />
          </div>

          <p className="mt-4 text-[11px] text-muted">
            Pose backend: <span className="font-semibold text-cyan-200">{poseSource}</span> · landmarks are measured frame by
            frame, so every score below comes from your actual movement.
          </p>
        </div>
      </div>
    </div>
  );
}
