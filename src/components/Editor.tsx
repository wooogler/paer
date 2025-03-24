import React from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ParagraphEditor from "./editor/ParagraphEditor";
import ContentRenderer from "./editor/ContentRenderer";

const Editor: React.FC = () => {
  const { selectedContent, selectedPath, parentContents } = useContentStore();
  const { showHierarchy } = useAppStore();

  if (!selectedContent || !selectedPath) {
    return (
      <div className="p-5 text-center text-gray-500">
        Select a section, subsection, or paragraph to edit
      </div>
    );
  }

  // Only allow editing for section, subsection, and paragraph types
  if (!["section", "subsection", "paragraph"].includes(selectedContent.type)) {
    return (
      <div className="p-5 text-center text-gray-500">
        Only sections, subsections, and paragraphs can be edited
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Parent hierarchy information */}
      {showHierarchy && (
        <div className="mb-4">
          {parentContents.map((content, index) => (
            <HierarchyTitle
              key={index}
              content={content}
              level={index}
              isCurrentSelected={false}
            />
          ))}
          <HierarchyTitle
            content={selectedContent}
            level={parentContents.length}
            isCurrentSelected={true}
          />
        </div>
      )}

      <div className="mt-4">
        {selectedContent.type === "paragraph" ? (
          <ParagraphEditor
            content={selectedContent}
            path={selectedPath}
            level={parentContents.length}
          />
        ) : (
          <ContentRenderer
            content={selectedContent}
            path={selectedPath}
            isTopLevel={true}
            level={parentContents.length}
          />
        )}
      </div>
    </div>
  );
};

export default Editor;
