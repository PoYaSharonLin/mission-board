
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { Navbar } from './components/Navbar';
import { AdminProvider } from './contexts/AdminContext';

import { Login } from './pages/Login';
import { ProfilePage } from './pages/Profile';
import { GuessPage } from './pages/Guess';
import { Dashboard } from './pages/Dashboard';
import { PortalLayout } from './pages/portal/PortalLayout';
import { PortalSettings } from './pages/portal/PortalSettings';
import { MissionAssignment } from './pages/portal/MissionAssignment';
import { GuessEvaluation } from './pages/portal/GuessEvaluation';

// Shared shell for all player-facing pages
const PlayerShell = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col relative pb-16 md:pb-0">
    <Navbar />
    <main className="flex-1 max-w-5xl mx-auto w-full md:pt-16 px-2 sm:px-4">
      <Outlet />
    </main>
  </div>
);

function App() {
  return (
    <Routes>
      {/* ── Admin portal (own layout + auth context) ── */}
      <Route
        path="/portal"
        element={
          <AdminProvider>
            <PortalLayout />
          </AdminProvider>
        }
      >
        <Route index element={<PortalSettings />} />
        <Route element={<AdminProtectedRoute />}>
          <Route path="mission_assignment" element={<MissionAssignment />} />
          <Route path="guess_evaluation" element={<GuessEvaluation />} />
        </Route>
      </Route>

      {/* ── Player app (shared navbar + player auth) ── */}
      <Route element={<PlayerShell />}>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/guess" element={<GuessPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
