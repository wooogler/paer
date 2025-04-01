import React, { memo } from "react";
import { useContentStore } from "../store/useContentStore";
import TreeItem from "./structure/TreeItem";
import { ClipLoader } from "react-spinners";

interface StructureProps {
  displayMode: "summary" | "intent";
}

const Structure: React.FC<StructureProps> = memo(({ displayMode }) => {
  const { content, isLoading } = useContentStore();

  return (
    <div className="p-2 flex flex-col h-full overflow-hidden">
      {/* Scrollable content tree */}
      <div className="overflow-y-auto flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <ClipLoader size={50} color="#3B82F6" />
            <span className="mt-4 text-gray-600 font-medium">
              Loading content...
            </span>
          </div>
        ) : (
          <TreeItem
            content={content}
            path={[]}
            depth={0}
            displayMode={displayMode}
          />
        )}
      </div>
    </div>
  );
});

export default Structure;
