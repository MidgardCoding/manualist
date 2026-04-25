import React, { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import useTesseract from '../hooks/useTesseract';
import { extractText, getDocumentProxy } from 'unpdf';
import sendPromptToOpenRouter from '../text-generation/OpenRouter';
import JsonContentParser from '../text-generation/TextRenderer';
import TableOfContents from './TableOfContents';
import ToDoSteps from './ToDoSteps';
import useDatabase from '../hooks/useDatabase';

export default function MainWorkflow() {
  const { currentStep, inputMode, extractedText, apiResponse, ocrStatus, apiStatus, setStep, setInputMode, setOcrStatus, setApiStatus, reset, setExtractedText, setConfidence, setApiResponse, setFiles } = useAppStore();
  const { uploadFile } = useDatabase();

  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [localApiError, setLocalApiError] = useState('');
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [plainText, setPlainText] = useState('');
  const { recognize } = useTesseract();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setLocalFiles(newFiles);
      setFiles(newFiles);
      setLocalApiError('');

      for (const file of newFiles) {
        await uploadFile(file);
      }
    }
  };

  const handleOcrProcess = useCallback(async () => {
    if (localFiles.length === 0) return;
    reset();
    setOcrStatus('processing');

    const promises = localFiles.map(async (file) => {
      try {
        const ret = await recognize(file);
        setExtractedText(ret.data.text);
        setConfidence(ret.data.confidence);
      } catch (err) {
        console.error('OCR error for', file.name, err);
      }
    });

    await Promise.all(promises);
    setOcrStatus('success');
    setStep('generate');
  }, [localFiles, recognize, setExtractedText, setConfidence, setOcrStatus, reset, setStep]);

  const handlePdfExtract = useCallback(async () => {
    if (localFiles.length !== 1 || localFiles[0].type !== 'application/pdf') {
      setPdfStatus('error');
      return;
    }
    const file = localFiles[0];
    setPdfStatus('processing');
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      setExtractedText(text);
      setPdfStatus('success');
      setStep('generate');
    } catch (err) {
      console.error('PDF extract error', err);
      setPdfStatus('error');
    }
  }, [localFiles, setExtractedText, setStep]);

  const handlePlainTextSubmit = () => {
    if (!plainText.trim()) return;
    setExtractedText(plainText);
    setStep('generate');
  };

  const handleGenerate = useCallback(async () => {
    if (!extractedText.trim()) {
      setLocalApiError('No text extracted');
      setApiStatus('error');
      return;
    }
    setApiStatus('loading');
    setLocalApiError('');
    try {
      const data = await sendPromptToOpenRouter(extractedText);
      setApiResponse(data);
      setApiStatus('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate summary';
      setLocalApiError(message);
      setApiStatus('error');
    }
  }, [extractedText, setApiResponse, setApiStatus]);

  const StepContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full h-full flex items-center justify-center">
      <div className='my-auto'>
        <div className="card w-full max-w-2xl shadow-xl border-t-4 border-warning">
          <div className="card-body">{children}</div>
        </div>
      </div>
    </div>
  );

  switch (currentStep) {
    case 'select':
      return (
        <StepContainer>
          <div className="max-w-4xl mx-auto py-12 px-4">
            <h1 className="text-4xl font-extrabold mb-4 text-center">Choose a method</h1>
            <p className="text-lg text-base-content/70 text-center mb-12">
              Select the method for obtaining content from your user manual.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              <button 
                className="card bg-base-100 border-2 border-base-200 hover:border-warning hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center group"
                onClick={() => { setInputMode('ocr'); setStep('input'); }}
              >
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📸</span>
                <h2 className="font-bold text-xl mb-2">From photos</h2>
                <p className="text-sm opacity-70">You can use your camera!</p>
              </button>
              <button 
                className="card bg-base-100 border-2 border-base-200 hover:border-warning hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center group"
                onClick={() => { setInputMode('pdf'); setStep('input'); }}
              >
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</span>
                <h2 className="font-bold text-xl mb-2">PDF</h2>
                <p className="text-sm opacity-70">Just find the manual on the internet!</p>
              </button>
              <button 
                className="card bg-base-100 border-2 border-base-200 hover:border-warning hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center group"
                onClick={() => { setInputMode('text'); setStep('input'); }}
              >
                <span className="text-5xl mb-4 group-hover:scale-110 transition-transform">✏️</span>
                <h2 className="font-bold text-xl mb-2">Plain text</h2>
                <p className="text-sm opacity-70">Or copy and paste its content!</p>
              </button>

            </div>
          </div>
        </StepContainer>
      );

    case 'input':
      switch (inputMode) {
        case 'ocr':
          return (
            <StepContainer>
              <div className="w-full max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">📁 Import files</h1>
                <div className="border-2 border-dashed border-base-300 p-8 rounded-2xl text-center hover:border-warning transition-colors bg-base-100 mb-6">
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    id="file-upload" 
                    onChange={handleFileChange} 
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <span className="text-4xl">📁</span>
                    <span className="font-semibold">Click to upload</span>
                    <span className="text-xs opacity-60">or drag and drop images here</span>
                  </label>
                </div>
                {localFiles.length > 0 && (
                  <div className="bg-base-200 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto space-y-2">
                    {localFiles.map((f, index) => (
                      <div key={index} className="flex justify-between items-center bg-base-100 p-3 rounded-lg text-sm shadow-sm">
                        <span className="truncate font-medium text-ellipsis">{f.name}</span>
                        <span className="text-xs opacity-50">{(f.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
                {localFiles.length > 0 && (
                  <button 
                    className="btn btn-warning w-full shadow-lg hover:scale-[1.02] transition-transform" 
                    onClick={handleOcrProcess} 
                    disabled={ocrStatus === 'processing'}
                  >
                    {ocrStatus === 'processing' ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : 'Begin Analysis'}
                  </button>
                )}
                {ocrStatus === 'success' && (
                  <div className="alert alert-success mt-4 bg-success/10 border-success/20 text-success-content">
                    <span>✅ Text extracted! Moving on to analysing...</span>
                  </div>
                )}
              </div>
            </StepContainer>
          );

        case 'pdf':
          return (
            <StepContainer>
              <div className="w-2xl max-w-md mx-auto">
                <h1 className="text-3xl font-bold mb-6">📄 Choose your PDF file</h1>
                <label className={`
                  flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer 
                  transition-all duration-300
                  ${localFiles.length === 0 ? 'border-base-300 hover:border-warning bg-base-100' : 'border-warning bg-warning/10'}
                `}>
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <span className="text-4xl mb-2">{localFiles.length > 0 ? '✅' : '📁'}</span>
                    <p className="text-sm font-semibold">
                      {localFiles.length > 0 ? localFiles[0].name : "Click to select PDF"}
                    </p>
                  </div>
                </label>
                {localFiles.length > 0 && (
                  <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                    localFiles[0].type === 'application/pdf' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  }`}>
                    {localFiles[0].type === 'application/pdf' ? '✅ PDF selected correctly' : '❌ Please select a valid PDF file'}
                  </div>
                )}
                <button 
                  className="btn btn-warning w-full mt-6 shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50" 
                  onClick={handlePdfExtract} 
                  disabled={localFiles.length !== 1 || localFiles[0].type !== 'application/pdf' || pdfStatus === 'processing'}
                >
                  {pdfStatus === 'processing' ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : 'Begin Extraction'}
                </button>
                {pdfStatus === 'success' && (
                  <div className="mt-4 text-center text-success font-medium animate-fade-in">
                    ✅ Text extracted! Moving on to analysing...
                  </div>
                )}
              </div>
            </StepContainer>
          );

        case 'text':
          return (
            <StepContainer>
              <h1 className="text-3xl font-bold mb-6">✏️ Enter your text</h1>
              <textarea 
                className="textarea textarea-bordered textarea-warning w-full h-64 mb-4" 
                placeholder="Wklej tutaj tekst instrukcji..."
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
              ></textarea>
              <button 
                className="btn btn-warning w-full mt-6 shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50" 
                onClick={handlePlainTextSubmit}
                disabled={!plainText.trim()}
              >
                Use this text
              </button>
            </StepContainer>
          );

        default:
          return <div>Unknown input mode</div>;
      }

    case 'generate':
      return (
        <StepContainer>
          <div className="w-full max-w-sm mx-auto text-center space-y-6">
            <h1 className="text-3xl font-bold">✨ Magic behind the curtain...</h1>
            {apiStatus !== 'loading' && apiStatus !== 'success' && (
              <div className="py-8 animate-in fade-in duration-500">
                <p className="mb-6 opacity-70">Ready to transform your data? Let's start the engine.</p>
                <button 
                  className="btn btn-warning btn-lg w-full shadow-lg hover:scale-[1.02] transition-transform" 
                  onClick={handleGenerate}
                >
                  <span className="text-xl">🚀</span> Start Process
                </button>
              </div>
            )}
            {apiStatus === 'loading' && (
              <div className="flex flex-col items-center py-10 gap-4">
                <span className="loading loading-ring loading-lg text-warning"></span>
                <p className="font-medium animate-pulse text-base-content/80">Analyzing your manual...</p>
              </div>
            )}
            {apiStatus === 'success' && (
              <div className="flex flex-col items-center py-6 animate-in zoom-in duration-300">
                <div className="text-6xl mb-4">🎉</div>
                <h5 className="text-xl font-bold mb-6">Success! We did it!</h5>
                <button 
                  className="btn btn-success text-white w-full shadow-lg hover:scale-[1.02] transition-transform" 
                  onClick={() => setStep('render')}
                >
                  View Results
                </button>
              </div>
            )}
            {localApiError && (
              <div className="alert alert-error shadow-lg mt-4 animate-in slide-in-from-top-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{localApiError}</span>
              </div>
            )}
          </div>
        </StepContainer>
      );

    case 'render':
      return (
        <div className="min-h-screen flex">
          <aside className="w-80 h-screen sticky top-0 overflow-y-auto border-r border-base-300 bg-base-100 p-4 shrink-0">
            <h2 className="text-xl font-bold mb-4">Table of Contents</h2>
            {apiResponse ? <TableOfContents apiResponse={apiResponse} /> : <p className="text-sm opacity-60">No data available</p>}
          </aside>
          <main className="flex-1 p-6 flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-8">📖 Quick Summary</h1>
            <div className="w-full max-w-3xl h-[60vh] overflow-y-auto px-12 shadow-2xl rounded-lg border-4 border-warning prose prose-lg">
              {apiResponse ? <JsonContentParser jsonData={apiResponse} /> : <p className="m-auto text-warning">We have no information to show</p>}
            </div>
          </main>
          <aside className="w-80 h-screen sticky top-0 overflow-y-auto border-l border-base-300 bg-base-100 p-4 shrink-0">
            <h2 className="text-xl font-bold mb-4">To-Do Steps</h2>
            <ToDoSteps />
          </aside>
        </div>
      );

    default:
      return <div>Unknown step</div>;
  }
}
