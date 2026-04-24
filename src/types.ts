export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

export type Step = 'select' | 'input' | 'generate' | 'render';

export type InputMode = 'ocr' | 'pdf' | 'text';

export interface AppState {
  extractedText: string;
  confidenceMeter: number;
  sessionId: string;
  currentStep: Step;
  inputMode?: InputMode;
  files: File[];
  apiResponse: any | null;
  uploadStatus: UploadStatus;
  ocrStatus: UploadStatus;
  apiStatus: ApiStatus;
  fullReset: () => void;
  reset: () => void;
  setExtractedText: (text: string) => void;
  setInputMode: (mode: InputMode) => void;
  setConfidence: (confidence: number) => void;
  setStep: (step: Step) => void;
  setFiles: (files: File[]) => void;
  setApiResponse: (response: any) => void;
  setUploadStatus: (status: UploadStatus) => void;
  setOcrStatus: (status: UploadStatus) => void;
  setApiStatus: (status: ApiStatus) => void;
}

export interface TextContent {
  plain?: string;
  marker?: string;
  bold?: string;
  italic?: string;
  underline?: string;
}

export interface Section {
  header?: string;
  subheader?: string;
  text?: TextContent[];
  list?: (string | {text: TextContent[]})[];
  footnote?: string;
}

