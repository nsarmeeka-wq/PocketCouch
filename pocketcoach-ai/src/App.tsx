import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Landing } from '@/pages/Landing';
import { SignIn } from '@/pages/SignIn';
import { SignUp } from '@/pages/SignUp';
import { Dashboard } from '@/pages/Dashboard';
import { SelectSport } from '@/pages/SelectSport';
import { SelectSkill } from '@/pages/SelectSkill';
import { Analyze } from '@/pages/Analyze';
import { AnalysisReport } from '@/pages/AnalysisReport';
import { Training } from '@/pages/Training';
import { Progress } from '@/pages/Progress';
import { Coach } from '@/pages/Coach';
import { Profile } from '@/pages/Profile';
import { DemoMode } from '@/pages/DemoMode';
import { NotFound } from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Public but chrome-wrapped: the guided demo is the judges' front door,
          so it must run without creating an account. */}
      <Route element={<AppShell />}>
        <Route path="/demo" element={<DemoMode />} />
      </Route>

      {/* Needs a session — guest mode counts, anonymous visitors are redirected */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analyze" element={<SelectSport />} />
        <Route path="/analyze/:sportId" element={<SelectSkill />} />
        <Route path="/analyze/:sportId/:skillId" element={<Analyze />} />
        <Route path="/report/:analysisId" element={<AnalysisReport />} />
        <Route path="/training" element={<Training />} />
        <Route path="/training/:workoutId" element={<Training />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/coach" element={<Coach />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
