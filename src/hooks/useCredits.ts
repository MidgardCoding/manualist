import { useCallback, useEffect, useState } from 'react';
import { supabase, isBenignLockError, getActiveUser } from '../utils/supabase';
import toast from 'react-hot-toast';
import { notifyOutOfCredits } from '../components/OutOfCreditsModal';

export default function useCredits() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const user = await getActiveUser();
      if (!user) {
        setCredits(null);
        return null;
      }
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_credits' as any);
      if (!rpcError && typeof rpcData === 'number') {
        setCredits(rpcData);
        return rpcData;
      }
      const { data, error } = await supabase.from('user_credits').select('credits').eq('user_id', user.id).single();
      if (error) {
        if ((error as any).code === 'PGRST116' || error.message?.includes('not found') || (error as any).code === '42P01' || error.message?.includes('does not exist')) {
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
      if (isBenignLockError(err)) {
        return null;
      }
      const msg = err?.message ?? 'Failed to fetch credits';
      setError(msg);
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
    const onCreditsUpdated = () => fetchCredits(true);
    window.addEventListener('focus', onFocus);
    window.addEventListener('credits-updated', onCreditsUpdated);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('credits-updated', onCreditsUpdated);
    };
  }, [fetchCredits]);

  const deduct = useCallback(async (amount: number): Promise<boolean> => {
    if (amount <= 0) return true;
    try {
      const user = await getActiveUser();
      if (!user) {
        toast.error('Please sign in first');
        return false;
      }
      const { data, error } = await supabase.rpc('deduct_credits' as any, { p_amount: amount });
      if (!error) {
        const newVal = typeof data === 'number' ? data : (credits ?? 10) - amount;
        setCredits(newVal);
        window.dispatchEvent(new Event('credits-updated'));
        if (newVal <= 0) notifyOutOfCredits(newVal);
        return true;
      }
      const msg = (error as any)?.message ?? '';
      const code = (error as any)?.code ?? '';
      if (msg.includes('Insufficient credits')) {
        toast.error(`Not enough credits (needs ${amount}). You have ${credits ?? 0}.`);
        const fresh = await fetchCredits(true);
        notifyOutOfCredits(typeof fresh === 'number' ? fresh : (credits ?? 0));
        return false;
      }
      if (msg.includes('does not exist') || code === '42883' || code === '42P01' || code === 'PGRST205' || msg.includes('Could not find')) {
        const { data: row } = await supabase.from('user_credits').select('credits').eq('user_id', user.id).single();
        let current = (row as any)?.credits;
        if (current === undefined || current === null) {
          current = 10;
        }
        if (current < amount) {
          toast.error(`Not enough credits. You have ${current}, but need ${amount}.`);
          notifyOutOfCredits(current);
          return false;
        }
        const next = current - amount;
        const { error: updErr } = await supabase.from('user_credits').update({ credits: next } as any).eq('user_id', user.id);
        if (updErr) {
          toast.error('Could not deduct credits');
          return false;
        }
        setCredits(next);
        window.dispatchEvent(new Event('credits-updated'));
        if (next <= 0) notifyOutOfCredits(next);
        return true;
      }
      toast.error(msg || 'Could not load your credits');
      return false;
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong with credits');
      return false;
    }
  }, [credits, fetchCredits]);

  const refund = useCallback(async (amount: number): Promise<void> => {
    if (amount <= 0) return;
    try {
      const user = await getActiveUser();
      if (!user) return;
      const { data, error } = await supabase.rpc('refund_credits' as any, { p_amount: amount });
      if (!error && typeof data === 'number') {
        setCredits(data);
        window.dispatchEvent(new Event('credits-updated'));
        return;
      }
      await fetchCredits(true);
    } catch {
    }
  }, [fetchCredits]);

  return { credits, loading, error, fetchCredits, deduct, refund, setCredits };
}
