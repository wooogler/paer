import React from "react";

// Helper functions for content type styling
export const getBackgroundColorClass = (contentType: string): string => {
  switch (contentType) {
    case "paper":
      return "bg-blue-50";
    case "section":
      return "bg-green-50";
    case "subsection":
      return "bg-yellow-50";
    case "paragraph":
      return "bg-orange-50";
    case "sentence":
      return "bg-gray-100";
    default:
      return "bg-white";
  }
};

export const getBorderColorClass = (contentType: string): string => {
  switch (contentType) {
    case "paper":
      return "border-blue-200";
    case "section":
      return "border-green-200";
    case "subsection":
      return "border-yellow-200";
    case "paragraph":
      return "border-orange-200";
    case "sentence":
      return "border-gray-200";
    default:
      return "border-gray-200";
  }
};

export const getColorClass = (contentType: string): string => {
  switch (contentType) {
    case "paper":
      return "text-blue-600";
    case "section":
      return "text-green-600";
    case "subsection":
      return "text-yellow-600";
    case "paragraph":
      return "text-red-600";
    case "sentence":
      return "text-purple-600";
    default:
      return "text-gray-600";
  }
};

interface LevelIndicatorProps {
  level: number;
  showHierarchy: boolean;
  contentType: string;
}

const LevelIndicator: React.FC<LevelIndicatorProps> = ({
  level,
  showHierarchy,
  contentType,
}) => {
  if (level === 0 || !showHierarchy) return null;

  const colorClass = getColorClass(contentType);

  const lines = [];
  for (let i = 0; i < level; i++) {
    // Last vertical line matches content type color, others are gray
    const lineColorClass = i === level - 1 ? colorClass : "border-gray-300";

    lines.push(
      <div
        key={i}
        className={`absolute border-l-2 ${lineColorClass} h-full`}
        style={{ left: `${i * 16 + 8}px` }}
      />
    );
  }

  return <>{lines}</>;
};

export default LevelIndicator;
