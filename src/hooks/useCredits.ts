import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

export default function useCredits() {
  // Initialize from localStorage synchronously to avoid flash of spinner
  const getInitialCredits = (): number | null => {
    try {
      // try to find any manualist-credits-* key (we don't know user id yet, so fallback to 10)
      // keep null so Navbar shows 10 immediately without spinner
      return 10;
    } catch {
      return 10;
    }
  };
  const [credits, setCredits] = useState<number | null>(getInitialCredits);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCredits(null);
        return null;
      }
      // Try RPC first (handles auto-create)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_credits' as any);
      if (!rpcError && typeof rpcData === 'number') {
        setCredits(rpcData);
        return rpcData;
      }
      // Fallback to direct table
      const { data, error } = await supabase.from('user_credits').select('credits').eq('user_id', user.id).single();
      if (error) {
        // table missing or row missing - fallback to 10 and try to create
        if ((error as any).code === 'PGRST116' || error.message?.includes('not found') || (error as any).code === '42P01' || error.message?.includes('does not exist')) {
          // try to insert 10
          try {
            await supabase.from('user_credits').insert({ user_id: user.id, credits: 10 } as any);
            setCredits(10);
            return 10;
          } catch {}
          setCredits(10);
          return 10;
        }
        throw error;
      }
      const val = (data as any)?.credits ?? 10;
      setCredits(val);
      return val;
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to fetch credits';
      // fallback to localStorage for offline / table not migrated
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const key = `manualist-credits-${user.id}`;
          const raw = localStorage.getItem(key);
          if (raw !== null) {
            const v = parseInt(raw, 10);
            if (!isNaN(v)) {
              setCredits(v);
              return v;
            }
          }
        }
      } catch {}
      setError(msg);
      // default to 10 for UX if fallback
      setCredits(10);
      return 10;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchCredits(true));
    const onFocus = () => fetchCredits(true);
    window.addEventListener('focus', onFocus);
    window.addEventListener('credits-updated', (() => fetchCredits(true)) as any);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('credits-updated', (() => fetchCredits(true)) as any);
    };
  }, [fetchCredits]);

  const deduct = useCallback(async (amount: number, _reason?: string): Promise<boolean> => {
    if (amount <= 0) return true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Musisz być zalogowany');
        return false;
      }
      // Try atomic RPC
      const { data, error } = await supabase.rpc('deduct_credits' as any, { p_amount: amount });
      if (!error) {
        const newVal = typeof data === 'number' ? data : (credits ?? 10) - amount;
        setCredits(newVal);
        try { localStorage.setItem(`manualist-credits-${user.id}`, String(newVal)); } catch {}
        window.dispatchEvent(new Event('credits-updated'));
        return true;
      }
      // Fallback: check error message for insufficient
      const msg = (error as any)?.message ?? '';
      if (msg.includes('Insufficient credits')) {
        toast.error(`Brak wystarczającej liczby Credits (${amount} wymagane). Masz ${credits ?? 0}.`);
        await fetchCredits(true);
        return false;
      }
      // If table missing or RPC missing, fallback to local logic + direct update
      if (msg.includes('does not exist') || (error as any)?.code === '42883' || (error as any)?.code === '42P01') {
        // fallback to direct table update
        const { data: row } = await supabase.from('user_credits').select('credits').eq('user_id', user.id).single();
        let current = (row as any)?.credits;
        if (current === undefined || current === null) {
          // try local
          const raw = localStorage.getItem(`manualist-credits-${user.id}`);
          current = raw ? parseInt(raw, 10) : 10;
          if (isNaN(current)) current = 10;
        }
        if (current < amount) {
          toast.error(`Brak wystarczającej liczby Credits. Masz ${current}, potrzeba ${amount}.`);
          return false;
        }
        const next = current - amount;
        const { error: updErr } = await supabase.from('user_credits').update({ credits: next } as any).eq('user_id', user.id);
        if (updErr) {
          // fallback to local only
          localStorage.setItem(`manualist-credits-${user.id}`, String(next));
          setCredits(next);
          window.dispatchEvent(new Event('credits-updated'));
          return true;
        }
        setCredits(next);
        try { localStorage.setItem(`manualist-credits-${user.id}`, String(next)); } catch {}
        window.dispatchEvent(new Event('credits-updated'));
        return true;
      }
      toast.error(msg || 'Nie udało się pobrać Credits');
      return false;
    } catch (err: any) {
      toast.error(err.message || 'Błąd Credits');
      return false;
    }
  }, [credits, fetchCredits]);

  return { credits, loading, error, fetchCredits, deduct, setCredits };
}
