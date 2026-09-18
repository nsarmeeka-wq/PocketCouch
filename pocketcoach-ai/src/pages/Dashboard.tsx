import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Clock,
  Dumbbell,
  Flame,
  Gauge,
  PlayCircle,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useApp, useLevel } from '@/store/AppStore';
import {
  analysesForSkill,
  latestAnalysis,
  latestWorkout,
  overallTrend,
  weekStats,
  weaknessSummaries,
} from '@/store/selectors';
import { getSport } from '@/data/sports';
import { BAND_CHIP, BAND_TEXT, greeting, relativeDay, scoreBand } from '@/lib/format';
import { Card, Chip, EmptyState, InfoNote, StatTile } from '@/components/ui/primitives';
import { AnimatedNumber, MiniRing, ProgressRing } from '@/components/ui/AnimatedNumber';
import { ParticleField } from '@/components/visual/Background';
import { cn } from '@/lib/cn';

export function Dashboard() {
  const { state } = useApp();
  const level = useLevel();
  const analysis = latestAnalysis(state);
  const workout = latestWorkout(state);
  const weaknesses = weaknessSummaries(state).slice(0, 3);
  const week = weekStats(state);
  const trend = overallTrend(state);
  const sport = analysis ? getSport(analysis.sport) : undefined;
  const history = analysis ? analysesForSkill(state, analysis.skill) : [];
  const previous = history[1];
  const top = analysis?.weaknesses[0];

  if (!analysis) {
    return (
      <EmptyState
        icon={<Target size={20} />}
        title="Let's find your weakness"
        body="Record a 30-second clip of any skill and PocketCoach AI will score your technique and build your first adaptive session."
        action={
          <Link to="/analyze" className="btn-primary">
            Analyze my skill
          </Link>
        }
      />
    );
  }

  const band = scoreBand(analysis.overall);

  return (
    <div className="relative space-y-6">
      <ParticleField count={14} className="opacity-50" />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-[34px]">
            {greeting()}, {state.user.name} 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {sport?.emoji} {analysis.skillName} · last analysed {relativeDay(analysis.createdAt)} · 🔥 {state.user.streak} day streak
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip className="text-lime-300">
            <Trophy size={12} /> Level {level.current.level} — {level.current.title}
          </Chip>
          <Chip className="text-cyan-300">
            <Gauge size={12} /> Adaptive difficulty {workout?.difficultyLevel ?? 3}
          </Chip>
        </div>
      </div>

      <div className="relative grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* today's goal + recommendation */}
        <div className="space-y-5">
          <Card className="relative overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(163,230,53,0.16),transparent_55%)]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-300">Today's goal</p>
              <h2 className="mt-2 text-2xl font-bold">
                🎯 Fix your {top ? top.title.toLowerCase() : 'movement quality'}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                {top ? `${top.issue} ${top.correction}` : 'No weaknesses flagged — today we push intensity instead of correction.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="glass-soft flex items-center gap-3 p-3">
                  <span className="font-display text-3xl font-bold text-strong">15</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Minutes</p>
                    <p className="text-sm text-cyan-200">AI adaptive session</p>
                  </div>
                </div>
                {workout ? (
                  <Link to={`/training/${workout.id}`} className="btn-primary !px-5 !py-3">
                    <PlayCircle size={17} /> Start Training
                  </Link>
                ) : (
                  <Link to={`/report/${analysis.id}`} className="btn-primary !px-5 !py-3">
                    <Sparkles size={17} /> Build my session
                  </Link>
                )}
                <Link to="/coach" className="btn-ghost">
                  <Bot size={16} /> Ask the AI Coach
                </Link>
              </div>

              {workout && (
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Awaiting you today</p>
                  {workout.drills.slice(0, 5).map((drill, index) => (
                    <div key={`${drill.drillId}-${index}`} className="flex items-center gap-3 text-sm">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/5 text-[11px] font-bold text-cyan-200">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate text-muted">{drill.name}</span>
                      <span className="font-mono text-[11px] text-muted">{drill.durationMin}m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={<Flame size={17} />} label="Streak" value={`${state.user.streak} days`} hint="🔥 keep it alive" accent="text-flame-400" />
            <StatTile icon={<Star size={17} />} label="XP" value={state.user.xp.toLocaleString()} hint={`${level.xpForNext - level.xpIntoLevel} to next level`} />
            <StatTile icon={<Trophy size={17} />} label="Level" value={`Lv ${level.current.level}`} hint={level.current.title} accent="text-lime-300" />
            <StatTile
              icon={<TrendingUp size={17} />}
              label="Improvement"
              value={`${week.improvementPercent >= 0 ? '+' : ''}${week.improvementPercent}%`}
              hint="since first analysis"
              accent="text-emerald-300"
            />
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Overall progress</h3>
                <p className="text-xs text-muted">{trend.length} assessments recorded</p>
              </div>
              <Link to="/progress" className="btn-ghost !px-3 !py-1.5 text-xs">
                Full dashboard <ArrowRight size={13} />
              </Link>
            </div>
            <div className="mt-4 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: 'rgba(8,11,20,0.92)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#a5f3fc' }}
                  />
                  <Area type="monotone" dataKey="overall" stroke="#22d3ee" strokeWidth={2.4} fill="url(#dash-area)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* right rail */}
        <div className="space-y-5">
          <Card className="flex flex-col items-center gap-4 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Latest score</p>
            <ProgressRing value={analysis.overall} size={168} stroke={13} label={analysis.headline} />
            <div className="flex flex-wrap justify-center gap-2">
              <Chip className={BAND_CHIP[band]}>{analysis.skillName}</Chip>
              {previous && (
                <Chip className={analysis.overall >= previous.overall ? 'text-lime-300' : 'text-amber-300'}>
                  {previous.overall} → {analysis.overall}
                </Chip>
              )}
            </div>
            <Link to={`/report/${analysis.id}`} className="btn-ghost w-full">
              Open full report <ArrowRight size={15} />
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold">Continue improving</h3>
            <p className="text-xs text-muted">Your three biggest opportunities right now</p>
            <div className="mt-4 space-y-3">
              {weaknesses.map((weakness) => (
                <div key={weakness.signalKey} className="flex items-center gap-3">
                  <MiniRing value={weakness.latest} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-strong">{weakness.label}</p>
                    <p className="truncate text-[11px] text-muted">
                      {weakness.history.map((v) => Math.round(v)).join(' → ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-display text-lg font-bold tabular-nums', BAND_TEXT[scoreBand(weakness.latest)])}>{weakness.latest}</p>
                    <p className={cn('text-[11px] font-semibold', weakness.delta >= 0 ? 'text-lime-300' : 'text-amber-300')}>
                      {weakness.delta >= 0 ? '+' : ''}
                      {weakness.delta}
                    </p>
                  </div>
                </div>
              ))}
              {weaknesses.length === 0 && <p className="text-sm text-muted">No weaknesses flagged — everything is above target.</p>}
            </div>
            <Link to="/coach" className="btn-soft mt-4 w-full">
              <Bot size={15} /> Ask how to fix these
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-bold">This week</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { icon: <CalendarCheck size={15} />, label: 'Sessions', value: week.sessions },
                { icon: <Clock size={15} />, label: 'Training time', value: `${week.minutes} min` },
                { icon: <Star size={15} />, label: 'XP earned', value: week.xp },
                { icon: <TrendingUp size={15} />, label: 'Improvement', value: `+${week.improvementPercent}%` },
              ].map((row) => (
                <div key={row.label} className="glass-soft p-3">
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
                    {row.icon} {row.label}
                  </p>
                  <p className="mt-1 font-display text-xl font-bold text-strong">
                    {typeof row.value === 'number' ? <AnimatedNumber value={row.value} /> : row.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <InfoNote>
            <span className="flex items-center gap-2 font-semibold">
              <Dumbbell size={14} /> Why this session
            </span>
            <span className="mt-1 block">{workout?.generatedReason ?? 'Analyse a skill to generate your first adaptive session.'}</span>
          </InfoNote>
        </div>
      </div>
    </div>
  );
}
