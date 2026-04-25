import { useCallback } from 'react';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

export interface UseDatabaseReturn {
  uploadFile: (file: File) => Promise<string | null>;
  getUserFiles: () => Promise<any[]>;
  getPublicUrl: (path: string) => string;
  deleteFile: (id: string, path: string) => Promise<void>;
}

export default function useDatabase(): UseDatabaseReturn {
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload files.');
        return null;
      }

      const fileName = `${uuidv4()}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
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

      // Insert into user_files table
      const { error: dbError } = await supabase
        .from('user_files')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: filePath,
          file_type: file.type,
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        toast.error('File uploaded but failed to save registry.');
        return null;
      }

      toast.success('Your manual is saved in your library!');
      return filePath;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Something went wrong. Please try again later.');
      return null;
    }
  }, []);

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

  return { uploadFile, getUserFiles, getPublicUrl, deleteFile };
}
