import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, Gamepad2, Sparkles } from 'lucide-react';
import { SPORTS } from '@/data/sports';
import { Card, Chip, SectionTitle } from '@/components/ui/primitives';
import { useApp } from '@/store/AppStore';
import { latestAnalysis } from '@/store/selectors';
import { relativeDay } from '@/lib/format';

export function SelectSport() {
  const navigate = useNavigate();
  const { state } = useApp();
  const recent = latestAnalysis(state);

  return (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Step 1 of 3 · Choose your sport"
        title="What are we analysing today?"
        subtitle="Pick a sport and PocketCoach AI loads the right movement model, joint rules and drill library for it."
        right={
          <Link to="/demo" className="btn-soft">
            <Gamepad2 size={16} /> Hackathon Demo Mode
          </Link>
        }
      />

      {recent && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/[0.12] text-xl">🔁</span>
            <div>
              <p className="text-sm font-semibold text-strong">
                Last analysis: {recent.skillName} · {recent.overall}/100
              </p>
              <p className="text-xs text-muted">
                {relativeDay(recent.createdAt)} · {recent.weaknesses[0]?.title ?? 'no weaknesses flagged'} is your top priority
              </p>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={() => navigate(`/analyze/${recent.sport}/${recent.skill}`)}>
            Re-test this skill <ArrowRight size={16} />
          </button>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {SPORTS.map((sport) => {
          const analysed = state.analyses.filter((a) => a.sport === sport.id).length;
          return (
            <Card key={sport.id} className="group flex flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
              <div className={`inline-flex w-fit items-center gap-2 rounded-2xl bg-gradient-to-br ${sport.accent} p-0.5`}>
                <span className="grid h-14 w-14 place-items-center rounded-[15px] bg-[rgb(var(--surface))] text-3xl">{sport.emoji}</span>
              </div>
              <h3 className="mt-4 text-2xl font-bold">{sport.name}</h3>
              <p className="mt-1 text-sm text-muted">{sport.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Chip className="text-cyan-200">
                  <Sparkles size={12} /> {sport.skills.length} skills
                </Chip>
                <Chip className="text-lime-300">
                  <Clock3 size={12} /> 15 min sessions
                </Chip>
                {analysed > 0 && <Chip className="text-amber-300">{analysed} analyses</Chip>}
              </div>

              <ul className="mt-4 space-y-1.5 text-sm text-muted">
                {sport.skills.map((skill) => (
                  <li key={skill.id} className="flex items-center gap-2">
                    <span>{skill.emoji}</span> {skill.name}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => navigate(`/analyze/${sport.id}`)}
                className="btn-primary mt-5 w-full"
              >
                Analyze Skill <ArrowRight size={16} />
              </button>
            </Card>
          );
        })}
      </div>

      <Card soft className="p-4 text-sm text-muted">
        <span className="font-semibold text-strong">Adding a new sport?</span> Skills, signals and drills live in one
        rulebook file, so a new sport is a data change — the analysis engine, overlay and workout planner all pick it up
        automatically.
      </Card>
    </div>
  );
}
