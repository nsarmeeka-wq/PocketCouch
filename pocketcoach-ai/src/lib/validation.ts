/**
 * Form validation.
 *
 * These mirror `backend/app/schemas.py` exactly, so a field that passes here is
 * not rejected by the server — and the wording matches too, so an error never
 * appears to change its mind between the two.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MIN = 2;
export const NAME_MAX = 48;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'We need your email to create the account.';
  if (!EMAIL_RE.test(trimmed)) return "That email address doesn't look right. Check it and try again.";
  if (trimmed.length > 254) return 'That email address is too long.';
  return null;
}

export function validateName(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Tell us what to call you.';
  if (cleaned.length < NAME_MIN) return 'That name is a little short — at least 2 characters.';
  if (cleaned.length > NAME_MAX) return `Names can be at most ${NAME_MAX} characters.`;
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Choose a password.';
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters for your password.`;
  if (value.length > PASSWORD_MAX) return `Passwords can be at most ${PASSWORD_MAX} characters.`;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Mix at least one letter and one number into your password.';
  return null;
}

export interface PasswordStrength {
  /** 0–4, for the meter */
  score: number;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  hint: string;
}

export function passwordStrength(value: string): PasswordStrength {
  if (value.length < PASSWORD_MIN) {
    return { score: 0, label: 'Too short', hint: `Add ${PASSWORD_MIN - value.length} more character(s)` };
  }
  let score = 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  score = Math.min(4, score);

  if (score <= 1) return { score, label: 'Weak', hint: 'Add a number or a capital, or make it longer' };
  if (score === 2) return { score, label: 'Fair', hint: 'Longer is stronger — try 12 characters' };
  if (score === 3) return { score, label: 'Good', hint: 'Add a symbol to make it strong' };
  return { score, label: 'Strong', hint: 'Nice — that will be hard to guess' };
}

/** Trim the "Value error, " prefix FastAPI adds to custom validator messages. */
export function cleanServerMessage(message: string): string {
  return message.replace(/^Value error,\s*/, '').trim();
}
