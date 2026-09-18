/**
 * Turning an authenticated account into app state.
 *
 * A new account starts **empty on purpose**. Seeding it with the demo athlete's
 * history would show a brand-new user progress they never earned, so the app
 * shows its empty states and invites the first analysis instead. Guest mode is
 * the only actor that gets the seeded demo career.
 */
import type { AppState, SportId, UserProfile } from '@/lib/types';
import type { AuthUser } from '@/lib/authSession';
import { getSkill } from '@/data/sports';

const DEFAULT_GOAL_SKILL = 'basketball-jump-shot';
const SPORTS: SportId[] = ['basketball', 'football', 'fitness'];

function coerceSports(input: string[] | undefined): SportId[] {
  const valid = (input ?? []).filter((id): id is SportId => SPORTS.includes(id as SportId));
  return valid.length ? valid : ['basketball'];
}

/** Auth profile → the profile shape the whole app already understands. */
export function userProfileFrom(auth: AuthUser): UserProfile {
  const goalSkill = auth.goalSkill ?? DEFAULT_GOAL_SKILL;
  const skill = getSkill(goalSkill);
  const goalSport = (auth.goalSport && SPORTS.includes(auth.goalSport as SportId) ? auth.goalSport : skill?.sport) as SportId | undefined;

  return {
    id: auth.id,
    name: auth.name,
    email: auth.email,
    avatarEmoji: auth.avatarEmoji || '🏀',
    goalSkill,
    goalSport: goalSport ?? 'basketball',
    selectedSports: coerceSports(auth.selectedSports),
    skillLevels: {},
    xp: auth.xp ?? 0,
    streak: auth.streak ?? 0,
    lastActiveDate: new Date().toISOString(),
    badges: [],
    createdAt: auth.createdAt ?? new Date().toISOString(),
    keepVideos: false,
    onboarded: auth.onboarded ?? false,
  };
}

/** A signed-in account's first state: their profile, no history. */
export function newAccountState(auth: AuthUser, theme: AppState['theme'] = 'dark'): AppState {
  return {
    user: userProfileFrom(auth),
    analyses: [],
    workouts: [],
    progress: [],
    sessions: [],
    // left empty on purpose: the AI Coach posts its own first briefing
    messages: [],
    theme,
  };
}
