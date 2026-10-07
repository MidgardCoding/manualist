import { useEffect, useState } from 'react';
import { supabase, isBenignLockError, getActiveUser } from '../utils/supabase';
import Background from '../components/Background';
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
    let cancelled = false;
    getActiveUser()
      .then((user) => {
        if (!cancelled) setUserEmail(user?.email ?? null);
      })
      .catch((err) => {
        console.warn('Settings load failed', err);
        if (!cancelled && !isBenignLockError(err)) toast.error(err.message || 'Could not load your account');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = newEmail.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error('Please enter a valid new email address');
      return;
    }
    if (normalizedEmail === userEmail?.toLowerCase()) {
      toast.error('That is already your current email');
      return;
    }
    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: normalizedEmail });
      if (error) throw error;
      toast.success('Confirmation email sent to your new address. Check your inbox (and spam too).');
      setNewEmail('');
      setEmailLoading(false);
      setTimeout(() => window.location.reload(), 2500);
      return;
    } catch (err: any) {
      if (isBenignLockError(err)) toast.error('Busy for a moment — please try again');
      else toast.error(err.message || 'Could not change your email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordRequest = async (e: React.FormEvent) => {
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
      toast.error('No one is signed in right now');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signInError) throw new Error('Your current password is not correct');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetError) throw resetError;

      toast.success('Confirmation email sent. Check your inbox and click the button to set your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordLoading(false);
      setTimeout(() => window.location.reload(), 2500);
      return;
    } catch (err: any) {
      if (isBenignLockError(err)) toast.error('Busy for a moment — please try again');
      else toast.error(err.message || 'Could not send the email');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    if (!confirm('Really delete your account? This cannot be undone. All your saved manuals will be gone.')) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.rpc('delete_current_user' as any);
      if (error) throw error;
      toast.success('Account deleted');
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore sign-out errors after deletion — still leave the session
      }
      window.location.href = '/';
    } catch (err: any) {
      console.error(err);
      if (isBenignLockError(err)) toast.error('Busy for a moment — please try again');
      else toast.error(err.message || 'Could not delete your account. Please contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Background>
      <div className="w-full flex flex-col items-center px-4 sm:px-6 pt-24 pb-16">
        <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-bold uppercase tracking-widest text-warning">Your account</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Settings</h1>
              <p className="text-lg opacity-75 mt-1">Small tweaks, all in plain words. Nothing scary here.</p>
            </div>
            <a href="/app" className="btn btn-ghost rounded-full border border-base-300 bg-base-100 shadow-sm shrink-0">← Back</a>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl">
            <div className="card-body">
              <h2 className="card-title">Change your email</h2>
              <p className="text-sm opacity-60">Current: <span className="font-mono">{userEmail || '...'}</span></p>
              <p className="text-xs opacity-60">We will send a confirmation to the new address (check spam too).</p>
              <form onSubmit={handleEmailChange} className="space-y-3 mt-2">
                <input
                  type="email"
                  className="input input-bordered w-full rounded-2xl"
                  placeholder="New email address"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary rounded-2xl text-amber-900 font-bold w-full" disabled={emailLoading}>
                  {emailLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Send confirmation email'}
                </button>
              </form>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300 shadow-xl rounded-3xl">
            <div className="card-body">
              <h2 className="card-title">Change your password</h2>
              <p className="text-xs opacity-60">
                For safety we confirm it by email. You will get a friendly email titled <b>“Someone requested a password change”</b> with
                a button that takes you to <span className="font-mono">/update-password</span>, where you set the new password.
                Please enter your current password first.
              </p>
              <form onSubmit={handlePasswordRequest} className="space-y-3 mt-2">
                <label className="form-control">
                  <span className="label label-text">Current password *</span>
                  <input type="password" className="input input-bordered w-full rounded-2xl" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </label>
                <label className="form-control">
                  <span className="label label-text">New password *</span>
                  <input type="password" className="input input-bordered w-full rounded-2xl" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                </label>
                <label className="form-control">
                  <span className="label label-text">Repeat the new password *</span>
                  <input type="password" className="input input-bordered w-full rounded-2xl" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </label>
                <button type="submit" className="btn btn-primary rounded-2xl text-amber-900 font-bold w-full" disabled={passwordLoading}>
                  {passwordLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Email me the password link'}
                </button>
              </form>
              <div className="alert mt-3 py-2 text-xs rounded-2xl">
                Click the button in the email to confirm your current password and set a new one.
              </div>
            </div>
          </div>

          <div className="card bg-base-100 border border-error/50 shadow-xl rounded-3xl">
            <div className="card-body">
              <h2 className="card-title text-error">Delete your account</h2>
              <p className="text-sm opacity-70">This removes your account, all saved manuals, and files for good. Please be sure first.</p>
              <label className="form-control mt-2">
                <span className="label label-text">Type <b>DELETE</b> to confirm</span>
                <input className="input input-bordered w-full border-error rounded-2xl" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
              </label>
              <button onClick={handleDeleteAccount} className="btn btn-error rounded-2xl w-full mt-2" disabled={deleteLoading || deleteConfirm !== 'DELETE'}>
                {deleteLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Delete my account for good'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Background>
  );
}
