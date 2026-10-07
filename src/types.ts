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
  todoResponse: any | null;
  activeManualId: string | null;
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
  setTodoResponse: (response: any) => void;
  setActiveManualId: (id: string | null) => void;
  setUploadStatus: (status: UploadStatus) => void;
  setOcrStatus: (status: UploadStatus) => void;
  setApiStatus: (status: ApiStatus) => void;
  loadManual: (manual: { id: string; extracted_text: string | null; api_response: any; todo_response: any; input_mode: InputMode | null }) => void;
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

export interface UserFile {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  file_type: string;
  created_at: string;
}

