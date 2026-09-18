import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { LogoLockup } from '@/components/visual/Logo';
import { AthleteSilhouette, ParticleField } from '@/components/visual/Background';
import { Card } from '@/components/ui/primitives';

const TRUST = [
  { icon: ShieldCheck, title: 'Your clips stay on your device', body: 'Video is analysed in the browser and never uploaded to a server.' },
  { icon: Lock, title: 'Passwords are hashed', body: 'Accounts use salted scrypt hashes and signed, expiring sessions.' },
  { icon: Sparkles, title: 'Your coach, your data', body: 'Training history is stored per account — sign out and it stays yours.' },
];

/**
 * Split layout used by sign in / sign up: the pitch on the left, the form on the
 * right. Collapses to a single column on phones, where the form comes first.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden lg:flex-row">
      <ParticleField count={22} className="opacity-70" />

      {/* brand / pitch */}
      <aside className="relative z-10 order-2 hidden flex-1 flex-col justify-between border-r border-[rgb(var(--line)/0.08)] px-10 py-10 lg:order-1 lg:flex xl:px-14">
        <Link to="/" className="w-fit">
          <LogoLockup />
        </Link>

        <div className="relative my-10 max-w-lg">
          <div className="pointer-events-none absolute -right-6 -top-10 h-[320px] w-[320px] opacity-30">
            <AthleteSilhouette className="h-full w-full" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Your Game. Your Weaknesses. Your AI Coach.</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-strong xl:text-4xl">
            Train smarter.
            <br />
            <span className="gradient-text">Improve faster.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            One account keeps your assessments, adaptive sessions, XP and streaks together — so every re-test is compared
            against your own history, not somebody else's.
          </p>

          <ul className="mt-8 space-y-4">
            {TRUST.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-400/[0.12] text-cyan-300">
                  <item.icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-strong">{item.title}</p>
                  <p className="text-xs leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted">
          PocketCoach AI · hackathon prototype · analysis runs on-device
        </p>
      </aside>

      {/* form */}
      <main className="relative z-10 order-1 flex flex-1 flex-col justify-center px-5 py-8 sm:px-8 lg:order-2 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/">
              <LogoLockup />
            </Link>
          </div>

          <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-strong lg:mt-0">
            <ArrowLeft size={13} /> Back to home
          </Link>

          <h1 className="mt-5 font-display text-3xl font-bold text-strong">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>

          <Card className="mt-6 p-5 sm:p-6">{children}</Card>

          {footer && <div className="mt-5 text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
