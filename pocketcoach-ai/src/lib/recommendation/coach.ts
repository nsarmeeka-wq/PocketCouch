/**
 * AI Coach.
 *
 * A retrieval-style coach: every answer is generated from the athlete's own
 * analyses, weaknesses, workouts and progress rather than from canned copy.
 * The intent matcher is intentionally simple and swappable — the interface
 * (`answerCoach(input) -> CoachReply`) is what the UI depends on, so a hosted
 * LLM can be dropped in behind it later.
 */
import type { SkillDefinition, VideoAnalysis, WeaknessSummary, Workout } from '@/lib/types';
import { levelFromXp } from '@/lib/gamification';

export interface CoachContext {
  name: string;
  xp: number;
  streak: number;
  difficultyLevel: number;
  latest?: VideoAnalysis;
  previous?: VideoAnalysis;
  weaknesses: WeaknessSummary[];
  workouts: Workout[];
  sessionsThisWeek: number;
  minutesThisWeek: number;
  skill?: SkillDefinition;
}

export interface CoachReply {
  text: string;
  chips: string[];
  metrics: { label: string; value: string }[];
}

export const COACH_QUICK_PROMPTS = [
  'Why is my score low?',
  'How do I improve my balance?',
  'Give me an easier drill.',
  "Make today's workout harder.",
  'How am I progressing?',
  'What should I do today?',
];

const SIGNAL_ALIASES: Record<string, string[]> = {
  elbowAlignment: ['elbow', 'shooting arm', 'release line', 'arm'],
  followThrough: ['follow through', 'follow-through', 'finish', 'hold'],
  kneeBend: ['knee bend', 'knees', 'dip', 'knee angle'],
  balance: ['balance', 'stability', 'wobble', 'sway'],
  jumpConsistency: ['consistency', 'jump height', 'repeat'],
  consistency: ['consistency', 'repeat'],
  posture: ['posture', 'stance', 'lean'],
  handControl: ['hand', 'handle', 'dribble'],
  depth: ['depth', 'deep'],
  kneeTracking: ['knee track', 'valgus', 'cave'],
  bodyLine: ['body line', 'plank', 'spine'],
  legDrive: ['drive', 'explosive', 'power', 'jump'],
  footOrientation: ['foot', 'toe', 'feet'],
  hipRotation: ['hip', 'rotation'],
  plantFoot: ['plant', 'planted foot'],
  rangeOfMotion: ['range', 'motion'],
  shoulderSquareness: ['shoulder', 'square'],
};

function findWeakness(ctx: CoachContext, question: string): WeaknessSummary | undefined {
  const q = question.toLowerCase();
  const matchedKey = Object.entries(SIGNAL_ALIASES).find(([, aliases]) => aliases.some((a) => q.includes(a)))?.[0];
  if (matchedKey) {
    const direct = ctx.weaknesses.find((w) => w.signalKey === matchedKey || w.label.toLowerCase().includes(matchedKey.toLowerCase()));
    if (direct) return direct;
  }
  return ctx.weaknesses.find((w) => q.includes(w.label.toLowerCase())) ?? ctx.weaknesses[0];
}

function fmt(n: number): string {
  return `${Math.round(n)}`;
}

function trendLine(ctx: CoachContext): string {
  if (!ctx.latest) return 'You have not recorded an analysis yet, so I am working from your profile only.';
  if (!ctx.previous) return `Your baseline is ${ctx.latest.overall}/100 for ${ctx.latest.skillName.toLowerCase()}.`;
  const delta = ctx.latest.overall - ctx.previous.overall;
  if (delta > 0) return `Your overall ${ctx.latest.skillName.toLowerCase()} score moved ${ctx.previous.overall} → ${ctx.latest.overall} (+${delta}).`;
  if (delta < 0) return `Your overall score dipped ${ctx.previous.overall} → ${ctx.latest.overall} (${delta}). One noisy session is normal — the trend over weeks is what matters.`;
  return `Your overall score is holding at ${ctx.latest.overall}/100.`;
}

export function answerCoach(question: string, ctx: CoachContext): CoachReply {
  const q = question.toLowerCase().trim();
  const { current } = levelFromXp(ctx.xp);
  const weakness = findWeakness(ctx, question);
  const latest = ctx.latest;

  const intro = (body: string, chips: string[] = [], metrics: { label: string; value: string }[] = []): CoachReply => ({
    text: body,
    chips,
    metrics,
  });

  /* ---- why is my score low ---- */
  if (/(why|how come).*(score|low|bad|weak)|lowest|biggest (problem|weakness)/.test(q) || q.includes('why is my score')) {
    if (!latest || !weakness) {
      return intro(
        'I need one 30-second clip before I can grade you. Record your movement and I will break down exactly which joints are costing you points.',
        ['Record a 30-second clip', 'What should I do today?'],
      );
    }
    const lines = latest.weaknesses
      .slice(0, 3)
      .map((w, i) => `${i + 1}. ${w.title} — ${w.score}/100. ${w.issue}`)
      .join('\n');
    return intro(
      `${latest.skillName} scored ${latest.overall}/100. Three things pulled it down:\n\n${lines}\n\nStart with ${latest.weaknesses[0].title.toLowerCase()}: ${latest.weaknesses[0].correction} ${trendLine(ctx)}`,
      ['Build me a workout for that', 'How am I progressing?'],
      latest.metrics.slice(0, 5).map((m) => ({ label: m.label, value: `${m.score}` })),
    );
  }

  /* ---- how do I improve X ---- */
  if (/(how|what).*(improve|fix|better|work on)|help.*(with|my)/.test(q) || q.includes('improve')) {
    if (!weakness) {
      return intro('Record a clip first and I will give you a drill-by-drill plan for the exact joint that needs work.');
    }
    const related = ctx.skill?.signals.find((s) => s.key === weakness.signalKey);
    const history = weakness.history.length > 1 ? ` Your history here: ${weakness.history.map(fmt).join(' → ')}.` : '';
    return intro(
      `${weakness.label} is currently ${weakness.latest}/100 (${weakness.severity}).\n\nWhat the clip showed: ${latest?.weaknesses.find((w) => w.signalKey === weakness.signalKey)?.issue ?? 'a movement fault in this phase'}.\n\nHow to fix it: ${related?.correction ?? 'Slow the movement down and rehearse the correct position in isolation before adding speed again.'}${history}\n\nRun the session I generated — it puts ${weakness.label.toLowerCase()} first while your legs are fresh.`,
      ['Give me an easier drill.', 'Make today\'s workout harder.', 'Why is my score low?'],
      [
        { label: weakness.label, value: `${weakness.latest}` },
        { label: 'Change', value: `${weakness.delta >= 0 ? '+' : ''}${weakness.delta}` },
      ],
    );
  }

  /* ---- easier ---- */
  if (/(easier|too hard|struggling|simpler|scale (it )?down|beginner)/.test(q)) {
    const easier = ctx.workouts[0]?.difficultyLevel ?? ctx.difficultyLevel;
    return intro(
      `Understood — I will drop you to level ${Math.max(easier - 1, 1)} and rebuild the session with slower tempos and more repetitions per drill.\n\nSame weaknesses, lower load: you keep the correction work but the athletic demand drops. Tell me when a session feels comfortable and I will step it back up.`,
      ['Start my session', 'How am I progressing?'],
      [
        { label: 'New difficulty', value: `Level ${Math.max(easier - 1, 1)}` },
        { label: 'Volume', value: '+20% reps' },
      ],
    );
  }

  /* ---- harder ---- */
  if (/(harder|hard|hardest|challenge|push me|more intense|advanced)/.test(q)) {
    const level = ctx.workouts[0]?.difficultyLevel ?? ctx.difficultyLevel;
    const topScore = latest ? Math.max(...latest.metrics.map((m) => m.score)) : 0;
    return intro(
      `Pushing you to level ${Math.min(level + 1, 6)}. I will keep the corrective drills but shorten the rest windows and add time/accuracy targets.\n\n${topScore >= 80 ? `Your strongest metric is already ${topScore}/100, so you can absorb more intensity without breaking the technique.` : 'Because your technique scores are still building, the extra difficulty comes from tempo rather than heavier or faster movement.'}`,
      ['Start my session', 'Give me an easier drill.'],
      [
        { label: 'New difficulty', value: `Level ${Math.min(level + 1, 6)}` },
        { label: 'Rest', value: '-25%' },
      ],
    );
  }

  /* ---- progress ---- */
  if (/(progress|improving|improvement|getting better|trend|history|am i)/.test(q)) {
    const improved = ctx.weaknesses.filter((w) => w.delta > 0);
    const stalled = ctx.weaknesses.filter((w) => w.delta <= 0);
    return intro(
      `${trendLine(ctx)} You have logged ${ctx.sessionsThisWeek} session${ctx.sessionsThisWeek === 1 ? '' : 's'} and ${Math.round(ctx.minutesThisWeek)} minutes this week, at a 🔥 ${ctx.streak}-day streak and ${current.title} level.\n\n${improved.length ? `Improving: ${improved.map((w) => `${w.label} ${w.history.map(fmt).join(' → ')}`).join('; ')}.` : 'No metric has moved yet — that usually means the correction drills need another two or three sessions.'}${stalled.length && improved.length ? `\n\nStill lagging: ${stalled.map((w) => w.label).join(', ')}. These get priority in your next session.` : ''}`,
      ['What should I do today?', 'Why is my score low?'],
      ctx.weaknesses.slice(0, 4).map((w) => ({ label: w.label, value: `${w.latest} (${w.delta >= 0 ? '+' : ''}${w.delta})` })),
    );
  }

  /* ---- what should I do today ---- */
  if (/(today|next|what should|plan|session|workout)/.test(q)) {
    const workout = ctx.workouts[0];
    if (!workout) {
      return intro(
        'Record a 30-second clip of your skill and I will build today\'s 15-minute session around whatever the analysis flags.',
        ['Record a 30-second clip'],
      );
    }
    const top = workout.drills[0];
    return intro(
      `Today is a ${workout.totalMinutes}-minute ${workout.difficulty} session (adaptive level ${workout.difficultyLevel}).\n\nIt starts with ${top.name} for ${top.durationMin} minutes — ${top.reason}\n\n${workout.generatedReason}`,
      ['Start my session', 'Make today\'s workout harder.', 'How am I progressing?'],
      workout.drills.slice(0, 5).map((d) => ({ label: d.name, value: `${d.durationMin} min` })),
    );
  }

  /* ---- fallback: full briefing ---- */
  if (!latest) {
    return intro(
      `Hi ${ctx.name} — I'm your PocketCoach. Record a 30-second clip of any skill and I will score your technique, name your biggest weakness and build a 15-minute session around it.`,
      ['Record a 30-second clip', 'How am I progressing?'],
    );
  }
  const best = [...latest.metrics].sort((a, b) => b.score - a.score)[0];
  return intro(
    `${trendLine(ctx)} Strongest area: ${best.label} at ${best.score}/100. Biggest opportunity: ${latest.weaknesses[0]?.title ?? 'nothing major flagged'}.\n\nAsk me things like "why is my score low?", "how do I improve my balance?" or "make today's workout harder" and I will answer using your own numbers.`,
    COACH_QUICK_PROMPTS.slice(0, 3),
    latest.metrics.map((m) => ({ label: m.label, value: `${m.score}` })),
  );
}

/** Message posted automatically after a re-test so the improvement is explained. */
export function postAssessmentMessage(ctx: CoachContext, improved: { label: string; before: number; after: number }[], overall: { before: number; after: number }): CoachReply {
  const biggest = improved[0];
  const delta = overall.after - overall.before;
  if (!biggest) {
    return {
      text: `Re-test complete — overall ${overall.before} → ${overall.after}. The numbers held steady, which means the correction is being absorbed. Tomorrow we add tempo rather than new faults.`,
      chips: ['What should I do today?', 'Make today\'s workout harder.'],
      metrics: [{ label: 'Overall', value: `${overall.before} → ${overall.after}` }],
    };
  }
  return {
    text: `Nice improvement! ${biggest.label} moved ${biggest.before} → ${biggest.after}, and your overall score is ${overall.before} → ${overall.after} (${delta >= 0 ? '+' : ''}${delta}).${improved[1] ? ` ${improved[1].label} also improved by ${improved[1].after - improved[1].before}.` : ''}\n\n${ctx.weaknesses[0] ? `${ctx.weaknesses[0].label} is still your biggest opportunity at ${ctx.weaknesses[0].latest}/100. Tomorrow's session will load it earlier while you are fresh.` : 'You have no significant weaknesses flagged — tomorrow pushes intensity instead.'}`,
    chips: ['How am I progressing?', 'What should I do today?'],
    metrics: improved.slice(0, 4).map((row) => ({ label: row.label, value: `${row.before} → ${row.after}` })),
  };
}

export function sessionIntroMessage(workout: Workout): CoachReply {
  return {
    text: `Session loaded: ${workout.totalMinutes} minutes, ${workout.drills.length} blocks, adaptive level ${workout.difficultyLevel}. ${workout.generatedReason}`,
    chips: ['Start drill 1'],
    metrics: workout.drills.slice(0, 5).map((d) => ({ label: d.name, value: `${d.durationMin} min` })),
  };
}
