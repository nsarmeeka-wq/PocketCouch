import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CornerDownLeft, Sparkles, TrendingUp, User, Zap } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { analysesForSkill, latestAnalysis, latestWorkout, weekStats, weaknessSummaries } from '@/store/selectors';
import { getSkill } from '@/data/sports';
import { answerCoach, COACH_QUICK_PROMPTS, type CoachContext } from '@/lib/recommendation/coach';
import { Card, Chip, InfoNote } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { relativeDay } from '@/lib/format';
import type { CoachMessage } from '@/lib/types';

export function Coach() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const analysis = latestAnalysis(state);
  const skill = analysis ? getSkill(analysis.skill) : undefined;
  const workout = latestWorkout(state, analysis?.skill);
  const week = weekStats(state, analysis?.skill);
  const weaknesses = weaknessSummaries(state, analysis?.skill);
  const history = analysis ? analysesForSkill(state, analysis.skill) : [];

  const context: CoachContext = useMemo(
    () => ({
      name: state.user.name,
      xp: state.user.xp,
      streak: state.user.streak,
      difficultyLevel: workout?.difficultyLevel ?? 3,
      latest: analysis,
      previous: history[1],
      weaknesses,
      workouts: state.workouts,
      sessionsThisWeek: week.sessions,
      minutesThisWeek: week.minutes,
      skill,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.user.xp, state.user.streak, analysis?.id, workout?.id, week.sessions, weaknesses.length, skill?.id],
  );

  // open with a briefing the first time
  useEffect(() => {
    if (state.messages.length === 0) {
      const reply = answerCoach('hello', context);
      dispatch({
        type: 'add-message',
        message: { id: `m-${Date.now()}`, role: 'coach', text: reply.text, createdAt: new Date().toISOString(), chips: reply.chips, metrics: reply.metrics },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length, thinking]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setInput('');
    dispatch({
      type: 'add-message',
      message: { id: `m-${Date.now()}`, role: 'athlete', text: trimmed, createdAt: new Date().toISOString() },
    });
    setThinking(true);
    await new Promise((resolve) => setTimeout(resolve, 620));
    const reply = answerCoach(trimmed, context);
    dispatch({
      type: 'add-message',
      message: {
        id: `m-${Date.now()}-c`,
        role: 'coach',
        text: reply.text,
        createdAt: new Date().toISOString(),
        chips: reply.chips,
        metrics: reply.metrics,
      },
    });
    setThinking(false);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <Card className="flex h-[calc(100vh-190px)] min-h-[520px] flex-col p-0">
        <div className="flex items-center gap-3 border-b border-[rgb(var(--line)/0.08)] p-4">
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-lime-400/20 text-cyan-200">
            <Bot size={20} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[rgb(var(--surface))] bg-lime-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-strong">AI Coach</p>
            <p className="truncate text-xs text-muted">
              {analysis
                ? `Reading ${analysis.skillName} (${analysis.overall}/100 · ${relativeDay(analysis.createdAt)}) plus your full history`
                : 'Waiting for your first analysis'}
            </p>
          </div>
          <Chip className="hidden text-lime-300 sm:inline-flex">
            <Zap size={12} /> Data-aware
          </Chip>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {state.messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-400/[0.12] text-cyan-300">
                <Bot size={15} />
              </span>
              <span className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300"
                    style={{ animationDelay: `${dot * 120}ms` }}
                  />
                ))}
              </span>
              <span>reading your analysis…</span>
            </div>
          )}
        </div>

        <div className="border-t border-[rgb(var(--line)/0.08)] p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void send(input);
              }}
              className="field"
              placeholder="Ask your coach anything…"
              aria-label="Message the AI coach"
            />
            <button type="button" className="btn-primary shrink-0" onClick={() => void send(input)} disabled={thinking || !input.trim()}>
              <CornerDownLeft size={16} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {COACH_QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="chip text-muted transition hover:border-cyan-400/40 hover:text-strong"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-cyan-300" />
            <h2 className="text-lg font-bold">What the coach can see</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {analysis ? (
              <>
                <Row label="Latest analysis" value={`${analysis.skillName} ${analysis.overall}/100`} />
                <Row label="Previous" value={history[1] ? `${history[1].overall}/100 (${relativeDay(history[1].createdAt)})` : 'none'} />
                <Row label="Weaknesses tracked" value={`${weaknesses.length}`} />
                <Row label="This week" value={`${week.sessions} sessions · ${week.minutes} min`} />
                <Row label="Streak / XP" value={`${state.user.streak} days · ${state.user.xp.toLocaleString()} XP`} />
                <Row label="Adaptive difficulty" value={`Level ${workout?.difficultyLevel ?? 3}`} />
              </>
            ) : (
              <p className="text-muted">No data yet — analyse a skill and the coach will start reasoning about your movement.</p>
            )}
          </div>
          {analysis && (
            <Link to="/analyze" className="btn-ghost mt-4 w-full">
              <Sparkles size={15} /> Record a new test
            </Link>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-bold">Coaching principles</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-muted">
            <li className="flex gap-2">
              <span className="text-cyan-300">•</span> Answers are generated from your own scores, history and training
              volume — never generic advice.
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-300">•</span> The coach will always lead with your lowest scoring, highest weight
              signal first.
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-300">•</span> Ask for an easier or harder session and it will adjust the adaptive
              difficulty ladder for you.
            </li>
          </ul>
        </Card>

        {analysis && analysis.weaknesses[0] && (
          <InfoNote tone="lime">
            <span className="font-semibold">Next intervention: </span>
            {analysis.weaknesses[0].correction}
          </InfoNote>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--line)/0.08)] pb-2 last:border-none">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-strong">{value}</span>
    </div>
  );
}

function ChatBubble({ message }: { message: CoachMessage }) {
  const isCoach = message.role === 'coach';
  return (
    <div className={cn('flex gap-3', isCoach ? 'justify-start' : 'justify-end')}>
      {isCoach && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-400/[0.12] text-cyan-300">
          <Bot size={15} />
        </span>
      )}
      <div className={cn('max-w-[86%] rounded-2xl px-4 py-3', isCoach ? 'glass-soft' : 'bg-gradient-to-br from-cyan-400/25 to-lime-400/15')}>
        <p className="whitespace-pre-line text-sm leading-relaxed text-strong">{message.text}</p>

        {message.metrics && message.metrics.length > 0 && (
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {message.metrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-[11px]">
                <span className="truncate text-muted">{metric.label}</span>
                <span className="font-mono text-cyan-200">{metric.value}</span>
              </div>
            ))}
          </div>
        )}

        {message.chips && message.chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.chips.map((chip) => (
              <span key={chip} className="chip !px-2.5 !py-0.5 text-[10px] text-muted">
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
      {!isCoach && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/5 text-muted">
          <User size={15} />
        </span>
      )}
    </div>
  );
}
