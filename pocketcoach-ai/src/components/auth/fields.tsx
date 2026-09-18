import { useId, useState, type InputHTMLAttributes } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { passwordStrength } from '@/lib/validation';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string;
  /** Show the strength meter — for choosing a password, never for typing one you already have. */
  showStrength?: boolean;
}

function FieldShell({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-300" role="alert">
          <AlertCircle size={13} className="mt-px shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function TextField({ label, error, hint, className = '', ...input }: FieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <input
        id={id}
        {...input}
        aria-invalid={Boolean(error)}
        className={cn('field', error && 'border-rose-400/60', className)}
      />
    </FieldShell>
  );
}

export function PasswordField({ label, error, hint, value, showStrength = false, ...input }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(String(value ?? ''));

  return (
    <FieldShell label={label} error={error} hint={hint} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          {...input}
          value={value}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          className={cn('field pr-11', error && 'border-rose-400/60')}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-strong"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {showStrength && value ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  index < strength.score
                    ? strength.score >= 4
                      ? 'bg-lime-400'
                      : strength.score === 3
                        ? 'bg-emerald-400'
                        : strength.score === 2
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                    : 'bg-slate-500/25',
                )}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-muted">{strength.label}</span>
        </div>
      ) : null}
    </FieldShell>
  );
}
