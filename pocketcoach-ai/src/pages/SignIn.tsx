import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, Loader2, LogIn, ServerCrash, TriangleAlert } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField, TextField } from '@/components/auth/fields';
import { ErrorNote } from '@/components/ui/primitives';
import { useAuth } from '@/store/AuthStore';
import { ApiError } from '@/lib/api';
import { validateEmail } from '@/lib/validation';

interface FromState {
  from?: string;
}

export function SignIn() {
  const { signIn, continueAsGuest, error, offline, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as FromState | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [blameServer, setBlameServer] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setBlameServer(false);

    const emailError = validateEmail(email);
    const passwordError = password ? null : 'Enter your password.';
    setFieldErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
    if (emailError || passwordError) return;

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from ?? '/dashboard', { replace: true });
    } catch (err) {
      // The banner comes from the store; here we only note *whose* fault it is.
      setBlameServer(err instanceof ApiError && err.offline);
    } finally {
      setSubmitting(false);
    }
  };

  const asGuest = () => {
    continueAsGuest();
    navigate(from ?? '/dashboard', { replace: true });
  };

  return (
    <AuthLayout
      title="Welcome back 👋"
      subtitle="Sign in to pick up your adaptive plan, streaks and re-test history exactly where you left off."
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          error={fieldErrors.email}
        />

        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          error={fieldErrors.password}
        />

        {error && !blameServer && <ErrorNote title="We couldn't sign you in" body={error} />}

        {blameServer && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.08] p-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <ServerCrash size={15} /> The coaching server is offline
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Accounts need the FastAPI backend running. You can keep training right now in guest mode — nothing you do
              there is lost when you sign in later.
            </p>
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-[rgb(var(--line)/0.12)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">or</span>
          <span className="h-px flex-1 bg-[rgb(var(--line)/0.12)]" />
        </div>

        <button type="button" className="btn-ghost w-full" onClick={asGuest}>
          <Gamepad2 size={16} /> Explore in guest mode
        </button>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
          <TriangleAlert size={12} className="mt-0.5 shrink-0 text-amber-300" />
          Guest mode loads the sample athlete so every screen has data to show. Sign in any time — your own account always
          starts clean and keeps its own history.
        </p>

        {offline && !blameServer && (
          <p className="text-[11px] text-amber-300">
            You are still signed in from this device, but the server is unreachable — progress will sync when it is back.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
