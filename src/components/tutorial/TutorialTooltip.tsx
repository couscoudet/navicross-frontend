import React, { useEffect, useState, useRef } from "react";
import { useTutorial } from "@/contexts/TutorialContext";
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

export const TutorialTooltip: React.FC = () => {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTutorial } = useTutorial();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || steps.length === 0) {
      setIsVisible(false);
      return;
    }

    const step = steps[currentStep];
    if (!step) return;

    // Attendre un peu pour que l'élément soit rendu
    const timer = setTimeout(() => {
      const targetElement = document.querySelector(step.target);

      if (!targetElement) {
        console.warn(`Tutorial target not found: ${step.target}`);
        setIsVisible(false);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();
      const tooltipWidth = tooltipRect?.width || 320;
      const tooltipHeight = tooltipRect?.height || 280; // Hauteur réduite avec le scroll

      let top = 0;
      let left = 0;

      // Calculer la position selon le placement
      switch (step.placement || "bottom") {
        case "top":
          top = rect.top - tooltipHeight - 20;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + 20;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 20;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 20;
          break;
      }

      // Ajuster si hors écran
      const padding = 20;
      if (left < padding) left = padding;
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipHeight > window.innerHeight - padding) {
        top = window.innerHeight - tooltipHeight - padding;
      }

      setPosition({ top, left });
      setIsVisible(true);

      // Highlight de l'élément cible
      targetElement.classList.add("tutorial-highlight");

      // Scroll vers l'élément si nécessaire
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

      return () => {
        targetElement.classList.remove("tutorial-highlight");
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [isActive, currentStep, steps]);

  // Check scroll state
  useEffect(() => {
    const checkScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        setCanScrollUp(scrollTop > 0);
        setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
      }
    };

    checkScroll();
    const content = contentRef.current;
    if (content) {
      content.addEventListener("scroll", checkScroll);
      return () => content.removeEventListener("scroll", checkScroll);
    }
  }, [isVisible, currentStep]);

  const scrollContent = (direction: "up" | "down") => {
    if (contentRef.current) {
      const scrollAmount = 60; // Scroll par petits groupes de lignes
      contentRef.current.scrollBy({
        top: direction === "down" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!isActive || !isVisible || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  if (!step) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[99998] pointer-events-none" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 99999,
        }}
        className="w-[320px] md:w-[400px] bg-white rounded-2xl shadow-2xl animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Étape {currentStep + 1} sur {steps.length}
            </p>
          </div>
          <button
            onClick={skipTutorial}
            className="p-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Fermer le tutoriel"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="relative">
          {canScrollUp && (
            <div className="absolute top-0 left-0 right-0 flex justify-center pt-2 z-10 bg-gradient-to-b from-white to-transparent">
              <button
                onClick={() => scrollContent("up")}
                className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                aria-label="Défiler vers le haut"
              >
                <ChevronUp size={16} className="text-gray-600" />
              </button>
            </div>
          )}

          <div
            ref={contentRef}
            className="px-4 py-3 max-h-[120px] overflow-y-auto"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#D1D5DB transparent",
            }}
          >
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {step.content}
            </p>
          </div>

          {canScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2 z-10 bg-gradient-to-t from-white to-transparent">
              <button
                onClick={() => scrollContent("down")}
                className="p-1 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                aria-label="Défiler vers le bas"
              >
                <ChevronDown size={16} className="text-gray-600" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover active:scale-95 transition-all"
          >
            {currentStep === steps.length - 1 ? "Terminer" : "Suivant"}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Styles globaux pour le highlight */}
      <style>{`
        .tutorial-highlight {
          position: relative;
          z-index: 9997;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.5), 0 0 20px rgba(37, 99, 235, 0.3);
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        /* Scrollbar webkit pour Chrome/Safari */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: #D1D5DB;
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background-color: #9CA3AF;
        }
      `}</style>
    </>
  );
};
