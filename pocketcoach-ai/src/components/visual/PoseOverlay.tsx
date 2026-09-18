import { useId, useMemo } from 'react';
import type { PoseFrames } from '@/lib/types';
import { JOINT_INDEX, JOINT_LABEL, LM, SKELETON } from '@/lib/pose/landmarks';
import { cn } from '@/lib/cn';

export interface AngleBadge {
  /** joint name from JOINT_INDEX, e.g. "rightElbow" */
  joint: string;
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad';
}

interface PoseOverlayProps {
  frames: PoseFrames;
  frameIndex: number;
  highlight?: string[];
  angles?: AngleBadge[];
  showSkeleton?: boolean;
  showJoints?: boolean;
  className?: string;
  mirrored?: boolean;
}

const TONE_CHIP: Record<'good' | 'warn' | 'bad', string> = {
  good: 'bg-cyan-500/15 text-cyan-100 border-cyan-300/40',
  warn: 'bg-amber-500/15 text-amber-100 border-amber-300/40',
  bad: 'bg-rose-500/20 text-rose-100 border-rose-300/45',
};

/**
 * Draws the tracked skeleton on top of a video frame. All coordinates are the
 * model's normalised landmarks, so this renders identically for a real
 * MediaPipe read and for the demo motion engine.
 */
export function PoseOverlay({
  frames,
  frameIndex,
  highlight = [],
  angles = [],
  showSkeleton = true,
  showJoints = true,
  className = '',
  mirrored = false,
}: PoseOverlayProps) {
  const frame = frames[Math.min(Math.max(frameIndex, 0), Math.max(frames.length - 1, 0))];
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);
  // Unique per instance: the report and the demo can both show a skeleton, and a
  // shared gradient/filter id resolves to the first defs in the document.
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const boneId = `pose-bone-${uid}`;
  const glowId = `pose-glow-${uid}`;

  const points = useMemo(() => {
    if (!frame) return [];
    return frame.map((lm) => ({
      x: (mirrored ? 1 - lm.x : lm.x) * 100,
      y: lm.y * 100,
      visibility: lm.visibility ?? 0.9,
    }));
  }, [frame, mirrored]);

  if (!frame || !points.length) return null;

  const badgePositions = angles.map((badge) => {
    const index = JOINT_INDEX[badge.joint] ?? LM.NOSE;
    const point = points[index];
    return { ...badge, x: point?.x ?? 50, y: point?.y ?? 50 };
  });

  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={boneId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#${glowId})`}>
          {showSkeleton &&
            SKELETON.map(([a, b], index) => {
              const involves = highlightSet.has(jointName(a)) || highlightSet.has(jointName(b));
              return (
                <line
                  key={index}
                  x1={points[a].x}
                  y1={points[a].y}
                  x2={points[b].x}
                  y2={points[b].y}
                  stroke={involves ? '#fbbf24' : `url(#${boneId})`}
                  strokeWidth={involves ? 2.4 : 1.1}
                  strokeLinecap="round"
                  opacity={involves ? 1 : 0.85}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
        </g>

        {showJoints &&
          points.map((point, index) => {
            const name = jointName(index);
            const isHighlight = highlightSet.has(name);
            return (
              <g key={index}>
                {isHighlight && <circle cx={point.x} cy={point.y} r={4} fill="#fbbf24" opacity={0.22} />}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHighlight ? 1.5 : 0.85}
                  fill={isHighlight ? '#fde68a' : '#a5f3fc'}
                  stroke={isHighlight ? '#f59e0b' : 'transparent'}
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
      </svg>

      {badgePositions.map((badge) => (
        <div
          key={`${badge.joint}-${badge.label}`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${badge.x}%`, top: `${badge.y}%` }}
        >
          <div
            className={cn(
              'whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-semibold leading-none shadow-lg backdrop-blur-sm sm:text-[11px]',
              TONE_CHIP[badge.tone ?? 'warn'],
            )}
          >
            {badge.label}: {badge.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function jointName(index: number): string {
  const entry = Object.entries(JOINT_INDEX).find(([, value]) => value === index);
  return entry?.[0] ?? String(index);
}

export function jointLabel(name: string): string {
  return JOINT_LABEL[name] ?? name;
}
