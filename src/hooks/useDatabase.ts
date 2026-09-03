import { useCallback } from 'react';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export interface UseDatabaseReturn {
  uploadFile: (file: File, manualId?: string | null) => Promise<string | null>;
  uploadFilesToPack: (files: File[], manualId: string) => Promise<string[]>;
  getUserFiles: () => Promise<any[]>;
  getFilesForManual: (manualId: string) => Promise<any[]>;
  getPublicUrl: (path: string) => string;
  deleteFile: (id: string, path: string) => Promise<void>;
  deletePack: (manualId: string) => Promise<void>;
}

export default function useDatabase(): UseDatabaseReturn {
  const uploadFile = useCallback(async (file: File, manualId: string | null = null): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload files.');
        return null;
      }

      const fileName = `${uuidv4()}-${file.name}`;
      const filePath = manualId ? `${user.id}/${manualId}/${fileName}` : `${user.id}/${fileName}`;

      // Upload to storage (pack-isolated if manualId provided)
      const { error: uploadError } = await supabase.storage
        .from('user-manuals')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('violates')) {
          toast.error('Upload blocked by security policy. Check Storage RLS in Supabase dashboard.');
        } else {
          toast.error('Failed to upload file to storage.');
        }
        return null;
      }

      // Insert into user_files table with optional pack linkage
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        filename: file.name,
        storage_path: filePath,
        file_type: file.type,
      };
      // Add manual_id if column exists and pack is specified
      if (manualId) {
        (insertPayload as any).manual_id = manualId;
      }

      const { error: dbError } = await supabase
        .from('user_files')
        .insert(insertPayload as any);

      if (dbError) {
        // Fallback if manual_id column doesn't exist yet (migration not applied)
        const msg = (dbError as any)?.message ?? '';
        if (manualId && (msg.includes('manual_id') || msg.includes('column') || (dbError as any)?.code === '42703')) {
          console.warn('manual_id column missing, falling back to legacy insert', msg);
          const { error: retryError } = await supabase
            .from('user_files')
            .insert({
              user_id: user.id,
              filename: file.name,
              storage_path: filePath,
              file_type: file.type,
            } as any);
          if (retryError) {
            console.error('Database insert error (retry):', retryError);
            toast.error('File uploaded but failed to save registry.');
            return null;
          }
        } else {
          console.error('Database insert error:', dbError);
          toast.error('File uploaded but failed to save registry.');
          return null;
        }
      }

      // Only toast for legacy global uploads; pack uploads are silent (wizard handles its own toast)
      if (!manualId) toast.success('Your manual is saved in your library!');
      return filePath;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Something went wrong. Please try again later.');
      return null;
    }
  }, []);

  const uploadFilesToPack = useCallback(async (files: File[], manualId: string): Promise<string[]> => {
    const paths: string[] = [];
    for (const file of files) {
      const p = await uploadFile(file, manualId);
      if (p) paths.push(p);
    }
    return paths;
  }, [uploadFile]);

  const getUserFiles = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch files error:', error);
      return [];
    }

    return data || [];
  }, []);

  const getPublicUrl = useCallback((path: string): string => {
    const { data } = supabase.storage.from('user-manuals').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const getFilesForManual = useCallback(async (manualId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', user.id)
      .eq('manual_id', manualId)
      .order('created_at', { ascending: false });
    if (error) {
      // Fallback if manual_id column missing - return empty (pack not available)
      if ((error as any)?.code === '42703' || error.message?.includes('manual_id')) {
        console.warn('manual_id column not yet migrated, pack listing unavailable');
        return [];
      }
      console.error('Fetch pack files error:', error);
      return [];
    }
    return data || [];
  }, []);

  const deletePack = useCallback(async (manualId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // List all files in the pack folder
      const prefix = `${user.id}/${manualId}`;
      const { data: listed, error: listError } = await supabase.storage
        .from('user-manuals')
        .list(prefix);
      if (listError) {
        console.warn('Pack list error (may be empty)', listError);
      }
      if (listed && listed.length > 0) {
        const paths = listed.map((f: any) => `${prefix}/${f.name}`);
        const { error: storageError } = await supabase.storage
          .from('user-manuals')
          .remove(paths);
        if (storageError) console.error('Pack storage delete error:', storageError);
      }
      // Delete DB rows for this pack
      const { error: dbError } = await supabase
        .from('user_files')
        .delete()
        .eq('manual_id', manualId);
      if (dbError && (dbError as any)?.code !== '42703') {
        console.error('Pack DB delete error:', dbError);
      }
    } catch (err) {
      console.error('deletePack error', err);
    }
  }, []);

  const deleteFile = useCallback(async (id: string, path: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('user-manuals')
        .remove([path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      const { error: dbError } = await supabase
        .from('user_files')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('Database delete error:', dbError);
        toast.error('Failed to remove file registry.');
        return;
      }

      toast.success('File removed from library.');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Something went wrong.');
    }
  }, []);

  return { uploadFile, uploadFilesToPack, getUserFiles, getFilesForManual, getPublicUrl, deleteFile, deletePack };
}
