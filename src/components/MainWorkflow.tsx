import React, { useState, useCallback } from 'react';
import { useAppStore } from '../store';
import useTesseract from '../hooks/useTesseract';
import { extractText, getDocumentProxy } from 'unpdf';
import sendPromptToOpenRouter from '../text-generation/OpenRouter';
import JsonContentParser from '../text-generation/TextRenderer';

export default function MainWorkflow() {
  const { currentStep, inputMode, files, extractedText, apiResponse, ocrStatus, apiStatus, setStep, setInputMode, setOcrStatus, setApiStatus, reset, setExtractedText, setConfidence, setApiResponse } = useAppStore();

  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [localApiError, setLocalApiError] = useState('');
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [plainText, setPlainText] = useState('');
  const { recognize } = useTesseract();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setLocalFiles(newFiles);
      reset();
      setLocalApiError('');
    }
  };

  const handleOcrProcess = useCallback(async () => {
    if (files.length === 0) return;
    reset();
    setOcrStatus('processing');

    const promises = files.map(async (file) => {
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
  }, [files, recognize, setExtractedText, setConfidence, setOcrStatus, reset, setStep]);

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

  // Wspólny kontener dla wszystkich kroków
  const StepContainer = ({ children }: { children: React.ReactNode }) => (
    <div className="w-full mt-[10%] flex items-center justify-center">
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
          <h1 className="text-3xl font-bold mb-8 text-center">Choose a method</h1>
          <h6 className='text-xl text-center'>Select the method for obtaining content from your user manual.</h6>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <button 
              className="btn btn-outline btn-warning h-32 flex flex-col items-center justify-center p-4 rounded-lg hover:btn-warning"
              onClick={() => { setInputMode('ocr'); setStep('input'); }}
            >
              <span className="text-4xl mb-2">📸</span>
              <span className="font-bold">From photos</span>
              <small className="text-[10px] opacity-75">(You can use your camera!)</small>
            </button>
            <button 
              className="btn btn-outline btn-warning h-32 flex flex-col items-center justify-center p-4 rounded-lg hover:btn-warning"
              onClick={() => { setInputMode('pdf'); setStep('input'); }}
            >
              <span className="text-4xl mb-2">📄</span>
              <span className="font-bold">PDF</span>
              <small className="text-[10px] opacity-75">(Just find the manual on the internet!)</small>
            </button>
            <button 
              className="btn btn-outline btn-warning h-32 flex flex-col items-center justify-center p-4 rounded-lg hover:btn-warning"
              onClick={() => { setInputMode('text'); setStep('input'); }}
            >
              <span className="text-4xl mb-2">✏️</span>
              <span className="font-bold">Plain text</span>
              <small className="text-[10px] opacity-75">(Or copy and paste its content!)</small>
            </button>
          </div>
        </StepContainer>
      );

    case 'input':
      switch (inputMode) {
        case 'ocr':
          return (
            <StepContainer>
              <h1 className="text-3xl font-bold mb-6">📁 Import files</h1>
              <input type="file" multiple accept="image/*" className="file-input file-input-bordered file-input-warning w-full mb-4" onChange={handleFileChange} />
              {localFiles.length > 0 && (
                <div className="mb-6 space-y-2 h-60 overflow-scroll">
                  {localFiles.map((f, index) => (
                    <div key={index} className="alert alert-primary bg-opacity-20 border-none">
                      <span>📄 {f.name} ({(f.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              )}
              {localFiles.length > 0 && (
                <button className="btn btn-warning w-full" onClick={handleOcrProcess} disabled={ocrStatus === 'processing'}>
                  {ocrStatus === 'processing' ? 'Please wait...' : 'Begin'}
                </button>
              )}
              {ocrStatus === 'success' && (
                <div className="alert alert-success mt-4">
                  <span>✅ Text extracted! Moving on to analysing...</span>
                </div>
              )}
            </StepContainer>
          );

        case 'pdf':
          return (
            <StepContainer>
              <h1 className="text-3xl font-bold mb-6">📄 Choose your PDF file</h1>
              <input type="file" accept=".pdf" className="file-input file-input-bordered file-input-warning w-full mb-4" onChange={handleFileChange} />
              {localFiles.length > 0 && localFiles[0].type === 'application/pdf' ? (
                <div className="alert alert-info">
                  <span>✅ {localFiles[0].name}</span>
                </div>
              ) : localFiles.length > 0 && (
                <div className="alert alert-error">
                  <span>❌ Choose a PDF file</span>
                </div>
              )}
              <button 
                className="btn btn-warning w-full" 
                onClick={handlePdfExtract} 
                disabled={localFiles.length !== 1 || pdfStatus === 'processing'}
              >
                {pdfStatus === 'processing' ? 'Processing...' : 'Begin'}
              </button>
              {pdfStatus === 'success' && (
                <div className="alert alert-success mt-4">
                  <span>✅ Text extracted! Moving on to analysing...</span>
                </div>
              )}
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
                className="btn btn-warning w-full" 
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
          <h1 className="text-3xl font-bold mb-4">✨ Magic behind the curtain...</h1>
          {apiStatus !== 'success' && (
            <>
              <p className='text-center'>Click the button below to start!</p>
              <button className="btn btn-warning w-full mb-6" onClick={handleGenerate} disabled={apiStatus === 'loading'}>
                {apiStatus === 'loading' ? <progress className="progress w-56 progress-primary"></progress> : 'Start'}
              </button>
              {localApiError && (
                <div className="alert alert-error">
                  <span>{localApiError}</span>
                </div>
              )}
            </>
          )}
          {apiStatus === 'success' && (
            <>
              <h5 className="text-center mb-4">We did it! Check out the results.</h5>
              <button className="btn btn-warning w-full" onClick={() => setStep('render')}>
                Results
              </button>
            </>
          )}
        </StepContainer>
      );

    case 'render':
      return (
        <div className="min-h-screen p-6 flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-8">📖 Quick Summary</h1>
          <div className="w-full max-w-3xl h-[60vh] overflow-y-auto px-12 shadow-2xl rounded-lg border-4 border-warning prose prose-lg">
            {apiResponse ? <JsonContentParser jsonData={apiResponse} /> : <p className="m-auto text-warning">We have no information to show</p>}
          </div>
        </div>
      );

    default:
      return <div>Unknown step</div>;
  }
}

