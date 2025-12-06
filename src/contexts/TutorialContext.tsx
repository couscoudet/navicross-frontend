import React, { createContext, useContext, useState, ReactNode } from "react";

export interface TutorialStep {
  id: string;
  target: string; // Selector CSS de l'élément cible
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  page?: string; // Page où ce step doit apparaître
  action?: () => void; // Action à déclencher automatiquement pour cette étape
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: (tutorialId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
  setSteps: (steps: TutorialStep[]) => void;
  hasCompletedTutorial: (tutorialId: string) => boolean;
  autoStartTutorial: (tutorialId: string, steps: TutorialStep[]) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
};

interface TutorialProviderProps {
  children: ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [currentTutorialId, setCurrentTutorialId] = useState<string>("");

  const hasCompletedTutorial = (tutorialId: string): boolean => {
    return localStorage.getItem(`navicross_tutorial_${tutorialId}_completed`) === "true";
  };

  const startTutorial = (tutorialId: string) => {
    setCurrentTutorialId(tutorialId);
    setCurrentStep(0);
    setIsActive(true);
  };

  const autoStartTutorial = (tutorialId: string, tutorialSteps: TutorialStep[]) => {
    // Ne pas redémarrer si le tutoriel est déjà actif
    if (isActive) return;

    // Ne démarrer que si le tutoriel n'a jamais été complété
    if (!hasCompletedTutorial(tutorialId)) {
      setSteps(tutorialSteps);
      setCurrentTutorialId(tutorialId);
      setCurrentStep(0);
      setIsActive(true);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      skipTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    setIsActive(false);
    setCurrentStep(0);
    if (currentTutorialId) {
      localStorage.setItem(`navicross_tutorial_${currentTutorialId}_completed`, "true");
    }
  };

  const resetTutorial = () => {
    if (currentTutorialId) {
      localStorage.removeItem(`navicross_tutorial_${currentTutorialId}_completed`);
    }
    setCurrentStep(0);
    setIsActive(false);
  };

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        resetTutorial,
        setSteps,
        hasCompletedTutorial,
        autoStartTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};
