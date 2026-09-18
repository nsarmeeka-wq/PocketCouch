import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BarChart3, CalendarCheck, ChevronRight, ClipboardList, Clock, FileBarChart, Flame, History as HistoryIcon, Medal, Sparkles, Star, TrendingUp, Trophy } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import {
  analysesForSkill,
  drillsCompleted,
  latestAnalysis,
  metricTrend,
  overallTrend,
  sportBreakdown,
  totalTrainingMinutes,
  weekStats,
  weaknessSummaries,
} from '@/store/selectors';
import { compareAnalyses, improvementRows } from '@/lib/analysis/engine';
import { BADGES } from '@/lib/gamification';
import { BAND_CHIP, BAND_TEXT, formatDate, formatTime, relativeDay, scoreBand, SEVERITY_CHIP } from '@/lib/format';
import type { SessionLog, VideoAnalysis } from '@/lib/types';
import { Card, Chip, EmptyState, InfoNote, SectionTitle, StatTile } from '@/components/ui/primitives';
import { AnimatedNumber, MeterBar, ProgressRing } from '@/components/ui/AnimatedNumber';
import { cn } from '@/lib/cn';

type ProgressTab = 'overview' | 'history' | 'reports' | 'analytics';

interface ProgressAnalytics {
  bySkill: [string, { name: string; count: number; best: number; first: number; latest: number; lastDate: string }][];
  weeks: { label: string; count: number; minutes: number }[];
  bestEver?: VideoAnalysis;
  longestSession?: SessionLog;
  biggestJump: { delta: number; analysis?: VideoAnalysis };
}

const TABS: { id: ProgressTab; label: string; icon: JSX.Element }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
  { id: 'history', label: 'History', icon: <HistoryIcon size={15} /> },
  { id: 'reports', label: 'Reports', icon: <FileBarChart size={15} /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={15} /> },
];

const CHART_TOOLTIP = {
  contentStyle: { background: 'rgba(8,11,20,0.92)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#a5f3fc' },
} as const;

export function Progress() {
  const { state } = useApp();
  const [tab, setTab] = useState<ProgressTab>('overview');
  const [skillId, setSkillId] = useState<string | undefined>(undefined);
  const latest = latestAnalysis(state, skillId);
  const history = latest ? analysesForSkill(state, latest.skill) : [];
  const previous = history[1];
  const comparison = latest && previous ? compareAnalyses(previous, latest) : undefined;
  const trend = overallTrend(state, latest?.skill);
  const weaknesses = weaknessSummaries(state, latest?.skill);
  const week = weekStats(state);
  const sports = sportBreakdown(state);
  const earned = new Set(state.user.badges.map((b) => b.id));

  const skillsTracked = [...new Set(state.analyses.map((a) => ({ id: a.skill, name: a.skillName })).map((a) => `${a.id}|${a.name}`))].map((key) => {
    const [id, name] = key.split('|');
    return { id, name };
  });

  /* --- full logs for the History / Reports tabs --------------------------- */
  const allAnalyses = useMemo(
    () => [...state.analyses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [state.analyses],
  );
  const allSessions = useMemo(
    () => [...state.sessions].sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1)),
    [state.sessions],
  );

  /* --- analytics: personal records + weekly activity ----------------------- */
  const analytics = useMemo(() => {
    const bySkill = new Map<string, { name: string; count: number; best: number; first: number; latest: number; lastDate: string }>();
    for (const a of [...allAnalyses].reverse()) {
      const row = bySkill.get(a.skill) ?? { name: a.skillName, count: 0, best: 0, first: a.overall, latest: a.overall, lastDate: a.createdAt };
      row.count += 1;
      row.best = Math.max(row.best, a.overall);
      row.latest = a.overall;
      row.lastDate = a.createdAt;
      bySkill.set(a.skill, row);
    }
    // assessments per week for the last 8 weeks
    const weeks: { label: string; count: number; minutes: number }[] = [];
    const now = Date.now();
    for (let i = 7; i >= 0; i -= 1) {
      const start = now - (i + 1) * 7 * 86_400_000;
      const end = now - i * 7 * 86_400_000;
      const inWeek = allAnalyses.filter((a) => {
        const t = new Date(a.createdAt).getTime();
        return t >= start && t < end;
      });
      const sessionsIn = allSessions.filter((s) => {
        const t = new Date(s.completedAt).getTime();
        return t >= start && t < end;
      });
      weeks.push({
        label: i === 0 ? 'This wk' : `${Math.round((now - end) / (7 * 86_400_000))}w ago`,
        count: inWeek.length + sessionsIn.length,
        minutes: sessionsIn.reduce((sum, s) => sum + s.minutes, 0),
      });
    }
    const bestEver = allAnalyses.reduce<VideoAnalysis | undefined>((best, a) => (!best || a.overall > best.overall ? a : best), undefined);
    const longestSession = allSessions.reduce<SessionLog | undefined>((longest, s) => (!longest || s.minutes > longest.minutes ? s : longest), undefined);
    const biggestJump = allAnalyses.reduce<{ delta: number; analysis?: VideoAnalysis }>((max, a) => {
      const prev = allAnalyses.filter((p) => p.skill === a.skill && p.createdAt < a.createdAt).sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))[0];
      const delta = prev ? a.overall - prev.overall : 0;
      return delta > max.delta ? { delta, analysis: a } : max;
    }, { delta: 0 });
    return { bySkill: [...bySkill.entries()], weeks, bestEver, longestSession, biggestJump };
  }, [allAnalyses, allSessions]);

  if (!latest) {
    return (
      <EmptyState
        icon={<BarChart3 size={20} />}
        title="No progress data yet"
        body="Record your first 30-second clip and every metric will start tracking from that baseline."
        action={
          <Link to="/analyze" className="btn-primary">
            Analyze my skill
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Progress"
        title="Your improvement, measured"
        subtitle="Every re-test is compared against your own baseline, so the trend line is real technique change — not a fresh score."
        right={
          <div className="flex flex-wrap gap-2">
            {skillsTracked.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSkillId(skill.id === latest.skill && skillId ? undefined : skill.id)}
                className={cn('chip transition', skill.id === latest.skill ? 'text-cyan-200 ring-1 ring-cyan-400/40' : 'text-muted')}
              >
                {skill.name}
              </button>
            ))}
          </div>
        }
      />

      {/* ---------------- dedicated menu bar ---------------- */}
      <nav aria-label="Progress sections" className="sticky top-[64px] z-20 -mx-1 rounded-2xl border border-[rgb(var(--line)/0.12)] bg-[rgb(var(--bg-card)/0.85)] p-1.5 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                tab === t.id
                  ? 'bg-gradient-to-r from-cyan-500/25 to-lime-400/20 text-cyan-100 ring-1 ring-cyan-400/40'
                  : 'text-muted hover:bg-white/5 hover:text-strong',
              )}
            >
              {t.icon}
              {t.label}
              {t.id === 'reports' && allAnalyses.length > 0 && (
                <span className="rounded-full bg-cyan-400/15 px-1.5 text-[10px] font-bold text-cyan-200">{allAnalyses.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {tab !== 'overview' && <ProgressTabContent tab={tab} analyses={allAnalyses} sessions={allSessions} analytics={analytics} />}

      {tab === 'overview' && (
      <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<CalendarCheck size={17} />} label="Sessions completed" value={<AnimatedNumber value={week.sessions} />} hint="last 7 days" />
        <StatTile icon={<Clock size={17} />} label="Training time" value={`${week.minutes} min`} hint={`${totalTrainingMinutes(state)} min lifetime`} />
        <StatTile icon={<Star size={17} />} label="XP earned" value={<AnimatedNumber value={week.xp} />} hint="this week" accent="text-lime-300" />
        <StatTile
          icon={<TrendingUp size={17} />}
          label="Improvement"
          value={`+${week.improvementPercent}%`}
          hint="precision since baseline"
          accent="text-emerald-300"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Overall skill trend</h2>
              <p className="text-xs text-muted">{latest.skillName} · {trend.length} assessments</p>
            </div>
            <Chip className={BAND_CHIP[scoreBand(latest.overall)]}>
              {history[history.length - 1]?.overall} → {latest.overall}
            </Chip>
          </div>
          <div className="mt-5 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="progress-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Area type="monotone" dataKey="overall" stroke="#34d399" strokeWidth={2.6} fill="url(#progress-area)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {['technique', 'balance'].map((key) => (
              <div key={key}>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  {latest.metrics.find((m) => m.key === key)?.label ?? key}
                </p>
                <div className="mt-2 h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metricTrend(state, key, latest.skill)} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                      <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                      <Tooltip {...CHART_TOOLTIP} />
                      <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2.4} dot={{ r: 3, fill: '#22d3ee' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-xl font-bold">Metric breakdown</h2>
            <p className="text-xs text-muted">Latest vs first assessment</p>
            <div className="mt-4 space-y-4">
              {latest.metrics.map((metric, index) => {
                const first = history[history.length - 1]?.metrics.find((m) => m.key === metric.key)?.score ?? metric.score;
                return (
                  <div key={metric.key}>
                    <MeterBar
                      value={metric.score}
                      from={first}
                      delay={index * 90}
                      label={metric.label}
                      right={
                        <span className="flex items-center gap-2 text-xs">
                          <span className="text-muted">{first}</span>
                          <ArrowRight size={12} className="text-muted" />
                          <span className={cn('font-display text-base font-bold tabular-nums', BAND_TEXT[scoreBand(metric.score)])}>{metric.score}</span>
                        </span>
                      }
                    />
                    <p className="mt-1 text-[11px] text-muted">{metric.blurb}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {comparison && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-lime-300" />
                <h2 className="text-xl font-bold">Before vs after</h2>
              </div>
              <p className="mt-1 text-xs text-muted">
                {relativeDay(previous.createdAt)} → {relativeDay(latest.createdAt)}
              </p>
              <div className="mt-4 flex items-center justify-center gap-6">
                <ProgressRing value={previous.overall} size={104} stroke={9} label="Before" animateFrom={0} />
                <ArrowRight size={20} className="text-lime-300" />
                <ProgressRing value={latest.overall} size={104} stroke={9} label="After" animateFrom={previous.overall} />
              </div>
              <div className="mt-4 space-y-2">
                {improvementRows(comparison.rows, 5).map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--line)/0.1)] px-3 py-2 text-sm">
                    <span className="truncate text-muted">{row.label}</span>
                    <span className="flex shrink-0 items-center gap-2 font-mono text-xs">
                      <span className="text-muted">{row.before}</span>
                      <ArrowRight size={11} className="text-muted" />
                      <span className="text-strong">{row.after}</span>
                      <span className={cn('font-semibold', row.delta >= 0 ? 'text-lime-300' : 'text-amber-300')}>
                        {row.delta >= 0 ? '+' : ''}
                        {row.delta}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <h2 className="text-xl font-bold">Weakness history</h2>
          <p className="text-xs text-muted">This is the AI adapting over time — the same fault, re-measured every assessment</p>
          <div className="mt-5 space-y-5">
            {weaknesses.slice(0, 5).map((weakness) => (
              <div key={weakness.signalKey}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-strong">{weakness.label}</span>
                    <span className={cn('chip !px-2 !py-0.5 text-[10px]', SEVERITY_CHIP[weakness.severity])}>{weakness.severity}</span>
                  </div>
                  <span className="font-mono text-sm text-muted">{weakness.history.map((v) => Math.round(v)).join(' → ')}</span>
                </div>
                <div className="mt-2.5">
                  <MeterBar value={weakness.latest} from={weakness.history[0] ?? 0} height={7} />
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  {weakness.delta > 0 ? `Improved ${weakness.delta} points since the previous test` : weakness.delta < 0 ? `Dropped ${Math.abs(weakness.delta)} points since the previous test` : 'Holding steady since the previous test'}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Badges</h2>
              <Chip className="text-lime-300">
                <Trophy size={12} /> {state.user.badges.length}/{BADGES.length}
              </Chip>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {BADGES.map((badge) => {
                const owned = earned.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    title={badge.description}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition',
                      owned ? 'border-lime-400/35 bg-lime-400/[0.08]' : 'border-[rgb(var(--line)/0.1)] opacity-45',
                    )}
                  >
                    <span className="text-2xl">{badge.emoji}</span>
                    <span className="text-[10px] font-semibold leading-tight text-strong">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Training volume</h2>
            <div className="mt-3 space-y-3">
              {sports.map((row) => (
                <div key={row.sport} className="flex items-center justify-between gap-3 text-sm">
                  <span className="capitalize text-muted">{row.sport}</span>
                  <span className="font-mono text-xs text-strong">
                    {row.analyses} analyses · {row.minutes} min
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">Drills completed</span>
                <span className="font-mono text-xs text-strong">{drillsCompleted(state)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">Sessions logged</span>
                <span className="font-mono text-xs text-strong">{state.sessions.length}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {state.sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center gap-3 rounded-xl border border-[rgb(var(--line)/0.1)] p-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-flame-500/15 text-flame-400">
                    <Flame size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-strong">{formatDate(session.completedAt)}</p>
                    <p className="text-[11px] text-muted">
                      {session.minutes} min · +{session.xp} XP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <InfoNote>
        <span className="font-semibold">Why the trend matters: </span>
        a single session can move a score by a few points either way. The AI weights your last three assessments
        when it sets difficulty, so one noisy clip never derails your plan.
      </InfoNote>
      </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* History / Reports / Analytics                                              */
/* ========================================================================== */

function ProgressTabContent({
  tab,
  analyses,
  sessions,
  analytics,
}: {
  tab: Exclude<ProgressTab, 'overview'>;
  analyses: VideoAnalysis[];
  sessions: SessionLog[];
  analytics: ProgressAnalytics;
}) {
  if (tab === 'history') return <HistoryTab analyses={analyses} sessions={sessions} />;
  if (tab === 'reports') return <ReportsTab analyses={analyses} />;
  return <AnalyticsTab analyses={analyses} sessions={sessions} analytics={analytics} />;
}

/* -------------------------------------------------------------------------- */
/* History — the complete chronological log                                    */
/* -------------------------------------------------------------------------- */

function HistoryTab({ analyses, sessions }: { analyses: VideoAnalysis[]; sessions: SessionLog[] }) {
  const events = [
    ...analyses.map((a) => ({
      kind: 'assessment' as const,
      id: a.id,
      date: a.createdAt,
      title: `${a.skillName} assessment`,
      detail: `${a.videoDurationSec}s clip · ${a.frameCount} frames analysed`,
      score: a.overall,
      to: `/report/${a.id}`,
    })),
    ...sessions.map((s) => ({
      kind: 'session' as const,
      id: s.id,
      date: s.completedAt,
      title: 'Training session',
      detail: `${s.minutes} min · +${s.xp} XP`,
      score: undefined as number | undefined,
      to: '/training',
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon size={20} />}
        title="Nothing logged yet"
        body="Your assessments and completed sessions will appear here in one timeline."
      />
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Complete history</h2>
          <p className="text-xs text-muted">Every assessment and session, newest first</p>
        </div>
        <Chip className="text-cyan-200">{events.length} entries</Chip>
      </div>
      <ol className="mt-5 space-y-2">
        {events.map((event) => (
          <li key={`${event.kind}:${event.id}`}>
            <Link
              to={event.to}
              className="group flex items-center gap-4 rounded-2xl border border-[rgb(var(--line)/0.1)] p-3.5 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
            >
              <div className="flex w-14 shrink-0 flex-col items-center">
                <span className="text-xs font-bold text-strong">{formatDate(event.date)}</span>
                <span className="text-[10px] text-muted">{formatTime(event.date)}</span>
              </div>
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                  event.kind === 'assessment' ? 'bg-cyan-500/15 text-cyan-300' : 'bg-flame-500/15 text-flame-400',
                )}
              >
                {event.kind === 'assessment' ? <ClipboardList size={16} /> : <Flame size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-strong">{event.title}</p>
                <p className="truncate text-[11px] text-muted">{event.detail}</p>
              </div>
              {event.kind === 'assessment' && event.score !== undefined && (
                <span className={cn('font-display text-lg font-bold tabular-nums', BAND_TEXT[scoreBand(event.score)])}>{event.score}</span>
              )}
              <ChevronRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-cyan-300" />
            </Link>
          </li>
        ))}
      </ol>
      {indexNote(analyses.length, sessions.length)}
    </Card>
  );
}

function indexNote(_analyses: number, _sessions: number) {
  return null;
}

/* -------------------------------------------------------------------------- */
/* Reports — every assessment as a report card                                 */
/* -------------------------------------------------------------------------- */

function ReportsTab({ analyses }: { analyses: VideoAnalysis[] }) {
  if (analyses.length === 0) {
    return (
      <EmptyState
        icon={<FileBarChart size={20} />}
        title="No reports yet"
        body="Each assessment generates a full report — scores, weaknesses and your personalised plan."
      />
    );
  }

  return (
    <div className="space-y-3">
      {analyses.map((a) => {
        const previous = analyses.filter((p) => p.skill === a.skill && p.createdAt < a.createdAt).sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))[0];
        const delta = previous ? a.overall - previous.overall : 0;
        return (
          <Link
            key={a.id}
            to={`/report/${a.id}`}
            className="group block rounded-2xl border border-[rgb(var(--line)/0.12)] p-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]"
          >
            <div className="flex flex-wrap items-center gap-4">
              <ProgressRing value={a.overall} size={72} stroke={7} animateFrom={previous?.overall ?? 0} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold text-strong">{a.skillName} report</h3>
                  <Chip className={BAND_CHIP[scoreBand(a.overall)]}>{a.difficultyEstimate}</Chip>
                  {delta !== 0 && (
                    <span className={cn('font-mono text-xs font-semibold', delta > 0 ? 'text-lime-300' : 'text-amber-300')}>
                      {delta > 0 ? '+' : ''}{delta} vs previous
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  {formatDate(a.createdAt, { weekday: 'short', month: 'short', day: 'numeric' })} · {formatTime(a.createdAt)} · {a.videoName}
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted">{a.headline}</p>
              </div>
              <div className="hidden shrink-0 items-center gap-1 text-xs text-cyan-300 sm:flex">
                Open report <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Analytics — tracking analytics & personal records                           */
/* -------------------------------------------------------------------------- */

function AnalyticsTab({
  analyses,
  sessions,
  analytics,
}: {
  analyses: VideoAnalysis[];
  sessions: SessionLog[];
  analytics: ProgressAnalytics;
}) {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const records = [
    {
      icon: <Trophy size={16} className="text-amber-300" />,
      label: 'Best assessment ever',
      value: analytics.bestEver ? `${analytics.bestEver.overall}/100` : '—',
      hint: analytics.bestEver ? `${analytics.bestEver.skillName} · ${relativeDay(analytics.bestEver.createdAt)}` : 'Record your first clip',
    },
    {
      icon: <Medal size={16} className="text-lime-300" />,
      label: 'Biggest single jump',
      value: analytics.biggestJump.delta > 0 ? `+${analytics.biggestJump.delta} pts` : '—',
      hint: analytics.biggestJump.analysis ? `${analytics.biggestJump.analysis.skillName} · ${relativeDay(analytics.biggestJump.analysis.createdAt)}` : 'Re-test to set a record',
    },
    {
      icon: <Clock size={16} className="text-cyan-300" />,
      label: 'Longest session',
      value: analytics.longestSession ? `${analytics.longestSession.minutes} min` : '—',
      hint: analytics.longestSession ? relativeDay(analytics.longestSession.completedAt) : 'Complete a workout to log one',
    },
    {
      icon: <Flame size={16} className="text-flame-400" />,
      label: 'Total training time',
      value: `${totalMinutes} min`,
      hint: `${analyses.length} assessments · ${sessions.length} sessions`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {records.map((record) => (
          <StatTile key={record.label} icon={record.icon} label={record.label} value={record.value} hint={record.hint} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-bold">Weekly activity</h2>
          <p className="text-xs text-muted">Assessments + completed sessions, last 8 weeks</p>
          <div className="mt-5 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.weeks} margin={{ top: 8, right: 10, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="count" name="activities" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold">Minutes trained per week</h2>
          <p className="text-xs text-muted">Volume is what turns drills into lasting technique</p>
          <div className="mt-5 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.weeks} margin={{ top: 8, right: 10, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="analytics-minutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a3e635" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--text-muted))' }} axisLine={false} tickLine={false} />
                <Tooltip {...CHART_TOOLTIP} />
                <Area type="monotone" dataKey="minutes" name="minutes" stroke="#a3e635" strokeWidth={2.4} fill="url(#analytics-minutes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-bold">Per-skill tracking</h2>
        <p className="text-xs text-muted">First → latest assessment for every skill you have tracked</p>
        <div className="mt-4 space-y-4">
          {analytics.bySkill.map(([skill, row]) => (
            <div key={skill} className="rounded-2xl border border-[rgb(var(--line)/0.1)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-strong">{row.name}</span>
                <span className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-muted">{row.first}</span>
                  <ArrowRight size={11} className="text-muted" />
                  <span className={cn('font-display text-base font-bold tabular-nums', BAND_TEXT[scoreBand(row.latest)])}>{row.latest}</span>
                  <span className="text-muted">· best {row.best}</span>
                </span>
              </div>
              <div className="mt-2.5">
                <MeterBar value={row.latest} from={row.first} height={7} />
              </div>
              <p className="mt-1.5 text-[11px] text-muted">{row.count} assessments · last tested {relativeDay(row.lastDate)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
