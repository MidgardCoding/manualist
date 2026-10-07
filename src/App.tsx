import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import MainWorkflow from './components/MainWorkflow';
import Register from './pages/register';
import Login from './pages/login';
import LandingPage from './pages/LandingPage';
import ArchivePage from './pages/ArchivePage';
import Settings from './pages/Settings';
import UpdatePassword from './pages/UpdatePassword';
import ProfileModal from './components/ProfileModal';
import { supabase, getActiveUser } from './utils/supabase';
import './App.css';
import Background from './components/Background';
import { Archive, MessageCircleHeart, RotateCcw } from 'lucide-react';
import useCredits from './hooks/useCredits';
import ToS from './pages/ToS';
import CreditsPage from './pages/CreditsPage';
import OutOfCreditsModal from './components/OutOfCreditsModal';

export function Navbar({ onLogout }: { onLogout: () => void }) {
  const { fullReset } = useAppStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{ displayName: string | null; avatarUrl: string | null; avatarEmoji: string | null; email: string | null }>({ displayName: null, avatarUrl: null, avatarEmoji: null, email: null });
  const { credits, loading: creditsLoading } = useCredits();

  const refreshProfile = async () => {
    try {
      const user = await getActiveUser();
      if (user) {
        const meta: any = user.user_metadata || {};
        setProfile({
          displayName: meta.display_name || meta.username || null,
          avatarUrl: meta.avatar_url || null,
          avatarEmoji: meta.avatar_emoji || null,
          email: user.email || null,
        });
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    refreshProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => refreshProfile());
    const handler = () => refreshProfile();
    window.addEventListener('profile-updated', handler);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('profile-updated', handler);
    };
  }, []);

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6">
      <div className="navbar mx-auto max-w-[80%] rounded-2xl bg-base-100/90 backdrop-blur border border-base-300 shadow-lg px-3 sm:px-4">
        <div className="flex-1 navbar-start">
          <a href="/app" onClick={fullReset} className="btn btn-ghost text-xl font-extrabold px-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-amber-900 text-lg" aria-hidden>M</span>
            Manualist
          </a>
        </div>
        <div className="navbar-end flex items-center gap-2">
          <button onClick={fullReset} className="btn btn-ghost rounded-full text-base hidden sm:inline-flex">
            <Archive className="w-5 h-5" />
            <span className="hidden lg:inline">My manuals</span>
          </button>
          <button onClick={() => window.dispatchEvent(new Event('manualist-open-chat'))} className="btn btn-ghost rounded-full text-base hidden sm:inline-flex">
            <MessageCircleHeart className="w-5 h-5" />
            <span className="hidden lg:inline">Help</span>
          </button>
          <div className="relative">
            <button onClick={() => window.location.href = '/pricing'} className="btn btn-primary btn-sm sm:btn-md rounded-full text-amber-900 font-bold">
              {creditsLoading && credits === null ? <span className="loading loading-spinner loading-xs"></span> : `${credits ?? 10} credits`}
            </button>
            {credits !== null && credits < 1 && (
              <div className="absolute top-full right-0 mt-2 p-3 bg-base-100 border border-base-300 rounded-xl shadow-lg w-48 text-center z-50">
                <p className="text-sm font-semibold mb-1">Out of credits!</p>
                <p className="text-xs opacity-70">Buy more <a href="/pricing" className="link link-primary font-semibold">here</a></p>
              </div>
            )}
          </div>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-base-300 flex items-center justify-center overflow-hidden text-xl">
                {profile.avatarUrl ? (
                  <img alt="Your profile avatar" src={profile.avatarUrl} className="w-full h-full object-cover" />
                ) : profile.avatarEmoji ? (
                  <span>{profile.avatarEmoji}</span>
                ) : (
                  <img alt="" src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" />
                )}
              </div>
            </div>
            <ul
              tabIndex={-1}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <li>
                <button className="justify-between" onClick={() => setIsProfileOpen(true)}>
                  Profile
                  <span className="badge">New</span>
                </button>
              </li>
              <li><a href="/settings">Settings</a></li>
              <li><button onClick={onLogout}>Logout</button></li>
            </ul>
          </div>
        </div>
      </div>
      <dialog id="credit_balance_modal" className="modal">
        <div className="modal-box">
          <button aria-label="Close credits dialog" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => (document.getElementById('credit_balance_modal') as HTMLDialogElement)?.close()}>✕</button>
          <h3 className="font-bold text-lg">Your credits</h3>
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-extrabold text-warning">{credits ?? 10}</span>
              <span className="text-lg opacity-60">credits</span>
            </div>
            {credits !== null && credits <= 2 && (
              <div className="alert alert-warning py-2 text-xs">Low balance! Each manual and each chat message costs 1 credit.</div>
            )}
            <p className="text-sm opacity-70 text-center">Every new account gets <b>10 free credits</b> to start.<br/>• Saving a manual = <b>1 credit</b><br/>• One chat message = <b>1 credit</b></p>
            <p className="text-xs opacity-50 text-center">Your balance updates by itself. Out of credits? Just reach out to support.</p>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </header>
  );
}

function MainApp() {
  const { activeManualId, apiResponse, fullReset, setActiveManualId, setStep } = useAppStore();
  const isViewingManual = !!activeManualId && !!apiResponse;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('signOut failed, redirecting anyway', e);
    } finally {
      window.location.href = '/';
    }
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
          <div className="mx-auto max-w-[80%] px-4 sm:px-6 pt-8">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button className="btn btn-ghost w-70 rounded-full border border-base-300 bg-base-100 shadow-sm" onClick={handleBackToArchive}>
                ← Back to my manuals
              </button>
              <button className="btn btn-ghost w-70 rounded-full border border-base-300 bg-base-100 shadow-sm" onClick={handleBackToArchive}>
                <span className="inline-flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Start over</span>
              </button>
            </div>
          </div>
          <MainWorkflow />
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
    // Verify server-side (getUser) instead of trusting the local session only.
    supabase.auth.getUser().then(({ data }) => {
      setSession(!!data.user);
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

function GuestGuard({ children }: { children: React.ReactNode }) {
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

  if (session) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <GuestGuard>
              <Login />
            </GuestGuard>
          }
        />
        <Route
          path="/register"
          element={
            <GuestGuard>
              <Register />
            </GuestGuard>
          }
        />
        <Route path="/update-password" element={<AuthGuard><UpdatePassword /></AuthGuard>} />
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <Settings />
            </AuthGuard>
          }
        />
        <Route
          path="/app/*"
          element={
            <AuthGuard>
              <MainApp />
            </AuthGuard>
          }
        />
        <Route path='/tos' element={<ToS/>}/>
        <Route
          path="/credits"
          element={
            <AuthGuard>
              <CreditsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/pricing"
          element={
            <AuthGuard>
              <CreditsPage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <OutOfCreditsModal />
    </BrowserRouter>
  );
}

