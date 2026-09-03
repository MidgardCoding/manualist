import { useState } from 'react';
import type { Manual } from '../hooks/useManuals';
import useManuals from '../hooks/useManuals';
import useDatabase from '../hooks/useDatabase';
import { extractText, getDocumentProxy } from 'unpdf';
import useTesseract from '../hooks/useTesseract';
import sendPromptToOpenRouter, { sendToDoPrompt } from '../text-generation/OpenRouter';
import { parseApiResponse } from '../utils/parseApiResponse';
import toast from 'react-hot-toast';

interface Props {
  manual: Manual;
  onCheck: (manual: Manual) => void;
  onRefresh: () => void;
}

export default function ManualTile({ manual, onCheck, onRefresh }: Props) {
  const { updateManual, deleteManual } = useManuals();
  const { recognize } = useTesseract();
  const { uploadFilesToPack, deletePack } = useDatabase();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(manual.title);
  const [description, setDescription] = useState(manual.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // file editing states
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editText, setEditText] = useState(manual.extracted_text || '');
  const [fileModeChanged, setFileModeChanged] = useState(false);

  const hasAiData = !!(manual.api_response && manual.todo_response);

  const handleSaveMeta = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    const updates: Partial<Manual> = {
      title: title.trim(),
      description: description.trim() || null,
    };

    // If files were changed, we need to re-extract, regenerate AI data, and handle pack isolation
    if (fileModeChanged) {
      let newExtracted = editText;
      let inputMode: 'ocr' | 'pdf' | 'text' = manual.input_mode || 'text';
      let newFileNames: string[] = [];

      try {
        if (editFiles.length > 0) {
          newFileNames = editFiles.map(f => f.name);
          if (editFiles.length === 1 && editFiles[0].type === 'application/pdf') {
            inputMode = 'pdf';
            const buffer = await editFiles[0].arrayBuffer();
            const pdf = await getDocumentProxy(new Uint8Array(buffer));
            const { text } = await extractText(pdf, { mergePages: true });
            newExtracted = text;
          } else if (editFiles.some(f => f.type.startsWith('image/'))) {
            inputMode = 'ocr';
            const results = await Promise.all(editFiles.map(f => recognize(f)));
            newExtracted = results.map(r => r.data.text).join('\n\n');
          } else {
            inputMode = 'text';
            newFileNames = editFiles.map(f => f.name);
          }
        } else {
          inputMode = 'text';
          newExtracted = editText;
          newFileNames = manual.file_names || [];
          // text mode: if edited text differs, keep existing file_names but pack will be cleared
          if (editText.trim() !== (manual.extracted_text || '').trim()) {
            newFileNames = [];
          }
        }

        if (!newExtracted.trim()) {
          toast.error('Extracted text is empty');
          setSaving(false);
          return;
        }

        toast.loading('Regenerating analysis...', { id: 'regen' });
        const [apiRes, todoRes] = await Promise.all([
          sendPromptToOpenRouter(newExtracted),
          sendToDoPrompt(newExtracted),
        ]);
        toast.dismiss();

        // Reset todo checkboxes for new pack (new content = fresh unchecked steps)
        let initialChecked: boolean[] = [];
        try {
          const parsed = parseApiResponse(todoRes as any);
          initialChecked = Array(parsed.sections.length).fill(false);
        } catch {
          initialChecked = [];
        }

        (updates as any).extracted_text = newExtracted;
        (updates as any).input_mode = inputMode;
        (updates as any).api_response = apiRes;
        (updates as any).todo_response = todoRes;
        (updates as any).file_names = newFileNames.length > 0 ? newFileNames : [];
        (updates as any).todo_checked = initialChecked;

        // Also clear per-pack todo localStorage so old checks don't leak
        try {
          localStorage.removeItem(`manualist-todo-${manual.id}`);
        } catch {}

      } catch (err) {
        toast.dismiss();
        console.error(err);
        toast.error('Failed to regenerate analysis');
        setSaving(false);
        return;
      }

      // Handle pack file isolation: delete old pack files and upload new ones to this manual's pack
      try {
        // Remove old pack files (isolated per manual)
        await deletePack(manual.id);
        if (editFiles.length > 0) {
          await uploadFilesToPack(editFiles, manual.id);
          toast.success('Pack files updated');
        } else if ((updates as any).input_mode === 'text') {
          // text packs have no files, ensure pack is empty
        }
      } catch (e) {
        console.warn('Pack file handling failed', e);
      }
    }

    const res = await updateManual(manual.id, updates as any);
    setSaving(false);
    if (res) {
      // Persist new todo_checked locally as well for immediate UI
      if ((updates as any).todo_checked) {
        try {
          localStorage.setItem(`manualist-todo-${manual.id}`, JSON.stringify((updates as any).todo_checked));
        } catch {}
      }
      setEditing(false);
      setFileModeChanged(false);
      setEditFiles([]);
      onRefresh();
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${manual.title}"?`)) return;
    setDeleting(true);
    // Delete isolated pack first (storage + user_files rows)
    try {
      await deletePack(manual.id);
    } catch (e) {
      console.warn('Failed to delete pack storage', e);
    }
    try {
      localStorage.removeItem(`manualist-todo-${manual.id}`);
    } catch {}
    await deleteManual(manual.id);
    setDeleting(false);
    onRefresh();
  };

  const handleCheck = () => {
    // if AI data missing due to file change that cleared it, warn
    if (!hasAiData) {
      toast.error('This manual needs regeneration. Please edit files and save to regenerate.');
      return;
    }
    onCheck(manual);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEditFiles(Array.from(e.target.files));
      setFileModeChanged(true);
    }
  };

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    // mark as changed only if different from original
    setFileModeChanged(e.target.value !== (manual.extracted_text || ''));
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md hover:shadow-xl transition-shadow flex flex-col">
      <div className="card-body p-5 flex flex-col gap-3">
        {!editing ? (
          <>
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-lg line-clamp-2 flex-1">{manual.title}</h3>
              <span className={`badge badge-xs ${hasAiData ? 'badge-success' : 'badge-warning'}`}>
                {hasAiData ? 'Ready' : 'Needs regeneration'}
              </span>
            </div>
            {manual.description ? (
              <p className="text-sm opacity-70 line-clamp-3">{manual.description}</p>
            ) : (
              <p className="text-sm opacity-40 italic">No description</p>
            )}
            <div className="text-xs opacity-50">
              {new Date(manual.created_at).toLocaleDateString()} | {manual.input_mode?.toUpperCase() || '—'} | {Array.isArray(manual.file_names) ? manual.file_names.length : 0} file(s)
            </div>
            {!hasAiData && (
              <div className="alert alert-warning py-2 text-xs">
                Files were changed - analysis was cleared. Edit and save to regenerate.
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button className="btn btn-warning btn-sm flex-1" onClick={handleCheck} disabled={!hasAiData}>
                Check
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn btn-ghost btn-sm text-error" onClick={handleDelete} disabled={deleting}>
                {deleting ? <span className="loading loading-spinner loading-xs" /> : 'Delete'}
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              className="input input-bordered input-sm w-full"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title *"
            />
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="divider my-1 text-xs opacity-50">Files</div>
            <p className="text-xs opacity-60 truncate">
              Current: {Array.isArray(manual.file_names) && manual.file_names.length ? manual.file_names.join(', ') : '—'}
            </p>

            {manual.input_mode === 'text' || (!manual.input_mode && editFiles.length === 0) ? (
              <textarea
                className="textarea textarea-bordered w-full text-sm"
                rows={4}
                value={editText}
                onChange={onTextChange}
                placeholder="Edit manual text..."
              />
            ) : null}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold">Replace files (optional):</label>
              <input
                type="file"
                multiple
                accept={manual.input_mode === 'pdf' ? '.pdf' : manual.input_mode === 'ocr' ? 'image/*' : '.pdf,image/*'}
                onChange={onFileChange}
                className="file-input file-input-bordered file-input-sm w-full"
              />
              {editFiles.length > 0 && (
                <div className="text-xs opacity-70 truncate">
                  Selected: {editFiles.map(f => f.name).join(', ')}
                </div>
              )}
              {fileModeChanged && (
                <div className="alert alert-info py-2 text-xs">
                  Saving will delete previous to-do, table of contents and quick summary and regenerate them.
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <button className="btn btn-warning btn-sm flex-1" onClick={handleSaveMeta} disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-xs" /> : 'Save'}
              </button>
              <button
                className="btn btn-ghost btn-sm flex-1"
                onClick={() => {
                  setEditing(false);
                  setTitle(manual.title);
                  setDescription(manual.description || '');
                  setEditText(manual.extracted_text || '');
                  setEditFiles([]);
                  setFileModeChanged(false);
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
