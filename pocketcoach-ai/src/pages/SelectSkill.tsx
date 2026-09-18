import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Info } from 'lucide-react';
import { getSport } from '@/data/sports';
import { Card, EmptyState, SectionTitle } from '@/components/ui/primitives';
import { BAND_CHIP, BAND_TEXT, scoreBand } from '@/lib/format';
import { useApp } from '@/store/AppStore';
import { latestAnalysis } from '@/store/selectors';

export function SelectSkill() {
  const { sportId = '' } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const sport = getSport(sportId);

  if (!sport) {
    return (
      <EmptyState
        icon={<Info size={20} />}
        title="Sport not found"
        body="That sport is not in the rulebook yet."
        action={
          <Link to="/analyze" className="btn-primary">
            Back to sports
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-7">
      <Link to="/analyze" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-strong">
        <ArrowLeft size={15} /> All sports
      </Link>

      <SectionTitle
        eyebrow={`Step 2 of 3 · ${sport.name}`}
        title={`Choose a ${sport.name} skill`}
        subtitle={sport.description}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {sport.skills.map((skill) => {
          const previous = latestAnalysis(state, skill.id);
          const band = scoreBand(previous?.overall ?? 70);
          return (
            <Card key={skill.id} className="flex flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-2xl">{skill.emoji}</span>
                  <div>
                    <h3 className="text-xl font-bold">{skill.name}</h3>
                    <p className="text-xs text-muted">{skill.tagline}</p>
                  </div>
                </div>
                {previous && (
                  <span className={`chip ${BAND_CHIP[band]} shrink-0`}>
                    <span className="tabular-nums">{previous.overall}</span>
                  </span>
                )}
              </div>

              <p className="mt-3.5 text-sm text-muted">
                <span className="font-semibold text-strong">Focus: </span>
                {skill.focus}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {skill.signals.slice(0, 4).map((signal) => (
                  <span key={signal.key} className="chip !px-2.5 !py-0.5 text-[11px] text-muted">
                    {signal.label}
                  </span>
                ))}
                {skill.signals.length > 4 && (
                  <span className="chip !px-2.5 !py-0.5 text-[11px] text-muted">+{skill.signals.length - 4} more</span>
                )}
              </div>

              <div className="glass-soft mt-4 flex items-start gap-2.5 p-3">
                <Camera size={15} className="mt-0.5 shrink-0 text-cyan-300" />
                <p className="text-xs text-muted">{skill.cameraTip}</p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <span className={`text-xs font-semibold ${BAND_TEXT[band]}`}>
                  {previous ? `Last scored ${previous.overall}/100` : 'No baseline yet'}
                </span>
                <button type="button" className="btn-primary" onClick={() => navigate(`/analyze/${sport.id}/${skill.id}`)}>
                  Select <ArrowRight size={15} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card soft className="p-4">
        <p className="text-sm text-muted">
          <span className="font-semibold text-strong">Recording for {sport.name}? </span>
          Use the same camera position for every re-test — the AI compares your movement against your own baseline, so
          consistent framing gives the sharpest improvement readout.
        </p>
      </Card>
    </div>
  );
}
