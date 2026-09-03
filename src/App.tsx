import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAppStore } from './store';
import MainWorkflow from './components/MainWorkflow';
import Register from './pages/register';
import Login from './pages/login';
import LandingPage from './pages/LandingPage';
import ArchivePage from './pages/ArchivePage';
import { supabase } from './utils/supabase';
import './App.css';
import type { Step } from './types';
import Background from './components/Background';
import { RotateCcw } from 'lucide-react';

function Navbar({ onLogout }: { onLogout: () => void }) {
  const { fullReset } = useAppStore();
  const steps: Array<{ id: Step; label: string; icon: string }> = [
    { id: 'input', label: 'Import', icon: '📁' },
    { id: 'generate', label: 'Generate', icon: '✨' },
    { id: 'render', label: 'Render', icon: '📖' },
  ];

  return (
    <>
      <div className="navbar rounded bg-base-200 border border-gray-200 shadow-xl sticky top-6 z-51 w-auto mx-6">
        <div className="flex-1">
          <Link to="/app" onClick={fullReset} className="btn btn-ghost normal-case text-2xl font-bold">
            Manualist
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>
            Sign Out
          </button>
          <div className="dropdown dropdown-end md:hidden">
            <label tabIndex={0} className="btn btn-ghost btn-circle">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
            <ul tabIndex={0} className="dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-60 gap-2">
              {steps.map((step) => (
                <li key={step.id}>
                  <button onClick={() => useAppStore.getState().setStep(step.id)} className="btn btn-sm w-full justify-start">
                    {step.icon} {step.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

function MainApp() {
  const { activeManualId, apiResponse, fullReset, setActiveManualId, setStep } = useAppStore();
  const isViewingManual = !!activeManualId && !!apiResponse;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleBackToArchive = () => {
    setActiveManualId(null);
    setStep('select');
    fullReset();
  };

  return (
    <Background>
      <Navbar onLogout={handleLogout} />
      {isViewingManual ? (
        <>
          <div className="relative">
            <div className="absolute top-10 left-6 z-10">
              <button className="btn btn-sm btn-ghost bg-base-200 border border-base-300 w-80" onClick={handleBackToArchive}>
                ← Back to Archive
              </button>
            </div>
            <div className="absolute top-10 right-6 z-10">
              <button className="btn btn-sm btn-ghost bg-base-200 border border-base-300 w-80" onClick={handleBackToArchive}>
                <p className='flex row'><RotateCcw className='w-4'/><span className='p-1'>Retry</span></p>
              </button>
            </div>
            <MainWorkflow />
          </div>
        </>
      ) : (
        <ArchivePage />
      )}
    </Background>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(!!newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/app/*"
          element={
            <AuthGuard>
              <MainApp />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

