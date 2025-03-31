import React, { memo } from "react";
import { useContentStore } from "../store/useContentStore";
import TreeItem from "./structure/TreeItem";

interface StructureProps {
  displayMode: "summary" | "intent";
}

const Structure: React.FC<StructureProps> = memo(({ displayMode }) => {
  const { content } = useContentStore();

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
