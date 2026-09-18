import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LogoMark } from '@/components/visual/Logo';
import { useAuth } from '@/store/AuthStore';

/** Shown while the stored session is being checked, so a reload never flashes the sign-in page. */
function BootSplash() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={56} className="animate-pulse" />
        <p className="text-sm text-muted">Restoring your session…</p>
      </div>
    </div>
  );
}

/**
 * Gate for the training app.
 *
 * Guest mode counts as signed in — judges and first-time visitors must be able to
 * explore without an account — but a fully anonymous visitor is sent to sign in
 * with the destination remembered, so they land where they intended afterwards.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'booting') return <BootSplash />;
  if (status === 'anonymous') {
    return <Navigate to="/signin" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <>{children}</>;
}
