// src/types/error.types.ts

export interface ErrorDetails {
  message: string;
  code?: string;
  timestamp?: string;
}

export interface ErrorState {
  isVisible: boolean;
  error: ErrorDetails | null;
}
