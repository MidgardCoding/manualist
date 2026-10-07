import { useCallback, useEffect, useState } from 'react';
import { supabase, isBenignLockError, getActiveUser } from '../utils/supabase';
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

export default function useManuals() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchManuals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await getActiveUser();
      if (!user) {
        setManuals([]);
        return [];
      }
      const { data, error: fetchError } = await supabase
        .from('manuals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      let list = (data as Manual[]) || [];
      list = list.map((m: any) => {
        if (!Array.isArray(m.todo_checked)) m.todo_checked = [];
        return m;
      });
      setManuals(list);
      return list;
    } catch (err: any) {
      if (isBenignLockError(err)) {
        console.warn('fetchManuals lock contention', err);
        return [];
      }
      const rawMsg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      const msg = typeof rawMsg === 'string' ? rawMsg : 'Failed to fetch manuals';
      const code = err?.code ?? '';
      if (code === '57014' || msg.includes('statement timeout')) {
        console.warn('fetchManuals query timeout — returning empty list', msg);
        setError(null);
        return [];
      }
      setError(msg);
      console.error('fetchManuals error', msg, err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManuals();
  }, [fetchManuals]);

  const createManual = useCallback(async (payload: CreateManualPayload & { todo_checked?: boolean[] }): Promise<Manual | null> => {
    try {
      const user = await getActiveUser();
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
      toast.error(msg);
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
      console.error('getManual error', err);
      return null;
    }
  }, []);

  return { manuals, loading, error, fetchManuals, createManual, updateManual, deleteManual, getManual, setManuals };
}
