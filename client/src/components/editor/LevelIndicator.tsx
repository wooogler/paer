import React from "react";
import { getTypeColor } from "../../utils/contentUtils";
import { ContentType } from "@paer/shared";

// Helper functions for content type styling - 대체됨
// export const getBackgroundColorClass = (contentType: string): string => { ... };
// export const getBorderColorClass = (contentType: string): string => { ... };
// export const getColorClass = (contentType: string): string => { ... };

// 유틸리티 함수 새로 구현
export const getBackgroundColorClass = (contentType: string): string => {
  return getTypeColor(contentType as ContentType).bg;
};

export const getBorderColorClass = (contentType: string): string => {
  return getTypeColor(contentType as ContentType).border;
};

export const getColorClass = (contentType: string): string => {
  return getTypeColor(contentType as ContentType).main;
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
