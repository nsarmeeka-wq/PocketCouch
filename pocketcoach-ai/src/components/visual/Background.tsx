import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { SKELETON } from '@/lib/pose/landmarks';
import { heroPose } from '@/lib/analysis/simulator';
import { cn } from '@/lib/cn';

function seeded(i: number, salt = 1): number {
  const x = Math.sin(i * 12.9898 * salt) * 43758.5453;
  return x - Math.floor(x);
}

/** Floating AI particles — pure CSS, cheap on mobile. */
export function ParticleField({ count = 26, className = '' }: { count?: number; className?: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${seeded(i, 1) * 100}%`,
        top: `${seeded(i, 2) * 100}%`,
        size: 1.5 + seeded(i, 3) * 3.5,
        delay: `${seeded(i, 4) * 9}s`,
        duration: `${7 + seeded(i, 5) * 8}s`,
        hue: seeded(i, 6) > 0.5 ? '#22d3ee' : '#a3e635',
        opacity: 0.25 + seeded(i, 7) * 0.5,
      })),
    [count],
  );

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden="true">
      {particles.map((particle, index) => (
        <span
          key={index}
          className="absolute rounded-full animate-drift"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            background: particle.hue,
            opacity: particle.opacity,
            boxShadow: `0 0 ${particle.size * 4}px ${particle.hue}`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Animated athlete. The pose stream comes from the same forward-kinematic body
 * model the analysis engine uses, so the hero visual is a real jump shot.
 */
export function AthleteSilhouette({ className = '', showTrail = true }: { className?: string; showTrail?: boolean }) {
  const [frame, setFrame] = useState(0);
  const raf = useRef<number>();
  const start = useRef<number>();
  // Gradient/filter ids must be unique per instance — several silhouettes can be
  // on screen at once, and a shared id resolves to whichever defs come first in
  // the DOM (see LogoMark for the same trap).
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '');
  const lineId = `athlete-line-${uid}`;
  const glowId = `athlete-glow-${uid}`;
  const lineRef = `url(#${lineId})`;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setFrame(0.34);
      return;
    }
    const loop = (now: number) => {
      if (!start.current) start.current = now;
      const elapsed = (now - start.current) / 3600;
      setFrame(elapsed % 1);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const landmarks = useMemo(() => heroPose(frame), [Math.round(frame * 120)]);
  const points = landmarks.map((lm) => ({ x: lm.x * 100, y: lm.y * 100 }));

  return (
    <div className={cn('relative', className)} aria-hidden="true">
      <div className="absolute inset-0 -z-10 rounded-full bg-cyan-400/10 blur-3xl" />
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={lineId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* motion trail */}
        {showTrail && (
          <g opacity="0.22" stroke={lineRef} strokeWidth="0.7" fill="none">
            {[0.05, 0.12, 0.2].map((offset) => {
              const ghost = heroPose((frame + offset) % 1).map((lm) => ({ x: lm.x * 100, y: lm.y * 100 }));
              return <polyline key={offset} points={ghost.map((p) => `${p.x},${p.y}`).join(' ')} />;
            })}
          </g>
        )}

        <g filter={`url(#${glowId})`}>
          {SKELETON.map(([a, b], index) => (
            <line
              key={index}
              x1={points[a].x}
              y1={points[a].y}
              x2={points[b].x}
              y2={points[b].y}
              stroke={lineRef}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          ))}
          {points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r={index === 0 ? 2.4 : 1.3} fill={index === 0 ? '#bef264' : '#22d3ee'} />
          ))}
        </g>

        {/* floor + arc */}
        <line x1="6" y1="96" x2="94" y2="96" stroke="rgba(148,163,184,0.35)" strokeWidth="0.6" strokeDasharray="3 3" />
      </svg>
    </div>
  );
}

/** Scanning line used behind the analysis overlay. */
export function ScanEffect({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-x-0 h-1/3 animate-scanline bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_45%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}
