import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Card({
  children,
  className = '',
  soft = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
  as?: 'div' | 'section' | 'article';
}) {
  return <Tag className={`${soft ? 'glass-soft' : 'glass-card'} ${className}`}>{children}</Tag>;
}

export function Chip({ children, className = '', tone }: { children: ReactNode; className?: string; tone?: string }) {
  return <span className={`chip ${tone ?? ''} ${className}`}>{children}</span>;
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  right,
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/90">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold sm:text-[28px]">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatTile({
  icon,
  label,
  value,
  hint,
  accent = 'text-cyan-300',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="glass-soft flex items-center gap-3 p-3.5">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="truncate font-display text-lg font-bold text-strong">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="glass-soft flex flex-col items-center gap-3 p-8 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/[0.12] text-cyan-300">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className={`glass-card w-full ${maxWidth} max-h-[88vh] overflow-y-auto rounded-b-none p-5 sm:rounded-3xl`}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-strong" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
      <p className="font-semibold text-amber-200">{title}</p>
      <p className="mt-1 text-sm text-amber-100/80">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function InfoNote({ children, tone = 'cyan' }: { children: ReactNode; tone?: 'cyan' | 'amber' | 'lime' }) {
  const tones = {
    cyan: 'border-cyan-400/25 bg-cyan-500/[0.08] text-cyan-100/90',
    amber: 'border-amber-400/25 bg-amber-500/[0.08] text-amber-100/90',
    lime: 'border-lime-400/25 bg-lime-500/[0.08] text-lime-100/90',
  } as const;
  return <div className={`rounded-2xl border p-3.5 text-sm leading-relaxed ${tones[tone]}`}>{children}</div>;
}
