import React from "react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "barrier"
  | "segment"
  | "zone";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  className = "",
}) => {
  const variantStyles = {
    success: "bg-green-50 text-green-700 border-green-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    barrier: "bg-orange-50 text-orange-700 border-orange-200",
    segment: "bg-purple-50 text-purple-700 border-purple-200",
    zone: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`
        inline-flex items-center
        px-3 py-1
        rounded-full
        text-sm font-semibold
        border
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};
