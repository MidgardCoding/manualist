import { useEffect, useState } from 'react';
import { supabase, getActiveUser } from '../utils/supabase';
import Background from '../components/Background';
import toast from 'react-hot-toast';

export default function UpdatePassword() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const init = async () => {
      const user = await getActiveUser();
      setUserEmail((user as any)?.email ?? null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
      }
      setCheckingSession(false);
    };
    init();
    // Listen for recovery event (when user clicks email link with ?type=recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        toast.success('Link confirmed — now set your new password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Your new password needs at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('The passwords do not match');
      return;
    }
    if (!userEmail) {
      // Try to get email from session
      const user = await getActiveUser();
      if (!(user as any)?.email) {
        toast.error('No one is signed in. Please sign in again.');
        return;
      }
      setUserEmail((user as any).email);
    }
    const emailToVerify = userEmail || (await getActiveUser() as any)?.email;
    if (!emailToVerify) {
      toast.error('Could not find your email address');
      return;
    }

    setLoading(true);
    try {
      // Double-check the current password, both here and on the Settings page
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToVerify,
        password: currentPassword,
      });
      if (signInError) throw new Error('Your current password is not correct');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      try { sessionStorage.removeItem('pending_new_password'); } catch { }
      toast.success('Password changed — all done');
      setTimeout(() => {
        window.location.href = '/app';
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Could not change your password');
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
        <form onSubmit={handleSubmit} className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl w-full max-w-md">
          <div className="card-body">
            <h1 className="text-2xl font-extrabold text-center">Set a new password</h1>
            <p className="text-sm opacity-60 text-center">Someone asked to change this password — if that was you, enter your current password and pick a new one below.</p>
            {userEmail && <p className="text-xs opacity-60 text-center">Signed in as: <span className="font-mono">{userEmail}</span></p>}

            <label className="form-control mt-2">
              <span className="label label-text font-semibold">Current password *</span>
              <input type="password" className="input input-bordered w-full rounded-2xl" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Type your current password to confirm" />
              <span className="label label-text-alt opacity-60">We ask for this to keep your account safe</span>
            </label>
            <label className="form-control">
              <span className="label label-text font-semibold">New password *</span>
              <input type="password" className="input input-bordered w-full rounded-2xl" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </label>
            <label className="form-control">
              <span className="label label-text font-semibold">Repeat the new password *</span>
              <input type="password" className="input input-bordered w-full rounded-2xl" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </label>

            <button type="submit" className="btn btn-primary rounded-2xl text-amber-900 font-bold w-full mt-2" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Change my password'}
            </button>
            <div className="text-center mt-3">
              <button type="button" className="link link-primary text-xs" onClick={() => (window.location.href = '/app')}>← Back to my manuals</button>
            </div>
          </div>
        </form>
      </div>
    </Background>
  );
}
