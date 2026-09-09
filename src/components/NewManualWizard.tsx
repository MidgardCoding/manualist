import { useState, useCallback } from 'react';
import { extractText, getDocumentProxy } from 'unpdf';
import useTesseract from '../hooks/useTesseract';
import useDatabase from '../hooks/useDatabase';
import useManuals from '../hooks/useManuals';
import useCredits from '../hooks/useCredits';
import sendPromptToOpenRouter, { sendToDoPrompt } from '../text-generation/OpenRouter';
import { parseApiResponse } from '../utils/parseApiResponse';
import { supabase } from '../utils/supabase';
import type { InputMode } from '../types';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type WizardStep = 'meta' | 'method' | 'input' | 'extracting' | 'generating';

export default function NewManualWizard({ open, onClose, onCreated }: Props) {
  const [wizardStep, setWizardStep] = useState<WizardStep>('meta');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [inputMode, setInputMode] = useState<InputMode | undefined>(undefined);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [plainText, setPlainText] = useState('');
  const [extractedPreview, setExtractedPreview] = useState('');
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const { recognize } = useTesseract();
  const { uploadFilesToPack } = useDatabase();
  const { createManual } = useManuals();
  const { deduct } = useCredits();

  const resetAll = useCallback(() => {
    setWizardStep('meta');
    setTitle('');
    setDescription('');
    setInputMode(undefined);
    setLocalFiles([]);
    setPlainText('');
    setExtractedPreview('');
    setGenerating(false);
    setExtracting(false);
  }, []);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleContinueMeta = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setWizardStep('method');
  };

  const handleSelectMethod = (mode: InputMode) => {
    setInputMode(mode);
    setLocalFiles([]);
    setPlainText('');
    setExtractedPreview('');
    setWizardStep('input');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setLocalFiles(newFiles);
      // Files are now stored per-manual pack after generation; no global upload here
      // to keep packs isolated (fixes cross-manual source pollution)
    }
  };

  const runGeneration = async (extracted: string, mode: InputMode, fileNames: string[]) => {
    if (!extracted.trim()) {
      toast.error('No text extracted. Please try again or use plain text.');
      setGenerating(false);
      setExtracting(false);
      return;
    }
    setExtractedPreview(extracted.slice(0, 4000));
    setWizardStep('generating');
    setGenerating(true);
    try {
      const [apiRes, todoRes] = await Promise.all([
        sendPromptToOpenRouter(extracted),
        sendToDoPrompt(extracted),
      ]);
      // Deduct 1 Credit for new manual (after successful AI generation, before saving pack)
      const deducted = await deduct(1);
      if (!deducted) {
        setGenerating(false);
        setExtracting(false);
        setWizardStep('input');
        return;
      }

      // Compute initial todo_checked for the new pack
      let initialChecked: boolean[] = [];
      try {
        const parsed = parseApiResponse(todoRes as any);
        initialChecked = Array(parsed.sections.length).fill(false);
      } catch {
        initialChecked = [];
      }

      // Try to save to Supabase as a separate pack (isolated data per manual)
      const created = await createManual({
        title: title.trim(),
        description: description.trim() || null,
        extracted_text: extracted,
        input_mode: mode,
        api_response: apiRes,
        todo_response: todoRes,
        file_names: fileNames,
        todo_checked: initialChecked,
      } as any);

      let packId: string | null = null;
      if (created) {
        packId = created.id;
        toast.success('Manual pack saved to your archive');
      } else {
        // Fallback to localStorage pack when Supabase unavailable
        try {
          const fallbackKey = 'manualist-fallback-manuals';
          const existing = JSON.parse(localStorage.getItem(fallbackKey) || '[]');
          const fallbackId = crypto.randomUUID();
          packId = fallbackId;
          existing.unshift({
            id: fallbackId,
            title: title.trim(),
            description: description.trim() || null,
            extracted_text: extracted,
            input_mode: mode,
            api_response: apiRes,
            todo_response: todoRes,
            file_names: fileNames,
            todo_checked: initialChecked,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          localStorage.setItem(fallbackKey, JSON.stringify(existing));
          // also store todo state under per-pack key for consistency
          localStorage.setItem(`manualist-todo-${fallbackId}`, JSON.stringify(initialChecked));
          toast.success('Manual pack saved locally (Supabase unavailable)');
        } catch (e) {
          console.error('fallback save failed', e);
        }
      }

      // Upload files to the isolated pack in Supabase Storage (per-manual folder)
      if (packId && localFiles.length > 0) {
        try {
          const paths = await uploadFilesToPack(localFiles, packId);
          if (paths.length > 0) console.log('Pack files uploaded', paths);
        } catch (e) {
          console.warn('Pack file upload failed', e);
        }
      }
      // Save extracted text (OCR/PDF/plain) to Supabase bucket for chat on-demand retrieval
      if (packId && extracted.trim()) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const textPath = `${user.id}/${packId}/extracted.txt`;
            const blob = new Blob([extracted], { type: 'text/plain' });
            const { error } = await supabase.storage.from('user-manuals').upload(textPath, blob, { upsert: true, contentType: 'text/plain' });
            if (!error) {
              try {
                await supabase.from('user_files').insert({
                  user_id: user.id,
                  filename: 'extracted.txt',
                  storage_path: textPath,
                  file_type: 'text/plain',
                  manual_id: packId,
                } as any);
              } catch {}
            }
          }
        } catch (e) {
          console.warn('Save extracted text to bucket failed', e);
        }
      }

      onCreated();
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate. Check API key and try again.');
      setWizardStep('input');
    } finally {
      setGenerating(false);
      setExtracting(false);
    }
  };

  const handleOcrProcess = async () => {
    if (localFiles.length === 0) {
      toast.error('Please select images');
      return;
    }
    if (!inputMode) return;
    setExtracting(true);
    setWizardStep('extracting');
    try {
      const results = await Promise.all(localFiles.map(f => recognize(f)));
      const combined = results.map(r => r.data.text).join('\n\n').trim();
      if (!combined) {
        toast.error('OCR returned empty text. Try clearer images or use plain text.');
        setWizardStep('input');
        setExtracting(false);
        return;
      }
      await runGeneration(combined, 'ocr', localFiles.map(f => f.name));
    } catch (err) {
      console.error('OCR error', err);
      toast.error('OCR failed: ' + (err instanceof Error ? err.message : String(err)));
      setWizardStep('input');
      setExtracting(false);
    }
  };

  const handlePdfExtract = async () => {
    if (localFiles.length === 0) {
      toast.error('Please select a PDF');
      return;
    }
    const file = localFiles[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a valid PDF file');
      return;
    }
    setExtracting(true);
    setWizardStep('extracting');
    try {
      const buffer = await file.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) throw new Error('Empty file');
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const cleaned = (text || '').trim();
      if (!cleaned) {
        toast.error('PDF extraction returned empty. Try plain text paste.');
        setWizardStep('input');
        setExtracting(false);
        return;
      }
      await runGeneration(cleaned, 'pdf', [file.name]);
    } catch (err) {
      console.error('PDF extract error', err);
      toast.error('PDF extraction failed: ' + (err instanceof Error ? err.message : String(err)));
      setWizardStep('input');
      setExtracting(false);
    }
  };

  const handlePlainTextSubmit = async () => {
    const cleaned = plainText.trim();
    if (!cleaned) {
      toast.error('Please paste manual text');
      return;
    }
    if (!inputMode) {
      toast.error('Input mode not set');
      return;
    }
    setExtracting(true);
    setWizardStep('extracting');
    // small tick to show extracting UI then generate
    await new Promise(r => setTimeout(r, 150));
    await runGeneration(cleaned, 'text', []);
  };

  if (!open) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl bg-base-100 max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>

        <ul className="steps steps-horizontal w-full mb-6 text-xs">
          <li className={`step ${['meta','method','input','extracting','generating'].indexOf(wizardStep) >= 0 ? 'step-warning' : ''}`}>Details</li>
          <li className={`step ${['method','input','extracting','generating'].indexOf(wizardStep) >= 0 ? 'step-warning' : ''}`}>Method</li>
          <li className={`step ${['input','extracting','generating'].indexOf(wizardStep) >= 0 ? 'step-warning' : ''}`}>Input</li>
          <li className={`step ${wizardStep === 'generating' ? 'step-warning' : ''}`}>Generate</li>
        </ul>

        {wizardStep === 'meta' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xl">New Manual</h3>
            <p className="text-sm opacity-70">Enter the title and optional description for your manual.</p>
            <label className="form-control w-full">
              <span className="label label-text font-semibold">Title *</span>
              <input
                className="input input-bordered w-full"
                placeholder="e.g. My Coffee Machine Manual"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </label>
            <label className="form-control w-full">
              <span className="label label-text font-semibold">Description (optional)</span>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="Short description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </label>
            <div className="modal-action">
              <button className="btn btn-warning w-full" onClick={handleContinueMeta} disabled={!title.trim()}>
                Continue
              </button>
            </div>
          </div>
        )}

        {wizardStep === 'method' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xl">Choose a method</h3>
            <p className="text-sm opacity-70">Select how to provide your manual content.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                className="card bg-base-200 border-2 border-base-200 hover:border-warning p-6 flex flex-col items-center text-center gap-2"
                onClick={() => handleSelectMethod('ocr')}
              >
                <span className="text-4xl">📸</span>
                <span className="font-bold">From photos</span>
                <span className="text-xs opacity-60">Use camera / images</span>
                <span className='badge badge-warning rounded text-amber-800 text-[10px]'>Perfect for smaller manuals</span>
              </button>
              <button
                className="card bg-base-200 border-2 border-base-200 hover:border-info p-6 flex flex-col items-center text-center gap-2"
                onClick={() => handleSelectMethod('pdf')}
              >
                <span className="text-4xl">📄</span>
                <span className="font-bold">PDF</span>
                <span className="text-xs opacity-60">Upload PDF manual</span>
                <span className='badge badge-info rounded text-cyan-800 text-[10px]'>Best of both worlds</span>
              </button>
              <button
                className="card bg-base-200 border-2 border-base-200 hover:border-success p-6 flex flex-col items-center text-center gap-2"
                onClick={() => handleSelectMethod('text')}
              >
                <span className="text-4xl">✏️</span>
                <span className="font-bold">Plain text</span>
                <span className="text-xs opacity-60">Copy & paste</span>
                <span className='badge badge-success rounded text-green-800 text-[10px]'>Extra precision</span>
              </button>
            </div>
            <button className="btn btn-ghost w-full" onClick={() => setWizardStep('meta')}>Back</button>
          </div>
        )}

        {wizardStep === 'input' && inputMode === 'ocr' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xl">📁 Import images</h3>
            <div className="border-2 border-dashed border-base-300 p-8 rounded-2xl text-center hover:border-warning bg-base-200">
              <input type="file" multiple accept="image/*" className="hidden" id="wizard-file-upload" onChange={handleFileChange} />
              <label htmlFor="wizard-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <span className="text-4xl">📁</span>
                <span className="font-semibold">Click to upload</span>
                <span className="text-xs opacity-60">or drag and drop images here</span>
              </label>
            </div>
            {localFiles.length > 0 && (
              <div className="bg-base-200 rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
                {localFiles.map((f, i) => (
                  <div key={i} className="flex justify-between bg-base-100 p-2 rounded text-sm">
                    <span className="truncate">{f.name}</span>
                    <span className="text-xs opacity-50">{(f.size/1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="btn btn-warning w-full"
              onClick={handleOcrProcess}
              disabled={localFiles.length===0 || extracting || generating}
            >
              {extracting ? <><span className="loading loading-spinner loading-sm" /> Extracting...</> : 'Begin Analysis'}
            </button>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setWizardStep('method')}>Back</button>
              <button className="btn btn-ghost flex-1" onClick={handleClose}>Cancel</button>
            </div>
          </div>
        )}

        {wizardStep === 'input' && inputMode === 'pdf' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xl">📄 Choose PDF</h3>
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer ${localFiles.length ? 'border-warning bg-warning/10' : 'border-base-300 hover:border-warning bg-base-200'}`}>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              <span className="text-4xl">{localFiles.length ? '✅' : '📁'}</span>
              <p className="text-sm font-semibold">{localFiles.length ? localFiles[0].name : 'Click to select PDF'}</p>
            </label>
            {localFiles.length>0 && (
              <div className={`p-3 rounded text-sm text-center ${localFiles[0].type==='application/pdf' || localFiles[0].name.endsWith('.pdf') ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {localFiles[0].type==='application/pdf' || localFiles[0].name.endsWith('.pdf') ? '✅ PDF selected' : '❌ Invalid file'}
              </div>
            )}
            <button
              className="btn btn-warning w-full"
              onClick={handlePdfExtract}
              disabled={localFiles.length===0 || extracting || generating}
            >
              {extracting ? <><span className="loading loading-spinner loading-sm" /> Extracting...</> : 'Begin Extraction'}
            </button>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setWizardStep('method')}>Back</button>
              <button className="btn btn-ghost flex-1" onClick={handleClose}>Cancel</button>
            </div>
          </div>
        )}

        {wizardStep === 'input' && inputMode === 'text' && (
          <div className="space-y-4">
            <h3 className="font-bold text-xl">✏️ Enter text</h3>
            <textarea
              className="textarea textarea-bordered w-full h-64"
              placeholder="Paste the text of your user manual here..."
              value={plainText}
              onChange={e => setPlainText(e.target.value)}
            />
            <button
              className="btn btn-warning w-full"
              onClick={handlePlainTextSubmit}
              disabled={!plainText.trim() || extracting || generating}
            >
              {extracting ? <><span className="loading loading-spinner loading-sm" /> Preparing...</> : 'Analyze Manual'}
            </button>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setWizardStep('method')}>Back</button>
              <button className="btn btn-ghost flex-1" onClick={handleClose}>Cancel</button>
            </div>
          </div>
        )}

        {(wizardStep === 'extracting' || wizardStep === 'generating') && (
          <div className="flex flex-col items-center py-6 gap-3">
            <span className="loading loading-ring loading-lg text-warning"></span>
            <p className="text-sm opacity-70">
              {wizardStep === 'extracting' ? 'Extracting text from your files...' : 'Generating summary, table of contents and to-do steps...'}
            </p>
            {extractedPreview && (
              <div className="w-full bg-base-200 p-3 rounded text-xs max-h-32 overflow-y-auto text-left">
                <p className="font-semibold mb-1">Preview:</p>
                {extractedPreview.slice(0, 500)}...
              </div>
            )}
            <p className="text-xs opacity-50">This may take up to 30 seconds</p>
          </div>
        )}
      </div>
      <div className="modal-backdrop bg-black/30" onClick={handleClose}></div>
    </div>
  );
}
