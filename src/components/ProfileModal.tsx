import { useEffect, useState } from 'react';
import { supabase, isBenignLockError, getActiveUser } from '../utils/supabase';
import toast from 'react-hot-toast';

const EMOJIS = ['😀','😎','🤖','🦊','🐱','🐶','🦉','🌟','🔥','💎','🚀','🎯','📚','🛠️','💡','❤️','🌈','🍀'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'emoji' | 'upload'>('emoji');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const safety = setTimeout(() => {
      if (!cancelled) setInitialLoading(false);
    }, 5000);
    const load = async () => {
      setInitialLoading(true);
      try {
        const user: any = await getActiveUser();
        if (cancelled) return;
        if (user) {
          const meta: any = user.user_metadata || {};
          setUsername(meta.display_name || meta.username || '');
          setAvatarUrl(meta.avatar_url || null);
          setAvatarEmoji(meta.avatar_emoji || null);
          setSelectedEmoji(meta.avatar_emoji || null);
          if (meta.avatar_url) setMode('upload');
          else setMode('emoji');
        }
      } catch (e: any) {
        console.warn('Profile load failed', e);
        if (!cancelled && !isBenignLockError(e)) toast.error(e.message || 'Could not load your profile');
      } finally {
        if (!cancelled) setInitialLoading(false);
        clearTimeout(safety);
      }
    };
    load();
    return () => { cancelled = true; clearTimeout(safety); };
  }, [isOpen]);

  useEffect(() => {
    if (!uploadFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);

  const handleSave = async () => {
    const cleanName = username.trim().replace(/[<>&"]/g, '');
    if (!cleanName) {
      toast.error('Please pick a username first');
      return;
    }
    if (cleanName.length < 3) {
      toast.error('Usernames need at least 3 characters');
      return;
    }
    if (mode === 'emoji' && !selectedEmoji) {
      toast.error('Please pick an emoji');
      return;
    }
    setLoading(true);
    try {
      const user: any = await getActiveUser();
      const userId = user?.id;
      if (!userId) throw new Error('No one is signed in — please sign in again');

      let finalAvatarUrl: string | null = avatarUrl;
      let finalAvatarEmoji: string | null = null;

      if (mode === 'upload' && uploadFile) {
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
        const rawExt = (uploadFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const ext = allowedExts.includes(rawExt) ? rawExt : 'jpg';
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(uploadFile.type)) {
          toast.error('Only JPG, PNG or WebP photos are allowed');
          setLoading(false);
          return;
        }
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          finalAvatarUrl = data.publicUrl;
          finalAvatarEmoji = null;
        } catch (uploadErr: any) {
          console.warn('Avatar upload failed, saving without avatar', uploadErr);
          if (uploadErr.message?.includes('Bucket not found') || uploadErr.message?.includes('404') || uploadErr.message?.includes('not found')) {
            toast.error('Avatar storage is not set up yet — saving just your name for now.');
            finalAvatarUrl = avatarUrl;
            finalAvatarEmoji = null;
          } else {
            throw uploadErr;
          }
        }
      } else if (mode === 'emoji') {
        finalAvatarEmoji = selectedEmoji;
        finalAvatarUrl = null;
      } else if (mode === 'upload' && !uploadFile && avatarUrl) {
        finalAvatarUrl = avatarUrl;
        finalAvatarEmoji = null;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: cleanName,
          username: cleanName,
          avatar_url: finalAvatarUrl,
          avatar_emoji: finalAvatarEmoji,
        }
      });
      if (error) throw error;
      toast.success('Profile saved');
      window.dispatchEvent(new Event('profile-updated'));
      onClose();
    } catch (err: any) {
      console.error(err);
      if (isBenignLockError(err)) {
        toast.error('Busy for a moment — please try saving again');
      } else {
        toast.error(err.message || 'Could not save your profile');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayAvatar = mode === 'upload' ? (previewUrl || avatarUrl) : null;
  const displayEmoji = mode === 'emoji' ? (selectedEmoji || avatarEmoji) : null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md bg-base-100 border border-base-300 shadow-2xl rounded-3xl">
        <button aria-label="Close profile" onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-extrabold text-xl mb-1">Your profile</h3>
        <p className="text-sm opacity-70 mb-4">This is how you show up in the top bar. Keep it friendly.</p>
        {initialLoading ? (
          <div className="flex justify-center py-8"><span className="loading loading-spinner"></span></div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-24 h-24 rounded-full bg-base-200 border-2 border-base-300 flex items-center justify-center overflow-hidden text-4xl">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="Your profile avatar" className="w-full h-full object-cover" />
                ) : displayEmoji ? (
                  <span>{displayEmoji}</span>
                ) : (
                  <span className="opacity-40">👤</span>
                )}
              </div>
              <p className="text-xs opacity-60">Your avatar in the top bar</p>
            </div>

            <label className="form-control w-full mb-4">
              <span className="label label-text font-semibold">Username</span>
              <input
                className="input input-bordered w-full rounded-2xl"
                placeholder="e.g. Alex Morgan"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={30}
              />
            </label>

            <div className="tabs tabs-boxed mb-3 rounded-full p-1" role="tablist">
              <button type="button" role="tab" aria-selected={mode === 'emoji'} className={`tab rounded-full ${mode === 'emoji' ? 'tab-active' : ''}`} onClick={() => setMode('emoji')}>Emoji</button>
              <button type="button" role="tab" aria-selected={mode === 'upload'} className={`tab rounded-full ${mode === 'upload' ? 'tab-active' : ''}`} onClick={() => setMode('upload')}>Upload a photo</button>
            </div>

            {mode === 'emoji' ? (
              <div className="grid grid-cols-6 gap-2 p-2 bg-base-200 rounded-2xl mb-4">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setSelectedEmoji(e)}
                    className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center hover:bg-base-300 transition ${selectedEmoji === e ? 'bg-warning ring-2 ring-warning ring-offset-2' : 'bg-base-100'}`}
                    type="button"
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : (
              <label className="form-control w-full mb-4">
                <span className="label label-text">Pick a photo (max 2MB, JPG / PNG / WebP)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="file-input file-input-bordered w-full rounded-2xl"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 2 * 1024 * 1024) {
                        toast.error('That file is too big (max 2MB)');
                        return;
                      }
                      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
                        toast.error('Only JPG, PNG or WebP photos are allowed');
                        return;
                      }
                      setUploadFile(f);
                    }
                  }}
                />
                {previewUrl && <p className="text-xs opacity-60 mt-1">Preview is shown above</p>}
                {avatarUrl && !previewUrl && <p className="text-xs opacity-60 mt-1 truncate">Current: {avatarUrl}</p>}
              </label>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost rounded-full" onClick={onClose} disabled={loading}>Cancel</button>
              <button className="btn btn-primary rounded-2xl text-amber-900 font-bold" onClick={handleSave} disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop bg-black/30" onClick={onClose}></div>
    </div>
  );
}
