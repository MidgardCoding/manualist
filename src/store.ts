import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, Step, InputMode, UploadStatus, ApiStatus } from './types';

const getSessionId = (): string => {
  if (typeof window !== 'undefined') {
    let sessionId = localStorage.getItem('manualist-session');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('manualist-session', sessionId);
    }
    return sessionId!;
  }
  return uuidv4();
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      extractedText: '',
      confidenceMeter: 0,
      sessionId: getSessionId(),
      currentStep: 'select' as Step,
      inputMode: undefined as InputMode | undefined,
      files: [],
      apiResponse: null,
      uploadStatus: 'idle' as UploadStatus,
      ocrStatus: 'idle' as UploadStatus,
      apiStatus: 'idle' as ApiStatus,
      fullReset: () => set({
        extractedText: '',
        confidenceMeter: 0,
        currentStep: 'select' as Step,
        inputMode: undefined as InputMode | undefined,
        files: [],
        apiResponse: null,
        uploadStatus: 'idle' as UploadStatus,
        ocrStatus: 'idle' as UploadStatus,
        apiStatus: 'idle' as ApiStatus,
      }),

      reset: () => set({ extractedText: '', confidenceMeter: 0 }),
      setExtractedText: (text) => set((state) => ({ extractedText: state.extractedText + text })),
      setInputMode: (mode: InputMode) => set({ inputMode: mode }),
      setConfidence: (confidence) => set((state) => ({ confidenceMeter: (state.confidenceMeter + confidence) / 2 })),
      setStep: (step) => set({ currentStep: step }),
      setFiles: (files) => set({ files }),
      setApiResponse: (response) => set({ apiResponse: response }),
      setUploadStatus: (status) => set({ uploadStatus: status }),
      setOcrStatus: (status) => set({ ocrStatus: status }),
      setApiStatus: (status) => set({ apiStatus: status }),
    }),
    {
      name: 'manualist-storage',
      partialize: (state) => ({ 
        extractedText: state.extractedText, 
        confidenceMeter: state.confidenceMeter, 
        sessionId: state.sessionId,
        currentStep: state.currentStep,
        inputMode: state.inputMode
      })
    }
  )
);

