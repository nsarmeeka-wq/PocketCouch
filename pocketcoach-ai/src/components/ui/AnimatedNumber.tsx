import { useEffect, useRef, useState } from 'react';
import { BAND_STROKE, clampPercent, scoreBand } from '@/lib/format';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/** Counts from `from` to `value` with an ease-out curve. */
export function AnimatedNumber({
  value,
  from = 0,
  duration = 1100,
  decimals = 0,
  suffix = '',
  prefix = '',
  className,
}: {
  value: number;
  from?: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : from);
  const frame = useRef<number>();

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const origin = from;
    const delta = value - origin;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(origin + delta * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, from, duration, reduced]);

  return (
    <span className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Circular score indicator with an animated sweep. */
export function ProgressRing({
  value,
  size = 128,
  stroke = 10,
  label,
  sublabel,
  showValue = true,
  animateFrom = 0,
  tone,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  showValue?: boolean;
  animateFrom?: number;
  tone?: string;
}) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [progress, setProgress] = useState(reduced ? value : animateFrom);
  const startRef = useRef<number>();

  useEffect(() => {
    if (reduced) {
      setProgress(value);
      return;
    }
    startRef.current = performance.now();
    let raf = 0;
    const origin = animateFrom;
    const tick = (now: number) => {
      const t = Math.min((now - (startRef.current ?? now)) / 1200, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animateFrom, reduced]);

  const band = scoreBand(value);
  const color = tone ?? BAND_STROKE[band];
  const offset = circumference - (clampPercent(progress) / 100) * circumference;
  const gradientId = `ring-grad-${Math.round(size)}-${band}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={band === 'elite' ? '#a3e635' : band === 'critical' ? '#f43f5e' : '#34d399'} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-500/15" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showValue && (
          <span className="font-display text-3xl font-bold text-strong tabular-nums">
            <AnimatedNumber value={value} from={animateFrom} />
          </span>
        )}
        {label && <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>}
        {sublabel && <span className="mt-0.5 text-xs text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}

/** Horizontal animated score meter. */
export function MeterBar({
  value,
  max = 100,
  label,
  right,
  height = 8,
  from,
  gradient = 'linear-gradient(90deg,#22d3ee,#34d399,#a3e635)',
  delay = 0,
}: {
  value: number;
  max?: number;
  label?: string;
  right?: React.ReactNode;
  height?: number;
  from?: number;
  gradient?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const pct = clampPercent((value / max) * 100);
  const [width, setWidth] = useState(reduced ? pct : from !== undefined ? clampPercent((from / max) * 100) : 0);

  useEffect(() => {
    if (reduced) {
      setWidth(pct);
      return;
    }
    const timer = window.setTimeout(() => setWidth(pct), delay);
    return () => window.clearTimeout(timer);
  }, [pct, delay, reduced]);

  return (
    <div className="w-full">
      {(label || right) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium text-strong">{label}</span>
          {right}
        </div>
      )}
      <div className="w-full overflow-hidden rounded-full bg-slate-500/15" style={{ height }}>
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundImage: gradient, boxShadow: '0 0 18px -4px rgba(34,211,238,0.7)' }}
        />
      </div>
    </div>
  );
}

/** Radial tick meter used in compact stat rows. */
export function MiniRing({ value, size = 44, stroke = 5 }: { value: number; size?: number; stroke?: number }) {
  const band = scoreBand(value);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-500/15" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={BAND_STROKE[band]}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (clampPercent(value) / 100) * circumference}
      />
    </svg>
  );
}
