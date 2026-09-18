import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Bot, Dumbbell, Gamepad2, Home, LogOut, Moon, Sun, Target, User, UserPlus, X, Flame, Star, WifiOff } from 'lucide-react';
import { LogoLockup, LogoMark } from '@/components/visual/Logo';
import { useApp, useLevel } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/analyze', label: 'Analyze', icon: Target },
  { to: '/training', label: 'Training', icon: Dumbbell },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/coach', label: 'AI Coach', icon: Bot },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AppShell() {
  const { state, dispatch } = useApp();
  const level = useLevel();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();

  const toggleTheme = () => dispatch({ type: 'set-theme', theme: state.theme === 'dark' ? 'light' : 'dark' });

  /** Signs out to the sign-in screen (one step to switch accounts), or steps out of guest mode to the landing page. */
  const leave = async () => {
    const wasAuthenticated = auth.status === 'authenticated';
    await auth.signOut();
    navigate(wasAuthenticated ? '/signin' : '/', { replace: true });
  };

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-[rgb(var(--line)/0.08)] bg-[rgb(var(--surface)/0.55)] px-5 py-6 backdrop-blur-xl lg:flex">
        <NavLink to="/dashboard" className="block">
          <LogoLockup />
        </NavLink>

        <nav className="mt-8 flex flex-1 flex-col gap-1.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <NavLink to="/demo" className="btn-primary mt-4 w-full">
          <Gamepad2 size={16} /> Hackathon Demo
        </NavLink>

        <div className="glass-soft mt-4 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-lime-400/20 text-lg">
              {state.user.avatarEmoji}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-strong">{state.user.name}</p>
              <p className="truncate text-[11px] text-muted">
                Level {level.current.level} · {level.current.title}
              </p>
            </div>
          </div>

          <p className="mt-2 truncate text-[11px] text-muted">
            {auth.status === 'authenticated' && auth.user ? auth.user.email : 'Guest session · demo data'}
          </p>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-500/20">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-lime-400" style={{ width: `${level.progress}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            {level.next ? `${level.xpForNext - level.xpIntoLevel} XP to ${level.next.title}` : 'Max level reached'}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {auth.status === 'authenticated' ? (
              <button type="button" onClick={leave} className="btn-ghost flex-1 !py-2 text-xs">
                <LogOut size={13} /> Switch account
              </button>
            ) : (
              <>
                <NavLink to="/signup" className="btn-primary flex-1 !py-2 text-xs">
                  <UserPlus size={13} /> Create account
                </NavLink>
                <button type="button" onClick={leave} className="btn-ghost !px-2.5 !py-2 text-xs" aria-label="Leave guest mode">
                  <LogOut size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        {/* top bar */}
        <header className="sticky top-0 z-30 border-b border-[rgb(var(--line)/0.08)] bg-[rgb(var(--app-bg)/0.75)] backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
            <NavLink to="/dashboard" className="flex items-center gap-2 lg:hidden">
              <LogoMark size={32} />
              <span className="hidden font-display text-base font-bold text-strong sm:block">
                PocketCoach <span className="gradient-text">AI</span>
              </span>
            </NavLink>

            <div className="ml-auto flex items-center gap-2">
              <span className="chip hidden text-flame-400 sm:inline-flex">
                <Flame size={13} /> {state.user.streak} day streak
              </span>
              <span className="chip hidden text-cyan-300 sm:inline-flex">
                <Star size={13} /> {state.user.xp.toLocaleString()} XP
              </span>
              <span className="chip text-lime-300">
                <Activity size={13} /> Lv {level.current.level}
              </span>
              {auth.offline && (
                <span className="chip text-amber-300" title="The coaching server is unreachable — training data is saved on this device">
                  <WifiOff size={13} /> Offline
                </span>
              )}
              <button type="button" onClick={toggleTheme} className="btn-ghost !px-2.5 !py-2" aria-label="Toggle theme">
                {state.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <NavLink to="/profile" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-lime-400/20 text-lg">
                {state.user.avatarEmoji}
              </NavLink>
            </div>
          </div>
        </header>

        <main key={location.pathname} className="mx-auto max-w-[1240px] animate-fade-up px-4 pb-28 pt-6 sm:px-6 lg:pb-14">
          <Outlet />
        </main>

        {/* mobile bottom nav */}
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[rgb(var(--line)/0.08)] bg-[rgb(var(--app-bg)/0.92)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition', isActive ? 'text-cyan-300' : 'text-muted')
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl transition', isActive && 'bg-cyan-400/15')}>
                      <item.icon size={18} />
                    </span>
                    <span>{item.label === 'Dashboard' ? 'Home' : item.label.split(' ')[0]}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <ToastHub />
    </div>
  );
}

export function ToastHub() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-[70] flex flex-col items-center gap-2 lg:bottom-6 lg:right-6 lg:left-auto lg:items-end">
      {toasts.map((toast) => (
        <div key={toast.id} className="glass-card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-xl">{toast.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-strong">{toast.title}</p>
            <p className="text-xs text-muted">{toast.body}</p>
          </div>
          <button type="button" onClick={() => dismissToast(toast.id)} className="rounded-lg p-1 text-muted hover:bg-white/10" aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
