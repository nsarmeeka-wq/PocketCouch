import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, Loader2, ServerCrash, ShieldCheck, UserPlus } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField, TextField } from '@/components/auth/fields';
import { ErrorNote } from '@/components/ui/primitives';
import { useAuth } from '@/store/AuthStore';
import { ApiError } from '@/lib/api';
import { validateEmail, validateName, validatePassword } from '@/lib/validation';

interface FromState {
  from?: string;
}

export function SignUp() {
  const { signUp, continueAsGuest, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as FromState | null)?.from;

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [accepted, setAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [blameServer, setBlameServer] = useState(false);

  /** Edit a field and clear its error immediately — a stale warning next to a
      field you have already fixed reads as if the form is arguing with you. */
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setBlameServer(false);

    const errors = {
      name: validateName(form.name) ?? undefined,
      email: validateEmail(form.email) ?? undefined,
      password: validatePassword(form.password) ?? undefined,
      confirm: form.confirm === form.password ? undefined : "Those passwords don't match.",
      accepted: accepted ? undefined : 'Please confirm how your data is handled.',
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate(from ?? '/dashboard', { replace: true });
    } catch (err) {
      setBlameServer(err instanceof ApiError && err.offline);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your account holds your assessments, adaptive sessions and progress. It takes about ten seconds."
      footer={
        <>
          Already training with us?{' '}
          <Link to="/signin" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          label="What should we call you?"
          name="name"
          autoComplete="nickname"
          placeholder="Arjun"
          value={form.name}
          onChange={update('name')}
          error={fieldErrors.name}
        />

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update('email')}
          error={fieldErrors.email}
        />

        <PasswordField
          label="Password"
          name="new-password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update('password')}
          error={fieldErrors.password}
          showStrength
        />

        <PasswordField
          label="Confirm password"
          name="confirm-password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={form.confirm}
          onChange={update('confirm')}
          error={fieldErrors.confirm}
        />

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[rgb(var(--line)/0.12)] bg-[rgb(var(--surface)/0.4)] p-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked);
              if (event.target.checked) setFieldErrors((current) => ({ ...current, accepted: undefined }));
            }}
            className="mt-0.5 h-4 w-4 accent-cyan-400"
          />
          <span className="text-xs leading-relaxed text-muted">
            <span className="font-semibold text-strong">My clips stay on this device.</span> PocketCoach analyses video in
            the browser — the server only stores this account's name, email and training progress, and I can delete the
            account at any time.
          </span>
        </label>
        {fieldErrors.accepted && (
          <p className="text-xs font-medium text-rose-300" role="alert">
            {fieldErrors.accepted}
          </p>
        )}

        {error && !blameServer && <ErrorNote title="We couldn't create that account" body={error} />}

        {blameServer && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.08] p-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <ServerCrash size={15} /> The coaching server is offline
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Creating an account needs the FastAPI backend running. Guest mode works without it if you want to keep
              exploring.
            </p>
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {submitting ? 'Creating your account…' : 'Create account'}
        </button>

        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            continueAsGuest();
            navigate(from ?? '/dashboard', { replace: true });
          }}
        >
          <Gamepad2 size={16} /> Skip for now — guest mode
        </button>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
          <ShieldCheck size={12} className="mt-0.5 shrink-0 text-cyan-300" />
          Passwords are stored only as salted scrypt hashes. Sessions are signed, expire after 12 hours and are revoked
          when you sign out.
        </p>
      </form>
    </AuthLayout>
  );
}
