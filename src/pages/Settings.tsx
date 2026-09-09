import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import Background from '../components/Background';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Settings() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error('Podaj poprawny nowy adres email');
      return;
    }
    if (newEmail.trim() === userEmail) {
      toast.error('Nowy email jest taki sam jak obecny');
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success('Wysłano email potwierdzający na nowy adres. Sprawdź skrzynkę (także spam).');
      setNewEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się zmienić emaila');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordRequest = async (e: React.FormEvent) => {
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
      toast.error('Brak zalogowanego użytkownika');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signInError) throw new Error('Aktualne hasło jest nieprawidłowe');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetError) throw resetError;

      sessionStorage.setItem('pending_new_password', newPassword);
      toast.success('Wysłano email z potwierdzeniem. Sprawdź skrzynkę i kliknij przycisk aby ustawić nowe hasło.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się wysłać emaila');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Wpisz DELETE aby potwierdzić');
      return;
    }
    if (!confirm('Na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna. Wszystkie Twoje manual packs zostaną usunięte.')) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.rpc('delete_current_user' as any);
      if (error) throw error;
      toast.success('Konto usunięte');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Nie udało się usunąć konta. Skontaktuj się z supportem.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Background>
      <div className="min-h-dvh w-full flex flex-col items-center p-6 pt-24">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold">Settings</h1>
            <Link to="/app" className="btn btn-sm btn-ghost border border-base-300">← Back to Archive</Link>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow">
            <div className="card-body">
              <h2 className="card-title">Zmień adres email</h2>
              <p className="text-sm opacity-60">Aktualny: <span className="font-mono">{userEmail || '...'}</span></p>
              <p className="text-xs opacity-60">Wymaga potwierdzenia przez email wysłany przez Supabase (sprawdź nowy adres, także folder spam).</p>
              <form onSubmit={handleEmailChange} className="space-y-3 mt-2">
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="Nowy adres email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-warning w-full" disabled={emailLoading}>
                  {emailLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Wyślij email potwierdzający'}
                </button>
              </form>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow">
            <div className="card-body">
              <h2 className="card-title">Zmień hasło</h2>
              <p className="text-xs opacity-60">
                Wymaga potwierdzenia przez email. Email ma styl Manualist: tytuł <b>“Someone requested a password change”</b>, krótki opis i przycisk kierujący na podstronę <span className="font-mono">/update-password</span> gdzie wpiszesz nowe hasło. Dla bezpieczeństwa musisz podać aktualne hasło przed zmianą (weryfikacja poniżej i ponownie na stronie docelowej).
              </p>
              <form onSubmit={handlePasswordRequest} className="space-y-3 mt-2">
                <label className="form-control">
                  <span className="label label-text">Aktualne hasło *</span>
                  <input type="password" className="input input-bordered w-full" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </label>
                <label className="form-control">
                  <span className="label label-text">Nowe hasło *</span>
                  <input type="password" className="input input-bordered w-full" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                </label>
                <label className="form-control">
                  <span className="label label-text">Potwierdź nowe hasło *</span>
                  <input type="password" className="input input-bordered w-full" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </label>
                <button type="submit" className="btn btn-warning w-full" disabled={passwordLoading}>
                  {passwordLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Wyślij email z linkiem do zmiany hasła'}
                </button>
              </form>
              <div className="alert alert-info mt-3 py-2 text-xs">
                Po kliknięciu otrzymasz email. Przycisk w emailu przeniesie Cię na <span className="font-mono">/update-password</span> gdzie ponownie zweryfikujesz aktualne hasło i ustawisz nowe.
              </div>
            </div>
          </div>

          <div className="card bg-base-100 border border-error/50 shadow">
            <div className="card-body">
              <h2 className="card-title text-error">Usuń konto</h2>
              <p className="text-sm opacity-70">Nieodwracalnie usuwa konto, wszystkie pakiety manuali i pliki z bucketów. Wymaga potwierdzenia.</p>
              <label className="form-control mt-2">
                <span className="label label-text">Wpisz <b>DELETE</b> aby potwierdzić</span>
                <input className="input input-bordered w-full border-error" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
              </label>
              <button onClick={handleDeleteAccount} className="btn btn-error w-full mt-2" disabled={deleteLoading || deleteConfirm !== 'DELETE'}>
                {deleteLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Usuń konto na stałe'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Background>
  );
}
