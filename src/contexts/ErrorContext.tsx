// src/contexts/ErrorContext.tsx

import { createContext, useContext, useState, useCallback } from "react";
import { ErrorShutter } from "@/components/error/ErrorShutter";
import type { ErrorDetails, ErrorState } from "@/types/error.types";

interface ErrorContextValue {
  showError: (error: string | ErrorDetails) => void;
  hideError: () => void;
  error: ErrorDetails | null;
  isVisible: boolean;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export function ErrorProvider({ children }: { children: any }) {
  const [state, setState] = useState<ErrorState>({
    isVisible: false,
    error: null,
  });

  const showError = useCallback((error: string | ErrorDetails) => {
    const errorDetails: ErrorDetails =
      typeof error === "string"
        ? { message: error, timestamp: new Date().toISOString() }
        : { ...error, timestamp: error.timestamp || new Date().toISOString() };

    setState({
      isVisible: true,
      error: errorDetails,
    });
  }, []);

  const hideError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVisible: false,
    }));

    setTimeout(() => {
      setState({
        isVisible: false,
        error: null,
      });
    }, 800);
  }, []);

  return (
    <ErrorContext.Provider
      value={{
        showError,
        hideError,
        error: state.error,
        isVisible: state.isVisible,
      }}
    >
      {children}
      <ErrorShutter
        isVisible={state.isVisible}
        error={state.error}
        onRetry={hideError}
      />
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useError must be used within ErrorProvider");
  }
  return context;
}
