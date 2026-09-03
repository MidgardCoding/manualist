import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';

export interface Manual {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  extracted_text: string | null;
  input_mode: 'ocr' | 'pdf' | 'text' | null;
  api_response: unknown | null;
  todo_response: unknown | null;
  file_names: string[] | null;
  todo_checked: boolean[] | null;
  created_at: string;
  updated_at: string;
}

export interface CreateManualPayload {
  title: string;
  description?: string | null;
  extracted_text: string;
  input_mode: 'ocr' | 'pdf' | 'text';
  api_response: unknown;
  todo_response: unknown;
  file_names?: string[];
}

const FALLBACK_KEY = 'manualist-fallback-manuals';

function getFallbackManuals(): Manual[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function useManuals() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchManuals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const fb = getFallbackManuals();
        setManuals(fb);
        return fb;
      }
      const { data, error: fetchError } = await supabase
        .from('manuals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      let list = (data as Manual[]) || [];
      // hydrate todo_checked from per-manual local fallback if column not yet migrated
      list = list.map((m: any) => {
        if ((m.todo_checked === null || m.todo_checked === undefined) && m.id) {
          try {
            const local = localStorage.getItem(`manualist-todo-${m.id}`);
            if (local) m.todo_checked = JSON.parse(local);
          } catch {}
        }
        // ensure array
        if (!Array.isArray(m.todo_checked)) m.todo_checked = [];
        return m;
      });
      // merge with fallback if Supabase has no table or empty but fallback has data
      const fb = getFallbackManuals();
      if (fb.length > 0) {
        // filter fallback that are not already in list
        const ids = new Set(list.map(m => m.id));
        const missing = fb.filter(m => !ids.has(m.id));
        if (missing.length > 0) list = [...missing, ...list];
      }
      setManuals(list);
      return list;
    } catch (err: any) {
      const rawMsg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      const msg = typeof rawMsg === 'string' ? rawMsg : 'Failed to fetch manuals';
      const code = err?.code ?? '';
      const isTableMissing =
        msg.includes('does not exist') ||
        msg.includes('PGRST205') ||
        msg.includes('not found') ||
        msg.includes('404') ||
        code === '42P01' ||
        code === 'PGRST205';
      if (isTableMissing) {
        console.warn('manuals table missing, using fallback', msg);
        const fb = getFallbackManuals();
        setManuals(fb);
        setError(null);
        return fb;
      }
      setError(msg);
      console.error('fetchManuals error', msg, err);
      return getFallbackManuals();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManuals();
  }, [fetchManuals]);

  const createManual = useCallback(async (payload: CreateManualPayload & { todo_checked?: boolean[] }): Promise<Manual | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return null;
      }
      const { data, error: insertError } = await supabase
        .from('manuals')
        .insert({
          user_id: user.id,
          title: payload.title,
          description: payload.description || null,
          extracted_text: payload.extracted_text,
          input_mode: payload.input_mode,
          api_response: payload.api_response,
          todo_response: payload.todo_response,
          file_names: payload.file_names || [],
          todo_checked: (payload as any).todo_checked ?? [],
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;
      toast.success('Manual saved to your archive');
      await fetchManuals();
      return data as Manual;
    } catch (err: any) {
      const rawMsg = err?.message ?? err?.details ?? JSON.stringify(err);
      const msg = typeof rawMsg === 'string' ? rawMsg : 'Failed to create manual';
      const code = err?.code ?? '';
      const isColumnMissing = msg.includes('todo_checked') || msg.includes('column') || code === '42703';
      if (isColumnMissing) {
        console.warn('todo_checked column missing, retrying without it', msg);
        try {
          const { data: { user: u2 } } = await supabase.auth.getUser();
          if (!u2) return null;
          const { data: retryData, error: retryErr } = await supabase
            .from('manuals')
            .insert({
              user_id: u2.id,
              title: payload.title,
              description: payload.description || null,
              extracted_text: payload.extracted_text,
              input_mode: payload.input_mode,
              api_response: payload.api_response,
              todo_response: payload.todo_response,
              file_names: payload.file_names || [],
            } as any)
            .select()
            .single();
          if (retryErr) throw retryErr;
          toast.success('Manual saved to your archive');
          await fetchManuals();
          return retryData as Manual;
        } catch (retryErr: any) {
          const retryMsg = retryErr?.message ?? JSON.stringify(retryErr);
          const isTableMissing =
            retryMsg.includes('does not exist') ||
            retryMsg.includes('PGRST205') ||
            retryMsg.includes('404') ||
            retryErr?.code === '42P01';
          if (isTableMissing) console.warn('manuals table missing, will use fallback storage', retryMsg);
          else toast.error(retryMsg);
          console.error('createManual retry error', retryErr);
          return null;
        }
      }
      const isTableMissing =
        msg.includes('does not exist') ||
        msg.includes('PGRST205') ||
        msg.includes('404') ||
        code === '42P01' ||
        code === 'PGRST205';
      if (isTableMissing) {
        console.warn('manuals table missing, will use fallback storage', msg);
      } else {
        toast.error(msg);
      }
      console.error('createManual error', err);
      return null;
    }
  }, [fetchManuals]);

  const updateManual = useCallback(async (
    id: string,
    updates: Partial<Pick<Manual, 'title' | 'description' | 'extracted_text' | 'input_mode' | 'api_response' | 'todo_response' | 'file_names' | 'todo_checked'>>
  ): Promise<Manual | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('manuals')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      toast.success('Manual updated');
      await fetchManuals();
      return data as Manual;
    } catch (err: any) {
      const rawMsg = err?.message ?? err?.details ?? JSON.stringify(err);
      const msg = typeof rawMsg === 'string' ? rawMsg : 'Failed to update manual';
      const code = err?.code ?? '';
      const isColumnMissing = msg.includes('todo_checked') && (msg.includes('column') || code === '42703');
      if (isColumnMissing) {
        console.warn('todo_checked column missing, retrying without it');
        const { todo_checked: _omit, ...rest } = updates as any;
        try {
          const { data: retryData, error: retryErr } = await supabase
            .from('manuals')
            .update(rest)
            .eq('id', id)
            .select()
            .single();
          if (retryErr) throw retryErr;
          // store todo_checked locally as fallback
          if ((updates as any).todo_checked !== undefined) {
            try {
              const fbKey = `manualist-todo-${id}`;
              localStorage.setItem(fbKey, JSON.stringify((updates as any).todo_checked));
            } catch {}
          }
          toast.success('Manual updated');
          await fetchManuals();
          return retryData as Manual;
        } catch (retryErr: any) {
          console.error('retry update failed', retryErr);
        }
      }
      const isTableMissing =
        msg.includes('does not exist') ||
        msg.includes('PGRST205') ||
        msg.includes('404') ||
        code === '42P01' ||
        code === 'PGRST205';
      if (isTableMissing) {
        try {
          const fb = getFallbackManuals();
          const idx = fb.findIndex(m => m.id === id);
          if (idx !== -1) {
            fb[idx] = { ...fb[idx], ...updates, updated_at: new Date().toISOString() } as Manual;
            localStorage.setItem(FALLBACK_KEY, JSON.stringify(fb));
            toast.success('Manual updated (local)');
            await fetchManuals();
            return fb[idx];
          }
        } catch (e) {
          console.error('fallback update failed', e);
        }
      }
      toast.error(msg);
      console.error('updateManual error', err);
      return null;
    }
  }, [fetchManuals]);

  const deleteManual = useCallback(async (id: string) => {
    try {
      const { error: delError } = await supabase.from('manuals').delete().eq('id', id);
      if (delError) throw delError;
      toast.success('Manual deleted');
      await fetchManuals();
    } catch (err: any) {
      const rawMsg = err?.message ?? JSON.stringify(err);
      const msg = typeof rawMsg === 'string' ? rawMsg : 'Failed to delete manual';
      const code = err?.code ?? '';
      const isTableMissing =
        msg.includes('does not exist') ||
        msg.includes('PGRST205') ||
        msg.includes('404') ||
        code === '42P01' ||
        code === 'PGRST205';
      if (isTableMissing) {
        try {
          const fb = getFallbackManuals().filter(m => m.id !== id);
          localStorage.setItem(FALLBACK_KEY, JSON.stringify(fb));
          toast.success('Manual deleted (local)');
          await fetchManuals();
          return;
        } catch (e) {
          console.error('fallback delete failed', e);
        }
      }
      toast.error(msg);
      console.error('deleteManual error', err);
    }
  }, [fetchManuals]);

  const getManual = useCallback(async (id: string): Promise<Manual | null> => {
    try {
      const { data, error: fetchError } = await supabase.from('manuals').select('*').eq('id', id).single();
      if (fetchError) throw fetchError;
      return data as Manual;
    } catch (err) {
      const fb = getFallbackManuals().find(m => m.id === id);
      if (fb) return fb;
      console.error('getManual error', err);
      return null;
    }
  }, []);

  return { manuals, loading, error, fetchManuals, createManual, updateManual, deleteManual, getManual, setManuals };
}
