import React from "react";

interface LevelLinesProps {
  level: number;
  iconColorClass: string;
}

/**
 * Vertical level indicator component
 * Renders vertical lines that visually show the levels of the hierarchy.
 */
const LevelLines: React.FC<LevelLinesProps> = ({ level, iconColorClass }) => {
  if (level === 0) return null;

  const lines = [];
  for (let i = 0; i < level; i++) {
    // Last line uses content type color, others are gray
    const lineColorClass = i === level - 1 ? iconColorClass : "border-gray-300";

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

export default LevelLines;
