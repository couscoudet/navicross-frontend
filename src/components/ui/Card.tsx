import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hover = false,
  onClick,
}) => {
  const hoverClass = hover ? "hover:shadow-card-hover cursor-pointer" : "";
  const clickClass = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`
        bg-white rounded-lg p-6
        border border-gray-200 shadow-card
        transition-shadow duration-base
        ${hoverClass}
        ${clickClass}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
