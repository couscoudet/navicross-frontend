// src/contexts/ErrorContext.tsx

import React, { createContext, useContext, useState, useCallback } from "react";
import { ErrorShutter } from "@/components/error/ErrorShutter";
import type { ErrorDetails, ErrorState } from "@/types/error.types";

interface ErrorContextValue {
  showError: (error: string | ErrorDetails) => void;
  hideError: () => void;
  error: ErrorDetails | null;
  isVisible: boolean;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

export const ErrorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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

    // Nettoyer l'erreur après l'animation de fermeture
    setTimeout(() => {
      setState({
        isVisible: false,
        error: null,
      });
    }, 800); // Durée de l'animation de remontée
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
};

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
};
