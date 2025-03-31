import React, { useEffect, memo } from "react";
import { useContentStore } from "../store/useContentStore";
import TreeItem from "./structure/TreeItem";

interface StructureProps {
  displayMode: "summary" | "intent";
}

const Structure: React.FC<StructureProps> = memo(({ displayMode }) => {
  const { content } = useContentStore();

  // 로그 출력 최소화
  useEffect(() => {
    // 마운트 시에만 한 번 로그 출력
    console.log("[Structure] 초기 마운트됨");

    return () => {
      console.log("[Structure] 언마운트됨");
    };
  }, []);

  return (
    <div className="p-2 flex flex-col h-full overflow-hidden">
      {/* Scrollable content tree */}
      <div className="overflow-y-auto flex-grow">
        <TreeItem
          content={content}
          path={[]}
          depth={0}
          displayMode={displayMode}
        />
      </div>
    </div>
  );
});

export default Structure;
