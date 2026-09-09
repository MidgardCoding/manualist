import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAppStore } from './store';
import MainWorkflow from './components/MainWorkflow';
import Register from './pages/register';
import Login from './pages/login';
import LandingPage from './pages/LandingPage';
import ArchivePage from './pages/ArchivePage';
import Settings from './pages/Settings';
import UpdatePassword from './pages/UpdatePassword';
import ProfileModal from './components/ProfileModal';
import { supabase } from './utils/supabase';
import './App.css';
import Background from './components/Background';
import { Archive, HelpCircleIcon, RotateCcw } from 'lucide-react';
import useCredits from './hooks/useCredits';

export function Navbar({ onLogout }: { onLogout: () => void }) {
  const { fullReset } = useAppStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{ displayName: string | null; avatarUrl: string | null; avatarEmoji: string | null; email: string | null }>({ displayName: null, avatarUrl: null, avatarEmoji: null, email: null });
  const { credits, loading: creditsLoading } = useCredits();

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const meta: any = user.user_metadata || {};
      setProfile({
        displayName: meta.display_name || meta.username || null,
        avatarUrl: meta.avatar_url || null,
        avatarEmoji: meta.avatar_emoji || null,
        email: user.email || null,
      });
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
    <>
      <div className="navbar rounded bg-base-200 border border-gray-200 shadow-xl sticky top-6 z-51 w-auto mx-6">
        <div className="flex-1 navbar-start">
          <Link to="/app" onClick={fullReset} className="btn btn-ghost normal-case text-2xl font-bold">
            Manualist
          </Link>
        </div>
        <div className="flex gap-2 navbar-end bg-gray-200 w-auto pl-1 rounded-full">
          <button onClick={fullReset} className='btn btn-sm rounded-full border-mauve-300 mt-[1.15px]'><Archive className='w-4 h-4'/>User Archive</button>
          <button onClick={fullReset} className='btn btn-sm rounded-full border-mauve-300 mt-[1.15px]'><HelpCircleIcon className='w-4 h-4'/>Help Center</button>
          <button onClick={()=>(document.getElementById('credit_balance_modal') as HTMLDialogElement)?.showModal()} className='btn btn-sm rounded-full btn-warning mt-[1.15px] items'>
            {creditsLoading && credits === null ? <span className="loading loading-spinner loading-xs"></span> : `${credits ?? 10} Credits`}
          </button>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-base-300 flex items-center justify-center overflow-hidden text-xl">
                {profile.avatarUrl ? (
                  <img alt="avatar" src={profile.avatarUrl} className="w-full h-full object-cover" />
                ) : profile.avatarEmoji ? (
                  <span>{profile.avatarEmoji}</span>
                ) : (
                  <img alt="avatar" src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" />
                )}
              </div>
            </div>
            <ul
              tabIndex={-1}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <li>
                <a className="justify-between" onClick={() => setIsProfileOpen(true)}>
                  Profile
                  <span className="badge">New</span>
                </a>
              </li>
              <li><Link to="/settings">Settings</Link></li>
              <li><a onClick={onLogout}>Logout</a></li>
            </ul>
          </div>
        </div>
      </div>
      <dialog id="credit_balance_modal" className="modal">
        <div className="modal-box">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => (document.getElementById('credit_balance_modal') as HTMLDialogElement)?.close()}>✕</button>
          <h3 className="font-bold text-lg">Your Credits</h3>
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-extrabold text-warning">{credits ?? 10}</span>
              <span className="text-lg opacity-60">Credits</span>
            </div>
            {credits !== null && credits <= 2 && (
              <div className="alert alert-warning py-2 text-xs">Low balance! Each manual and each chat message costs 1 Credit.</div>
            )}
            <p className="text-sm opacity-70 text-center">Każdy użytkownik otrzymuje <b>10 Credits</b> na start.<br/>• Nowy manual = <b>1 Credit</b><br/>• Jedna wiadomość do AI = <b>1 Credit</b></p>
            <p className="text-xs opacity-50 text-center">Stan konta aktualizuje się automatycznie. Brak Credits? Skontaktuj się z supportem.</p>
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
        <Route path="/update-password" element={<UpdatePassword />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

