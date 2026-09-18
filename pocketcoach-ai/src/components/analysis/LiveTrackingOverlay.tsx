/**
 * Live joint tracking overlay for the recording screen.
 *
 * While the camera is open this component:
 *   1. runs the shared MediaPipe landmarker on the live feed (rAF-paced, so it
 *      never fights the browser for a frame),
 *   2. draws the tracked skeleton on a canvas stretched over the video,
 *   3. turns each frame into posture feedback via `measureLiveFrame` — one cue
 *      at a time, with the problem joints tinted on the skeleton itself.
 *
 * Everything is optional-by-design: if the pose model cannot load (offline,
 * no WebGL, blocked CDN) the overlay says so and recording continues exactly
 * as before. The overlay also never renders into the recorded clip — it draws
 * on a separate canvas layered above the <video> that MediaRecorder captures.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, CheckCircle2, Eye, EyeOff, Loader2, TriangleAlert, WifiOff } from 'lucide-react';
import { getSharedLandmarker, type PoseLandmarkerLike } from '@/lib/analysis/poseProvider';
import { measureLiveFrame, type LiveReading } from '@/lib/analysis/liveFeedback';
import { SKELETON } from '@/lib/pose/landmarks';
import type { Landmark } from '@/lib/types';
import { cn } from '@/lib/cn';

type TrackState = 'idle' | 'loading' | 'running' | 'unavailable';

const TONE_COLOR: Record<string, string> = {
  good: '#22d3ee',
  warn: '#fbbf24',
  bad: '#fb7185',
};

const TONE_JOINT_FILL: Record<string, string> = {
  good: '#a5f3fc',
  warn: '#fde68a',
  bad: '#fecdd3',
};

/** rAF loop pacing: target ~24 fps of inference, leaving headroom for drawing. */
const TARGET_FRAME_MS = 1000 / 24;

export function LiveTrackingOverlay({
  videoRef,
  active,
  mirrored,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  mirrored: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);
  const landmarkerRef = useRef<PoseLandmarkerLike | null>(null);
  const stateRef = useRef<{ active: boolean; mirrored: boolean }>({ active, mirrored });

  const [trackState, setTrackState] = useState<TrackState>('idle');
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);

  stateRef.current = { active, mirrored };

  /* --- load the model once the overlay is switched on ---------------------- */
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setTrackState((current) => (current === 'running' ? current : 'loading'));

    void getSharedLandmarker().then((landmarker) => {
      if (cancelled) return;
      if (!landmarker) {
        setTrackState('unavailable');
        return;
      }
      landmarkerRef.current = landmarker;
      setTrackState('running');
    });

    return () => {
      cancelled = true;
    };
  }, [active]);

  /* --- the tracking + drawing loop ----------------------------------------- */
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);
    const { active: isActive, mirrored: isMirrored } = stateRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!isActive || !video || !canvas || video.readyState < 2) return;

    // size the canvas to the video once
    if (canvas.width !== video.videoWidth && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const now = performance.now();
    let landmarks: Landmark[] | undefined;
    if (landmarker && now - lastRunRef.current >= TARGET_FRAME_MS) {
      lastRunRef.current = now;
      try {
        const result = landmarker.detectForVideo(video, now);
        landmarks = result.landmarks?.[0];
      } catch {
        // a single failed inference must not kill the loop
        landmarks = undefined;
      }
    }

    if (landmarks) {
      setReading(measureLiveFrame(landmarks));
      drawSkeleton(canvas, landmarks, isMirrored, reading);
    }
  }, [reading, videoRef]);

  useEffect(() => {
    if (!active || trackState !== 'running') return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, trackState, tick]);

  /* reset feedback when deactivated */
  useEffect(() => {
    if (!active) {
      setReading(null);
      setTrackState('idle');
    }
  }, [active]);

  const statusBadge = {
    idle: null,
    loading: (
      <span className="flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold text-white/90">
        <Loader2 size={11} className="animate-spin" /> Loading tracker…
      </span>
    ),
    running: (
      <span className="flex items-center gap-1.5 rounded-full bg-lime-400/90 px-2.5 py-1 text-[10px] font-bold text-ink-950">
        <Activity size={11} /> LIVE TRACKING
      </span>
    ),
    unavailable: (
      <span className="flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold text-white/80">
        <WifiOff size={11} /> Tracker unavailable
      </span>
    ),
  }[trackState];

  const tone = reading?.cue?.tone;
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* the canvas draws beneath the UI chips but above the video frame */}
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity',
          showSkeleton && trackState === 'running' ? 'opacity-100' : 'opacity-0',
          mirrored && '-scale-x-100',
        )}
      />

      {/* top-left: status */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        {statusBadge}
        {trackState === 'running' && (
          <button
            type="button"
            onClick={() => setShowSkeleton((current) => !current)}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold text-white/90 transition hover:bg-ink-950/90"
          >
            {showSkeleton ? <EyeOff size={11} /> : <Eye size={11} />} {showSkeleton ? 'Hide' : 'Show'} skeleton
          </button>
        )}
      </div>

      {/* top-right: live form score */}
      {trackState === 'running' && reading?.bodyVisible && (
        <div className="absolute right-3 top-3 rounded-2xl bg-ink-950/70 px-3 py-2 text-center backdrop-blur-sm">
          <p className={cn('font-display text-xl font-bold leading-none', scoreTextClass(reading.formScore))}>
            {reading.formScore}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70">form</p>
        </div>
      )}

      {/* bottom: the ONE coaching cue + angle chips */}
      <div className="absolute inset-x-3 bottom-3 space-y-2">
        {trackState === 'running' && reading && !reading.bodyVisible && (
          <div className="flex items-center gap-2 rounded-xl bg-ink-950/75 px-3 py-2 text-[11px] font-medium text-amber-200 backdrop-blur-sm">
            <TriangleAlert size={13} className="shrink-0" />
            Step back so your whole body is in frame — the tracker needs head, shoulders, hips and feet.
          </div>
        )}
        {trackState === 'running' && reading?.cue && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold backdrop-blur-sm',
              tone === 'bad'
                ? 'bg-rose-500/85 text-white'
                : tone === 'warn'
                  ? 'bg-amber-400/90 text-ink-950'
                  : 'bg-lime-400/90 text-ink-950',
            )}
          >
            {tone === 'good' ? <CheckCircle2 size={14} className="shrink-0" /> : <TriangleAlert size={14} className="shrink-0" />}
            {reading.cue.label}
          </div>
        )}
        {trackState === 'running' && reading?.bodyVisible && reading.angles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reading.angles.map((angle) => (
              <span
                key={angle.label}
                className={cn(
                  'rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold backdrop-blur-sm',
                  angle.tone === 'bad'
                    ? 'border-rose-300/50 bg-rose-500/25 text-rose-100'
                    : angle.tone === 'warn'
                      ? 'border-amber-300/50 bg-amber-400/20 text-amber-100'
                      : 'border-cyan-300/40 bg-cyan-500/15 text-cyan-100',
                )}
              >
                {angle.label} {angle.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function scoreTextClass(score: number): string {
  if (score >= 85) return 'text-lime-300';
  if (score >= 65) return 'text-amber-300';
  return 'text-rose-300';
}

/** Paint the current skeleton; problem joints are tinted by the reading. */
function drawSkeleton(
  canvas: HTMLCanvasElement,
  landmarks: Landmark[],
  mirrored: boolean,
  reading: LiveReading | null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const toneForIndex = (index: number): string | undefined => {
    const entry = reading?.joints.find((joint) => jointIndex(joint.key) === index);
    return entry?.tone;
  };

  const px = (lm: Landmark) => ({
    x: (mirrored ? 1 - lm.x : lm.x) * canvas.width,
    y: lm.y * canvas.height,
  });

  const visible = (lm: Landmark) => (lm.visibility ?? 1) > 0.4;

  // bones
  for (const [a, b] of SKELETON) {
    const pa = landmarks[a];
    const pb = landmarks[b];
    if (!pa || !pb || !visible(pa) || !visible(pb)) continue;
    const A = px(pa);
    const B = px(pb);
    const tone = toneForIndex(a) ?? toneForIndex(b);
    ctx.strokeStyle = tone ? TONE_COLOR[tone] : 'rgba(34, 211, 238, 0.85)';
    ctx.lineWidth = tone === 'bad' ? 4 : tone === 'warn' ? 3.5 : 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
  }

  // joints
  for (let index = 0; index < landmarks.length; index += 1) {
    const lm = landmarks[index];
    if (!lm || !visible(lm)) continue;
    const P = px(lm);
    const tone = toneForIndex(index);
    ctx.fillStyle = tone ? TONE_JOINT_FILL[tone] : 'rgba(165, 243, 252, 0.9)';
    ctx.beginPath();
    ctx.arc(P.x, P.y, tone ? 5.5 : 3, 0, Math.PI * 2);
    ctx.fill();
    if (tone === 'bad') {
      // attention ring around problem joints
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(P.x, P.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** joint key (from LiveReading) → MediaPipe landmark index */
function jointIndex(key: string): number | undefined {
  switch (key) {
    case 'leftElbow':
      return 13;
    case 'rightElbow':
      return 14;
    case 'leftKnee':
      return 25;
    case 'rightKnee':
      return 26;
    default:
      return undefined; // 'torso' tints the connecting bones via elbow/knee lookup misses
  }
}
