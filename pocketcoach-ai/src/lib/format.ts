import type { Severity } from '@/lib/types';

export function severityFromScore(score: number): Severity {
  if (score < 58) return 'Critical';
  if (score < 70) return 'Needs Improvement';
  if (score < 84) return 'Minor';
  return 'Strength';
}

export type ScoreBand = 'critical' | 'developing' | 'solid' | 'elite';

export function scoreBand(score: number): ScoreBand {
  if (score < 58) return 'critical';
  if (score < 76) return 'developing';
  if (score < 88) return 'solid';
  return 'elite';
}

export const BAND_TEXT: Record<ScoreBand, string> = {
  critical: 'text-rose-300',
  developing: 'text-amber-300',
  solid: 'text-cyan-300',
  elite: 'text-lime-300',
};

export const BAND_STROKE: Record<ScoreBand, string> = {
  critical: '#fb7185',
  developing: '#fbbf24',
  solid: '#22d3ee',
  elite: '#a3e635',
};

export const BAND_CHIP: Record<ScoreBand, string> = {
  critical: 'bg-rose-500/[0.12] text-rose-300 border-rose-400/30',
  developing: 'bg-amber-500/[0.12] text-amber-300 border-amber-400/30',
  solid: 'bg-cyan-500/[0.12] text-cyan-300 border-cyan-400/30',
  elite: 'bg-lime-500/[0.12] text-lime-300 border-lime-400/30',
};

export const SEVERITY_CHIP: Record<Severity, string> = {
  Critical: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  'Needs Improvement': 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  Minor: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
  Strength: 'bg-lime-500/15 text-lime-300 border-lime-400/30',
};

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, opts);
  } catch {
    return '—';
  }
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function relativeDay(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return 'last week';
  return `${Math.round(diff / 7)} weeks ago`;
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function deltaLabel(delta: number): string {
  if (delta === 0) return 'no change';
  return `${delta > 0 ? '+' : ''}${Math.round(delta)}`;
}

export function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
