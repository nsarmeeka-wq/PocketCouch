import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Camera,
  ChevronRight,
  Gamepad2,
  LayoutDashboard,
  LineChart,
  LogIn,
  PlayCircle,
  Sparkles,
  Target,
  Video,
} from 'lucide-react';
import { AthleteSilhouette, ParticleField } from '@/components/visual/Background';
import { BrandArtwork, LogoLockup } from '@/components/visual/Logo';
import { useAuth } from '@/store/AuthStore';
import { Card, Chip } from '@/components/ui/primitives';
import { ProgressRing } from '@/components/ui/AnimatedNumber';
import { SPORTS } from '@/data/sports';
import { DEMO_RESULT } from '@/data/sampleData';

const PIPELINE = [
  { label: 'Video', icon: Video },
  { label: 'Analysis', icon: Brain },
  { label: 'Weakness', icon: Target },
  { label: 'Adaptive drills', icon: Sparkles },
  { label: 'Train', icon: PlayCircle },
  { label: 'Re-test', icon: Camera },
  { label: 'Improvement', icon: BarChart3 },
];

const FEATURES = [
  { emoji: '🎥', title: 'AI Vision', body: 'Analyse your movement, joint angles and technique from a single 30-second clip.' },
  { emoji: '🧠', title: 'Adaptive Coaching', body: 'Training changes according to your weaknesses, trends and training volume.' },
  { emoji: '🎯', title: 'Personalised Drills', body: 'Every drill in your 15-minute session has a specific purpose and an explanation.' },
  { emoji: '📈', title: 'Track Progress', body: 'See measurable improvement with before/after re-tests and weakness history.' },
];

export function Landing() {
  const { status } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleField count={30} />

      <header className="relative z-20 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8">
        <LogoLockup />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          <a href="#how" className="transition hover:text-strong">How it works</a>
          <a href="#sports" className="transition hover:text-strong">Sports</a>
          <a href="#proof" className="transition hover:text-strong">Results</a>
        </nav>
        <div className="flex items-center gap-2">
          {status === 'authenticated' ? (
            <Link to="/dashboard" className="btn-ghost !px-3.5 !py-2 text-xs sm:text-sm">
              <LayoutDashboard size={15} /> Dashboard
            </Link>
          ) : (
            <Link to="/signin" className="btn-ghost !px-3.5 !py-2 text-xs sm:text-sm">
              <LogIn size={15} /> Sign in
            </Link>
          )}
          <Link to="/demo" className="btn-soft !px-3.5 !py-2 text-xs sm:text-sm">
            <Gamepad2 size={15} /> Demo Mode
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24">
        <div className="animate-fade-up">
          <Chip className="text-cyan-200">
            <Sparkles size={13} /> Your Game. Your Weaknesses. Your AI Coach.
          </Chip>

          <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[64px]">
            Train Smarter.
            <br />
            <span className="gradient-text">Improve Faster.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            AI-powered training that finds your weaknesses and builds a workout specifically for you. Record 30 seconds of
            your skill — PocketCoach AI measures your technique, names the exact fault and prescribes a 15-minute session
            that fixes it.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/analyze" className="btn-primary !px-5 !py-3 text-[15px]">
              Analyze My Skill <ArrowRight size={17} />
            </Link>
            <Link to="/dashboard" className="btn-ghost !px-5 !py-3 text-[15px]">
              Start Training
            </Link>
            <Link to="/demo" className="btn-soft !px-4 !py-3 text-[15px]">
              <Gamepad2 size={16} /> Try Demo
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> Works with your phone camera
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> No coach required
            </span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Your footage is never published
            </span>
          </div>
        </div>

        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="glass-card relative overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <Chip className="text-lime-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" /> Live technique tracking
              </Chip>
              <span className="text-xs text-muted">Jump shot · 30s clip</span>
            </div>
            <div className="relative mt-4 h-[290px] sm:h-[340px]">
              <AthleteSilhouette className="h-full w-full" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                // measured on the sample clip by the analysis engine
                { label: 'Body Alignment', value: '70' },
                { label: 'Balance', value: '70' },
                { label: 'Technique', value: '65' },
              ].map((metric, index) => (
                <div key={metric.label} className="glass-soft px-2 py-2.5">
                  <p className="font-display text-xl font-bold text-strong">{metric.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">{metric.label}</p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-500/20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-lime-400"
                      style={{ width: `${Number(metric.value)}%`, transitionDelay: `${index * 120}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card absolute -bottom-10 -left-4 hidden w-56 items-center gap-3 p-3.5 sm:flex">
            <ProgressRing value={DEMO_RESULT.baselineOverall} size={68} stroke={7} animateFrom={30} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Detected</p>
              <p className="text-sm font-semibold text-strong">Elbow drifting outward</p>
              <p className="text-[11px] text-muted">Fix queued for today</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="relative z-10 mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">The loop</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Video → Analysis → Weakness → <span className="gradient-text">Adaptive drills</span> → Re-test
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted sm:text-base">
            PocketCoach AI is not a workout library. It watches you, finds the problem, prescribes the fix and measures
            whether the fix worked.
          </p>
        </div>

        <div className="mt-9 flex snap-x gap-3 overflow-x-auto pb-2 no-scrollbar lg:grid lg:grid-cols-7 lg:gap-2 lg:overflow-visible">
          {PIPELINE.map((step, index) => (
            <div key={step.label} className="relative min-w-[150px] snap-start flex-1 lg:min-w-0">
              <div className="glass-soft flex h-full flex-col items-center gap-2 p-4 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/[0.12] text-cyan-300">
                  <step.icon size={18} />
                </span>
                <p className="text-sm font-semibold text-strong">{step.label}</p>
                <p className="text-[11px] text-muted">Step {index + 1}</p>
              </div>
              {index < PIPELINE.length - 1 && (
                <ChevronRight size={16} className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-cyan-300/50 lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="sports" className="relative z-10 mx-auto max-w-[1240px] px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Skills covered</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Twelve skills. Three sports. One engine.</h2>
          </div>
          <Link to="/analyze" className="btn-ghost">
            Browse all skills <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPORTS.map((sport) => (
            <Card key={sport.id} className="p-5">
              <div className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br ${sport.accent} p-0.5`}>
                <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[rgb(var(--surface))] text-2xl">{sport.emoji}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold">{sport.name}</h3>
              <p className="mt-1 text-sm text-muted">{sport.tagline}</p>
              <ul className="mt-4 space-y-1.5">
                {sport.skills.map((skill) => (
                  <li key={skill.id} className="flex items-center gap-2 text-sm text-muted">
                    <span className="h-1 w-1 rounded-full bg-cyan-400" />
                    {skill.name}
                  </li>
                ))}
              </ul>
              <Link to={`/analyze/${sport.id}`} className="btn-ghost mt-4 w-full">
                {sport.skills.length} skills · Analyze
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1240px] px-5 py-10 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-5">
              <span className="text-3xl">{feature.emoji}</span>
              <h3 className="mt-3 text-lg font-bold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="proof" className="relative z-10 mx-auto max-w-[1240px] px-5 py-10 sm:px-8">
        <Card className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Chip className="text-lime-300">
              <LineChart size={13} /> Real sample athlete
            </Chip>
            <h2 className="mt-4 text-3xl font-bold">
              From {DEMO_RESULT.baselineOverall} to {DEMO_RESULT.improvedOverall} across{' '}
              <span className="gradient-text">four weeks</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Arjun trains alone, in a driveway, with a phone propped against a wall. His elbow alignment went from
              {' '}{DEMO_RESULT.rows[0].before} to {DEMO_RESULT.rows[0].after} through adaptive sessions — and the app can
              prove every step of it.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {DEMO_RESULT.rows.map((row) => (
                <div key={row.label} className="glass-soft p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted">{row.label}</p>
                  <p className="mt-1 font-display text-lg font-bold text-strong">
                    {row.before} <span className="text-lime-300">→ {row.after}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <BrandArtwork className="lg:order-last" />
        </Card>
      </section>

      <section className="relative z-10 mx-auto max-w-[1240px] px-5 pb-20 pt-6 sm:px-8">
        <Card className="relative overflow-hidden p-8 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,0.25),transparent_60%)]" />
          <h2 className="relative text-3xl font-bold sm:text-4xl">Ready to find your weakness?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm text-muted sm:text-base">
            Record 30 seconds. Get a scored report, a targeted 15-minute session and a re-test that proves it worked.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/analyze" className="btn-primary !px-6 !py-3">
              Analyze My Skill <ArrowRight size={17} />
            </Link>
            <Link to="/demo" className="btn-ghost !px-6 !py-3">
              <Gamepad2 size={16} /> Run the 3-minute demo
            </Link>
          </div>
        </Card>
      </section>

      <footer className="relative z-10 border-t border-[rgb(var(--line)/0.08)] py-7">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 px-5 text-xs text-muted sm:flex-row sm:px-8">
          <span>PocketCoach AI — Your Game. Your Weaknesses. Your AI Coach.</span>
          <span>Form &amp; Progress · Videos are processed locally and never published</span>
        </div>
      </footer>
    </div>
  );
}
