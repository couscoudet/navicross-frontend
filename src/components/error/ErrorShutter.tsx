// src/components/error/ErrorShutter.tsx

import React, { useEffect, useState } from "react";
import type { ErrorDetails } from "@/types/error.types";

interface ErrorShutterProps {
  isVisible: boolean;
  error: ErrorDetails | null;
  onRetry: () => void;
}

export const ErrorShutter: React.FC<ErrorShutterProps> = ({
  isVisible,
  error,
  onRetry,
}) => {
  const [shouldBlur, setShouldBlur] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Blur après un court délai pour sync avec animation
      setTimeout(() => setShouldBlur(true), 100);
    } else {
      setShouldBlur(false);
    }
  }, [isVisible]);

  if (!error) return null;

  return (
    <>
      {/* Blur overlay sur l'app */}
      <div
        className={`fixed inset-0 transition-all duration-500 pointer-events-none ${
          shouldBlur ? "backdrop-blur-[10px]" : ""
        }`}
        style={{ zIndex: 998 }}
      />

      {/* Container du rideau */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-300 ${
          isVisible ? "opacity-100 pointer-events-auto" : "opacity-0"
        }`}
        style={{ zIndex: 999 }}
      >
        {/* Rideau métallique */}
        <div
          className={`absolute left-0 w-full h-full transition-all duration-[800ms] ${
            isVisible ? "top-0" : "-top-full"
          }`}
          style={{
            background: `repeating-linear-gradient(
              0deg,
              #3a3a3a 0px,
              #4a4a4a 8px,
              #2a2a2a 8px,
              #2a2a2a 10px,
              #3a3a3a 10px,
              #3a3a3a 18px,
              #1a1a1a 18px,
              #1a1a1a 20px
            )`,
            boxShadow: `
              inset 0 2px 10px rgba(0,0,0,0.5),
              0 10px 40px rgba(0,0,0,0.8)
            `,
            transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
          }}
        >
          {/* Reflets métalliques */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(
                0deg,
                transparent 0px,
                rgba(255,255,255,0.03) 8px,
                transparent 10px,
                transparent 18px,
                rgba(255,255,255,0.05) 18px,
                transparent 20px
              )`,
            }}
          />

          {/* Rivets (haut) */}
          <div
            className="absolute w-full h-[30px] top-5"
            style={{
              background: `
                radial-gradient(circle at 20px center, #555 8px, transparent 8px),
                radial-gradient(circle at 60px center, #555 8px, transparent 8px),
                radial-gradient(circle at 100px center, #555 8px, transparent 8px)
              `,
              backgroundSize: "80px 100%",
              backgroundRepeat: "repeat-x",
            }}
          />

          {/* Rivets (bas) */}
          <div
            className="absolute w-full h-[30px] bottom-5"
            style={{
              background: `
                radial-gradient(circle at 20px center, #555 8px, transparent 8px),
                radial-gradient(circle at 60px center, #555 8px, transparent 8px),
                radial-gradient(circle at 100px center, #555 8px, transparent 8px)
              `,
              backgroundSize: "80px 100%",
              backgroundRepeat: "repeat-x",
            }}
          />

          {/* Poignée du rideau */}
          <div
            className="absolute bottom-[30px] left-1/2 -translate-x-1/2 w-[100px] h-[15px] rounded-[10px]"
            style={{
              background: "linear-gradient(180deg, #666 0%, #333 100%)",
              boxShadow: `
                0 4px 10px rgba(0,0,0,0.5),
                inset 0 2px 5px rgba(255,255,255,0.1)
              `,
            }}
          />

          {/* Ombres dynamiques */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(
                ellipse at center,
                transparent 30%,
                rgba(0,0,0,0.4) 100%
              )`,
            }}
          />
        </div>

        {/* Contenu erreur */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white z-10 transition-opacity duration-500 px-4 ${
            isVisible ? "opacity-100 delay-500" : "opacity-0"
          }`}
        >
          {/* Icône erreur */}
          <div
            className="text-[80px] mb-5 animate-pulse"
            style={{
              filter: "drop-shadow(0 4px 20px rgba(255, 107, 107, 0.6))",
              animation: "errorPulse 2s infinite",
            }}
          >
            ⚠️
          </div>

          {/* Titre */}
          <h1
            className="text-4xl md:text-5xl font-black mb-5 uppercase tracking-[4px]"
            style={{
              textShadow: `
                0 2px 10px rgba(0,0,0,0.5),
                0 0 20px rgba(255,107,107,0.5)
              `,
            }}
          >
            Erreur
          </h1>

          {/* Message */}
          <p
            className="text-lg md:text-xl max-w-[600px] mx-auto mb-10 leading-relaxed opacity-95"
            style={{
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {error.message}
          </p>

          {/* Code d'erreur (si présent) */}
          {error.code && (
            <p className="text-sm opacity-60 mb-6 font-mono tracking-wider">
              Code: {error.code}
            </p>
          )}

          {/* Bouton retry */}
          <button
            onClick={onRetry}
            className="px-12 py-4 rounded-full text-xl font-bold uppercase tracking-[2px] transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
            style={{
              background: "linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)",
              boxShadow: `
                0 8px 25px rgba(255, 107, 107, 0.4),
                inset 0 2px 5px rgba(255,255,255,0.2)
              `,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `
                0 12px 35px rgba(255, 107, 107, 0.5),
                inset 0 2px 5px rgba(255,255,255,0.3)
              `;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `
                0 8px 25px rgba(255, 107, 107, 0.4),
                inset 0 2px 5px rgba(255,255,255,0.2)
              `;
            }}
          >
            On réessaye ?
          </button>
        </div>
      </div>

      {/* Animation CSS dans un style tag */}
      <style>{`
        @keyframes errorPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </>
  );
};
