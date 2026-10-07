import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

let activeUserInflight: Promise<any | null> | null = null;

export function getActiveUser(): Promise<any | null> {
  if (!activeUserInflight) {
    const task = (async (): Promise<any | null> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) return session.user as any;
      } catch {
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        return user ?? null;
      } catch {
        return null;
      }
    })();
    activeUserInflight = task;
    void task.then(() => {
      if (activeUserInflight === task) activeUserInflight = null;
    });
  }
  return activeUserInflight;
}

export function isBenignLockError(err: any): boolean {
  if (!err) return false;
  if (err.isAcquireTimeout) return true;
  const msg = (
    err.message ??
    err.error_description ??
    (typeof err === 'string' ? err : '')
  ).toString().toLowerCase();
  return (
    err.name === 'AbortError' ||
    msg.includes('steal') ||
    msg.includes('lock') ||
    msg.includes('abort')
  );
}
