import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}) => {
  // Styles de base
  const baseStyles =
    "font-semibold rounded transition-all duration-fast inline-flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  // Styles par variante
  const variantStyles = {
    primary:
      "bg-primary text-white hover:bg-primary-hover focus-visible:outline-primary",
    secondary:
      "bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:outline-gray-400",
    danger: "bg-error text-white hover:bg-red-700 focus-visible:outline-error",
  };

  // Styles par taille
  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  // Largeur complète
  const widthStyles = fullWidth ? "w-full" : "";

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`;

  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <Loader2
          className="animate-spin"
          size={size === "sm" ? 16 : size === "lg" ? 24 : 20}
        />
      )}
      {children}
    </button>
  );
};
