import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker, type RecognizeResult, type Worker } from 'tesseract.js';
import type { UploadStatus } from '../types';

let sharedWorker: Worker | null = null;

export const useTesseract = () => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const workerRef = useRef<Worker | null>(sharedWorker);

  const getWorker = useCallback(async (): Promise<Worker> => {
    if (workerRef.current) return workerRef.current;

    const worker = await createWorker('eng');
    workerRef.current = worker;
    sharedWorker = worker;
    return worker;
  }, []);

  const recognize = useCallback(async (file: File): Promise<RecognizeResult> => {
    setStatus('processing');
    try {
      const worker = await getWorker();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const ret = await worker.recognize(dataUrl);
      setStatus('success');
      return ret;
    } catch (error) {
      setStatus('error');
      throw error;
    }
  }, [getWorker]);

  useEffect(() => () => {
    // Don't terminate shared worker on unmount for concurrency
  }, []);

  return { recognize, status };
};

export default useTesseract;

