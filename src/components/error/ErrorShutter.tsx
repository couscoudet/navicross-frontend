// src/components/error/ErrorShutter.tsx - VERSION STYLES INLINE

import { useEffect, useState } from "react";
import type { ErrorDetails } from "@/types/error.types";

interface ErrorShutterProps {
  isVisible: boolean;
  error: ErrorDetails | null;
  onRetry: () => void;
}

export function ErrorShutter({ isVisible, error, onRetry }: ErrorShutterProps) {
  const [shouldBlur, setShouldBlur] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [shutterTop, setShutterTop] = useState("-100%");

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      setShutterTop("-100%");

      setTimeout(() => {
        setShutterTop("0");
        setShouldBlur(true);
      }, 50);
    } else {
      setShutterTop("-100%");
      setShouldBlur(false);

      setTimeout(() => {
        setShouldShow(false);
      }, 800);
    }
  }, [isVisible]);

  if (!error || !shouldShow) return null;

  return (
    <>
      {/* Blur overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backdropFilter: shouldBlur ? "blur(10px)" : "blur(0px)",
          WebkitBackdropFilter: shouldBlur ? "blur(10px)" : "blur(0px)",
          transition: "backdrop-filter 0.5s, -webkit-backdrop-filter 0.5s",
          pointerEvents: "none",
          zIndex: 998,
        }}
      />

      {/* Container du rideau */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "auto",
          zIndex: 999,
        }}
      >
        {/* Rideau métallique */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: shutterTop,
            width: "100%",
            height: "100%",
            transition: "top 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
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
          }}
        >
          {/* Reflets métalliques */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
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
            style={{
              position: "absolute",
              width: "100%",
              height: "30px",
              top: "20px",
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
            style={{
              position: "absolute",
              width: "100%",
              height: "30px",
              bottom: "20px",
              background: `
                radial-gradient(circle at 20px center, #555 8px, transparent 8px),
                radial-gradient(circle at 60px center, #555 8px, transparent 8px),
                radial-gradient(circle at 100px center, #555 8px, transparent 8px)
              `,
              backgroundSize: "80px 100%",
              backgroundRepeat: "repeat-x",
            }}
          />

          {/* Poignée */}
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100px",
              height: "15px",
              borderRadius: "10px",
              background: "linear-gradient(180deg, #666 0%, #333 100%)",
              boxShadow: `
                0 4px 10px rgba(0,0,0,0.5),
                inset 0 2px 5px rgba(255,255,255,0.1)
              `,
            }}
          />

          {/* Ombres */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
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
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "white",
            zIndex: 10,
            padding: "0 1rem",
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.5s 0.5s",
          }}
        >
          {/* Icône */}
          <div
            style={{
              fontSize: "80px",
              marginBottom: "20px",
              filter: "drop-shadow(0 4px 20px rgba(255, 107, 107, 0.6))",
              animation: "errorPulse 2s infinite",
            }}
          >
            ⚠️
          </div>

          {/* Titre */}
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              marginBottom: "20px",
              textTransform: "uppercase",
              letterSpacing: "4px",
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
            style={{
              fontSize: "clamp(1rem, 3vw, 1.25rem)",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.6,
              opacity: 0.95,
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            {error.message}
          </p>

          {/* Code */}
          {error.code && (
            <p
              style={{
                fontSize: "0.875rem",
                opacity: 0.6,
                marginBottom: "1.5rem",
                fontFamily: "monospace",
                letterSpacing: "0.1em",
              }}
            >
              Code: {error.code}
            </p>
          )}

          {/* Bouton */}
          <button
            onClick={onRetry}
            style={{
              padding: "1rem 3rem",
              borderRadius: "50px",
              fontSize: "1.25rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "2px",
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)",
              color: "white",
              boxShadow: `
                0 8px 25px rgba(255, 107, 107, 0.4),
                inset 0 2px 5px rgba(255,255,255,0.2)
              `,
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = `
                0 12px 35px rgba(255, 107, 107, 0.5),
                inset 0 2px 5px rgba(255,255,255,0.3)
              `;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
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

      {/* Animation CSS */}
      <style>{`
        @keyframes errorPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}
