import React from "react";
import { AlertCircle } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    // Générer un ID unique si non fourni
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-3 
              border rounded
              text-base text-gray-900
              placeholder:text-gray-400
              transition-all duration-fast
              focus:outline-none focus:ring-0
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${
                error
                  ? "border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(220,38,38,0.1)]"
                  : "border-gray-300 focus:border-primary focus:shadow-focus"
              }
              ${className}
            `}
            {...props}
          />

          {error && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <AlertCircle className="text-error" size={20} />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-error flex items-center gap-1">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
