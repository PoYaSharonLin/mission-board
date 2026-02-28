
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

import { Login } from './pages/Login';
import { ProfilePage } from './pages/Profile';
import { GuessPage } from './pages/Guess';
import { Dashboard } from './pages/Dashboard';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative pb-16 md:pb-0">
      <Navbar />
      
      <main className="flex-1 max-w-5xl mx-auto w-full md:pt-16 px-2 sm:px-4">
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/guess" element={<GuessPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Redirect root to dashboard if logged in, otherwise ProtectedRoute handles it */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
          
          {/* Admin route — has its own password gate, not wrapped in ProtectedRoute */}
          <Route path="/admin" element={<AdminPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
