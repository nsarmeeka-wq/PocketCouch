import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Database, Loader2, LogOut, Mail, Monitor, Moon, RotateCcw, Save, Shield, ShieldCheck, Sun, Trash2, TriangleAlert, Trophy, User, UserPlus } from 'lucide-react';
import { useApp, useLevel } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { drillsCompleted, totalTrainingMinutes, weekStats } from '@/store/selectors';
import { ALL_SKILLS, SPORTS } from '@/data/sports';
import { BADGES } from '@/lib/gamification';
import { Card, Chip, ErrorNote, InfoNote, Modal, SectionTitle, StatTile } from '@/components/ui/primitives';
import { messageFor } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

const AVATARS = ['🏀', '⚽', '🏃', '🔥', '🎯', '🚀', '🦾', '🧠', '🏆'];

/**
 * Account panel: who is signed in, how to leave, and how to remove everything.
 * Guest mode gets an explicit upgrade path instead of a dead end.
 */
function AccountCard({ saved }: { saved: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async () => {
    setBusy(true);
    try {
      await auth.signOut();
      // land on the sign-in screen so switching to another account is one step
      navigate('/signin', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.deleteAccount();
      navigate('/', { replace: true });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (auth.status !== 'authenticated') {
    return (
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <UserPlus size={17} className="text-cyan-300" /> Guest session
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          You are exploring with the sample athlete's history. Create an account to keep your own assessments, streaks and
          adaptive plan — and to sign in from another device.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/signup" className="btn-primary flex-1">
            <UserPlus size={15} /> Create an account
          </Link>
          <Link to="/signin" className="btn-ghost flex-1">
            Sign in
          </Link>
        </div>
      </Card>
    );
  }

  const user = auth.user;
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <ShieldCheck size={17} className="text-cyan-300" /> Your account
      </h2>

      <dl className="mt-4 space-y-2.5">
        <div className="flex items-center gap-2.5 text-sm">
          <dt className="flex items-center gap-2 text-muted">
            <Mail size={14} /> Email
          </dt>
          <dd className="ml-auto truncate font-semibold text-strong">{user?.email}</dd>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <dt className="flex items-center gap-2 text-muted">
            <CalendarDays size={14} /> Member since
          </dt>
          <dd className="ml-auto font-semibold text-strong">{user?.createdAt ? formatDate(user.createdAt) : '—'}</dd>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <dt className="flex items-center gap-2 text-muted">
            <Trophy size={14} /> Account level
          </dt>
          <dd className="ml-auto font-semibold text-strong">
            {user?.xp ?? 0} XP · 🔥 {user?.streak ?? 0}
          </dd>
        </div>
      </dl>

      {auth.offline && (
        <div className="mt-4">
          <InfoNote tone="amber">
            <span className="font-semibold">Working offline. </span>
            The coaching server is unreachable, so sign-out and account changes will apply once it is back.
          </InfoNote>
        </div>
      )}
      {saved && <p className="mt-3 text-xs font-semibold text-lime-300">Profile synced to your account ✓</p>}
      {error && <div className="mt-4"><ErrorNote title="Couldn't delete the account" body={error} /></div>}

      <div className="mt-4 space-y-2.5">
        <button type="button" className="btn-ghost w-full !justify-start" onClick={signOut} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />} Switch account — sign out
        </button>
        <button
          type="button"
          className="btn-ghost w-full !justify-start !border-rose-400/40 text-rose-200"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          <Trash2 size={15} /> Delete my account
        </button>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Delete this account?">
        <p className="text-sm leading-relaxed text-muted">
          This removes <span className="font-semibold text-strong">{user?.email}</span> from the coaching server and erases
          the training data stored for this account on this device. It cannot be undone.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] p-3 text-xs text-muted">
          <TriangleAlert size={13} className="mt-0.5 shrink-0 text-amber-300" />
          Your video clips were never uploaded, so there is nothing to remove beyond scores and progress.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Keep my account
          </button>
          <button type="button" className="btn-primary !bg-none !bg-rose-500 !text-white" onClick={removeAccount} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete everything
          </button>
        </div>
      </Modal>
    </Card>
  );
}

export function Profile() {
  const { state, dispatch, pushToast, resetDemoData } = useApp();
  const auth = useAuth();
  const level = useLevel();
  const [name, setName] = useState(state.user.name);
  const [avatar, setAvatar] = useState(state.user.avatarEmoji);
  const [goal, setGoal] = useState(state.user.goalSkill);
  const [keepVideos, setKeepVideos] = useState(state.user.keepVideos);
  const [saved, setSaved] = useState(false);
  const earned = new Set(state.user.badges.map((b) => b.id));
  const week = weekStats(state);

  const save = async () => {
    const cleanName = name.trim() || 'Athlete';
    dispatch({ type: 'update-user', patch: { name: cleanName, avatarEmoji: avatar, keepVideos } });
    const skill = ALL_SKILLS.find((s) => s.id === goal);
    if (skill) dispatch({ type: 'set-goal', skillId: skill.id, sport: skill.sport });

    // Mirror the edit onto the account so the server copy matches the app.
    if (auth.status === 'authenticated') {
      try {
        await auth.updateProfile({ name: cleanName, avatarEmoji: avatar, goalSkill: skill?.id ?? goal, goalSport: skill?.sport });
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2600);
      } catch (error) {
        pushToast({ title: 'Saved on this device', body: messageFor(error), emoji: '⚠️' });
        return;
      }
    }
    pushToast({ title: 'Profile saved', body: auth.status === 'authenticated' ? 'Your account and this device are in sync.' : 'Your preferences are stored on this device.', emoji: '✅' });
  };

  return (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Profile"
        title="Athlete profile"
        subtitle="Everything PocketCoach AI knows about you, plus full control over your data."
        right={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => dispatch({ type: 'set-theme', theme: state.theme === 'dark' ? 'light' : 'dark' })}
            >
              {state.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />} {state.theme === 'dark' ? 'Light' : 'Dark'} mode
            </button>
            <button type="button" className="btn-primary" onClick={save}>
              <Save size={15} /> Save changes
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={<Trophy size={17} />} label="Level" value={`Lv ${level.current.level}`} hint={level.current.title} accent="text-lime-300" />
        <StatTile icon={<BadgeCheck size={17} />} label="Badges" value={`${state.user.badges.length}/${BADGES.length}`} hint="earned" />
        <StatTile icon={<Monitor size={17} />} label="Lifetime training" value={`${totalTrainingMinutes(state)} min`} hint={`${drillsCompleted(state)} drills completed`} />
        <StatTile icon={<Database size={17} />} label="Assessments" value={`${state.analyses.length}`} hint={`${week.sessions} sessions this week`} accent="text-cyan-300" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-5 p-5">
          <div className="flex items-center gap-2">
            <User size={17} className="text-cyan-300" />
            <h2 className="text-xl font-bold">Your details</h2>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="profile-name">
              Name
            </label>
            <input id="profile-name" className="field mt-1.5" value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Avatar</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-xl border text-xl transition',
                    avatar === emoji ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-[rgb(var(--line)/0.12)] hover:border-cyan-400/30',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted" htmlFor="profile-goal">
              Primary goal skill
            </label>
            <select id="profile-goal" className="field mt-1.5" value={goal} onChange={(event) => setGoal(event.target.value)}>
              {SPORTS.map((sport) => (
                <optgroup key={sport.id} label={`${sport.emoji} ${sport.name}`}>
                  {sport.skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-[rgb(var(--line)/0.12)] p-3.5">
            <input type="checkbox" checked={keepVideos} onChange={(event) => setKeepVideos(event.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
            <span className="text-sm">
              <span className="font-semibold text-strong">Keep clip references for re-tests</span>
              <span className="mt-0.5 block text-xs text-muted">
                Videos are processed in your browser and are never uploaded to a server. Turning this off deletes the
                reference after every analysis.
              </span>
            </span>
          </label>

          <InfoNote>
            <span className="flex items-center gap-2 font-semibold">
              <Shield size={14} /> Privacy by design
            </span>
            <span className="mt-1 block">
              PocketCoach AI stores scores, drills and progress. Footage stays on your device and is discarded when you
              leave the analysis screen.
            </span>
          </InfoNote>
        </Card>

        <div className="space-y-5">
          <AccountCard saved={saved} />

          <Card className="p-5">
            <h2 className="text-xl font-bold">Badge collection</h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {BADGES.map((badge) => {
                const owned = earned.has(badge.id);
                const award = state.user.badges.find((b) => b.id === badge.id);
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl border p-3',
                      owned ? 'border-lime-400/35 bg-lime-400/[0.08]' : 'border-[rgb(var(--line)/0.1)] opacity-50',
                    )}
                  >
                    <span className="text-xl">{badge.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-strong">{badge.name}</p>
                      <p className="text-[11px] leading-snug text-muted">{badge.description}</p>
                      {award && <p className="mt-1 text-[10px] uppercase tracking-wider text-lime-300">Earned {formatDate(award.earnedAt)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-xl font-bold">Data management</h2>
            <p className="mt-1.5 text-sm text-muted">
              This build persists your athlete profile, analyses, workouts and progress locally on this device.
            </p>
            <div className="mt-4 space-y-2.5">
              <button
                type="button"
                className="btn-ghost w-full !justify-start"
                onClick={() => {
                  resetDemoData();
                }}
              >
                <RotateCcw size={15} /> Restore the demo athlete history
              </button>
              <button
                type="button"
                className="btn-ghost w-full !justify-start !border-rose-400/40 text-rose-200"
                onClick={() => {
                  state.analyses.forEach((analysis) => dispatch({ type: 'delete-analysis', analysisId: analysis.id }));
                  pushToast({ title: 'Footage references cleared', body: 'All analysis reports were deleted. Training history was kept.', emoji: '🗑️' });
                }}
              >
                <Trash2 size={15} /> Delete all analysed footage references
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {state.user.badges.map((badge) => (
                <Chip key={badge.id} className="text-lime-300">
                  {badge.emoji} {badge.name}
                </Chip>
              ))}
              {state.user.badges.length === 0 && <p className="text-sm text-muted">No badges yet — complete a session to start collecting.</p>}
            </div>
          </Card>

          <Card soft className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-300">Architecture</h2>
            <p className="mt-2 text-sm text-muted">
              The client ships a rulebook of sports, skills and signals, a modular measurement library (20 joint-level
              measurements), an explainable recommendation engine and a swappable pose provider. A FastAPI backend that
              mirrors these modules lives in <code className="font-mono text-cyan-200">/backend</code> for server-side
              deployments.
            </p>
            <Link to="/demo" className="btn-soft mt-4 w-full">
              Run the guided demo
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
