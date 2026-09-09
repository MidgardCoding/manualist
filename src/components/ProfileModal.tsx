import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
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
    const load = async () => {
      setInitialLoading(true);
      try {
        // Prefer getSession (local, instant) over getUser (network) to avoid hangs
        const { data: { session } } = await supabase.auth.getSession();
        let user: any = (session as any)?.user;
        if (!user) {
          // fallback to getUser if no session (e.g. after refresh)
          const { data: { user: u } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as any));
          user = u;
        }
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
      } catch (e) {
        console.warn('Profile load failed', e);
        // Nie blokuj UI - pokaż formularz z pustymi wartościami, nie toastem
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
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
    if (!username.trim()) {
      toast.error('Nazwa użytkownika nie może być pusta');
      return;
    }
    if (username.trim().length < 3) {
      toast.error('Nazwa musi mieć co najmniej 3 znaki');
      return;
    }
    setLoading(true);
    try {
      // Użyj getSession zamiast getUser - lokalne, natychmiastowe, nie wymaga sieci
      const { data: { session } } = await supabase.auth.getSession();
      let user: any = (session as any)?.user;
      if (!user) {
        const { data: { user: u } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } } as any));
        user = u;
      }
      const userId = user?.id;
      if (!userId) throw new Error('Brak zalogowanego użytkownika - zaloguj się ponownie');

      let finalAvatarUrl: string | null = avatarUrl;
      let finalAvatarEmoji: string | null = null;

      if (mode === 'upload' && uploadFile) {
        const ext = uploadFile.name.split('.').pop() || 'jpg';
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        try {
          const { error: uploadError } = await supabase.storage.from('avatars').upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          finalAvatarUrl = data.publicUrl;
          finalAvatarEmoji = null;
        } catch (uploadErr: any) {
          console.warn('Avatar upload failed, saving without avatar', uploadErr);
          if (uploadErr.message?.includes('Bucket not found') || uploadErr.message?.includes('404') || uploadErr.message?.includes('not found')) {
            toast.error('Bucket avatars nie istnieje - uruchom poprawioną migrację 004. Zapisuję samą nazwę.');
            finalAvatarUrl = avatarUrl;
            finalAvatarEmoji = null;
          } else {
            throw uploadErr;
          }
        }
      } else if (mode === 'emoji') {
        if (!selectedEmoji) {
          toast.error('Wybierz emoji');
          setLoading(false);
          return;
        }
        finalAvatarEmoji = selectedEmoji;
        finalAvatarUrl = null;
      } else if (mode === 'upload' && !uploadFile && avatarUrl) {
        finalAvatarUrl = avatarUrl;
        finalAvatarEmoji = null;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: username.trim(),
          username: username.trim(),
          avatar_url: finalAvatarUrl,
          avatar_emoji: finalAvatarEmoji,
        }
      });
      if (error) throw error;
      toast.success('Profil zaktualizowany');
      onClose();
      setTimeout(() => window.location.reload(), 500);
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Nie udało się zapisać profilu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayAvatar = mode === 'upload' ? (previewUrl || avatarUrl) : null;
  const displayEmoji = mode === 'emoji' ? (selectedEmoji || avatarEmoji) : null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-md bg-base-100">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        <h3 className="font-bold text-lg mb-4">Profile</h3>
        {initialLoading ? (
          <div className="flex justify-center py-8"><span className="loading loading-spinner"></span></div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-24 h-24 rounded-full bg-base-200 border-2 border-base-300 flex items-center justify-center overflow-hidden text-4xl">
                {displayAvatar ? (
                  <img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : displayEmoji ? (
                  <span>{displayEmoji}</span>
                ) : (
                  <span className="opacity-40">👤</span>
                )}
              </div>
              <p className="text-xs opacity-60">Twój awatar w nawigacji</p>
            </div>

            <label className="form-control w-full mb-4">
              <span className="label label-text font-semibold">Nazwa użytkownika</span>
              <input
                className="input input-bordered w-full"
                placeholder="np. Jan Kowalski"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={30}
              />
            </label>

            <div className="tabs tabs-boxed mb-3">
              <a className={`tab ${mode === 'emoji' ? 'tab-active' : ''}`} onClick={() => setMode('emoji')}>Emoji</a>
              <a className={`tab ${mode === 'upload' ? 'tab-active' : ''}`} onClick={() => setMode('upload')}>Upload obrazka</a>
            </div>

            {mode === 'emoji' ? (
              <div className="grid grid-cols-6 gap-2 p-2 bg-base-200 rounded-lg mb-4">
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
                <span className="label label-text">Wybierz obrazek (max 2MB, JPG/PNG/WebP)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="file-input file-input-bordered w-full"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 2 * 1024 * 1024) {
                        toast.error('Plik za duży (max 2MB)');
                        return;
                      }
                      setUploadFile(f);
                    }
                  }}
                />
                {previewUrl && <p className="text-xs opacity-60 mt-1">Podgląd powyżej</p>}
                {avatarUrl && !previewUrl && <p className="text-xs opacity-60 mt-1 truncate">Aktualny: {avatarUrl}</p>}
              </label>
            )}

            <div className="modal-action">
              <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Anuluj</button>
              <button className="btn btn-warning" onClick={handleSave} disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Zapisz'}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="modal-backdrop bg-black/30" onClick={onClose}></div>
    </div>
  );
}
