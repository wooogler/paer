import React from "react";

interface LevelLinesProps {
  level: number;
  iconColorClass: string;
}

/**
 * 수직 레벨 표시선 컴포넌트
 * 계층 구조의 수준을 시각적으로 보여주는 수직선을 렌더링합니다.
 */
const LevelLines: React.FC<LevelLinesProps> = ({ level, iconColorClass }) => {
  if (level === 0) return null;

  const lines = [];
  for (let i = 0; i < level; i++) {
    // 마지막 선은 콘텐츠 타입 색상을 사용하고, 나머지는 회색으로 표시
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
