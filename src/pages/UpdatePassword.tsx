import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import Background from '../components/Background';
import toast from 'react-hot-toast';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
      // If user came via recovery link, Supabase will have a session with recovery type
      // We just check session exists
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Check if there's a pending intent from Settings (user requested change but clicked email link)
        // It's okay to allow setting new password even without recovery session, as long as they verify current password
      }
      setCheckingSession(false);
    };
    init();
    // Listen for recovery event (when user clicks email link with ?type=recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        toast.success('Link potwierdzony — możesz ustawić nowe hasło');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Nowe hasło musi mieć co najmniej 6 znaków');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Hasła nie są zgodne');
      return;
    }
    if (!userEmail) {
      // Try to get email from session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('Brak zalogowanego użytkownika. Zaloguj się ponownie.');
        return;
      }
      setUserEmail(user.email);
    }
    const emailToVerify = userEmail || (await supabase.auth.getUser()).data.user?.email;
    if (!emailToVerify) {
      toast.error('Nie można ustalić adresu email');
      return;
    }

    setLoading(true);
    try {
      // Weryfikacja aktualnego hasła - wymagane w obu miejscach (Settings i tu)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToVerify,
        password: currentPassword,
      });
      if (signInError) throw new Error('Aktualne hasło jest nieprawidłowe');

      // Sprawdź czy mamy pending_new_password z Settings - jeśli tak, użyj go, ale priorytet ma to wpisane tutaj
      // Aktualizuj hasło
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      sessionStorage.removeItem('pending_new_password');
      toast.success('Hasło zmienione pomyślnie');
      navigate('/app');
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się zmienić hasła');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <Background>
        <div className="flex min-h-dvh items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Background>
    );
  }

  return (
    <Background>
      <div className="flex min-h-dvh items-center justify-center p-4 pt-24">
        <form onSubmit={handleSubmit} className="card bg-base-100 border border-base-300 shadow-xl w-full max-w-md">
          <div className="card-body">
            <h1 className="text-2xl font-bold text-center">Ustaw nowe hasło</h1>
            <p className="text-sm opacity-60 text-center">Someone requested a password change — jeśli to Ty, wprowadź aktualne hasło i nowe hasło poniżej.</p>
            <p className="text-xs opacity-50 text-center">Styl tej strony odpowiada stylowi Manualist (Background + card). Potwierdzenie odbywa się przez email wysłany z Supabase, przycisk w emailu kieruje tutaj: <span className="font-mono">/update-password</span></p>
            {userEmail && <p className="text-xs opacity-60 text-center">Zalogowany jako: <span className="font-mono">{userEmail}</span></p>}

            <label className="form-control mt-2">
              <span className="label label-text font-semibold">Aktualne hasło *</span>
              <input type="password" className="input input-bordered w-full" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Wpisz aktualne hasło dla weryfikacji" />
              <span className="label label-text-alt opacity-60">Weryfikacja wymagana przed zmianą</span>
            </label>
            <label className="form-control">
              <span className="label label-text font-semibold">Nowe hasło *</span>
              <input type="password" className="input input-bordered w-full" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </label>
            <label className="form-control">
              <span className="label label-text font-semibold">Potwierdź nowe hasło *</span>
              <input type="password" className="input input-bordered w-full" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </label>

            <button type="submit" className="btn btn-warning w-full mt-2" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Zmień hasło'}
            </button>
            <div className="text-center mt-3">
              <button type="button" className="link link-primary text-xs" onClick={() => navigate('/app')}>← Wróć do archiwum</button>
            </div>
          </div>
        </form>
      </div>
    </Background>
  );
}
