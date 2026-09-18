/**
 * Brand assets.
 *
 * `<LogoMark />` is the vector recreation used in the navigation bar and
 * favicon (crisp at any size), while `<LogoLockup />` uses the supplied brand
 * artwork for the landing page hero.
 */
import { useId } from 'react';
import { cn } from '@/lib/cn';

export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  // Per-instance gradient id. A shared id breaks as soon as the mark appears
  // twice on a page: every instance references whichever <defs> comes first in
  // the DOM, and defs inside a `display: none` subtree (the collapsed sidebar on
  // mobile) never paint — leaving a black tile instead of the logo.
  const gradientId = `pc-mark-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const stroke = `url(#${gradientId})`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="PocketCoach AI">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a3e635" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="90" height="90" rx="24" fill="#05070d" stroke={stroke} strokeWidth="6" />
      <g fill="none" stroke={stroke} strokeWidth="5.5" strokeLinecap="round">
        <path d="M24 66 L42 80 L76 46" />
        <path d="M32 40 C 27 50, 25 56, 21 64" />
        <path d="M32 44 C 42 42, 48 37, 55 30" />
        <path d="M76 46 l-12 -1" />
        <path d="M76 46 l2 12" />
      </g>
      <circle cx="34" cy="33" r="6.5" fill={stroke} />
      <g stroke={stroke} strokeWidth="3" strokeLinecap="round">
        <path d="M72 22 l6 6" />
        <path d="M78 22 l-6 6" />
        <path d="M75 18 v14" />
        <path d="M68 25 h14" />
      </g>
    </svg>
  );
}

export function LogoLockup({ className = '', markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {markOnly ? (
        <LogoMark size={40} />
      ) : (
        <div className="flex items-center gap-3">
          <LogoMark size={44} />
          <div className="leading-none">
            <p className="font-display text-xl font-bold text-strong">
              PocketCoach <span className="gradient-text">AI</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">Form &amp; Progress</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** The supplied brand artwork, used as the hero logo on the landing page. */
export function BrandArtwork({ className = '' }: { className?: string }) {
  return (
    <img
      src="/pocketcoach-logo.jpg"
      alt="PocketCoach AI — Form & Progress"
      className={cn('w-full rounded-3xl border border-white/10 shadow-card', className)}
      loading="eager"
    />
  );
}
