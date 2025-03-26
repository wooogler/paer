import React, { useEffect } from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ContentRenderer from "./editor/ContentRenderer";

const Editor: React.FC = () => {
  const {
    selectedContent,
    selectedPath,
    parentContents,
    getContentByPath,
    setSelectedContent,
  } = useContentStore();
  const { showHierarchy } = useAppStore();

  // Effect to restore content for selected path even after page refresh
  useEffect(() => {
    // If path exists but content is missing (after refresh), restore the content
    if (selectedPath && !selectedContent) {
      const content = getContentByPath(selectedPath);
      if (content) {
        setSelectedContent(content, selectedPath);
      }
    }
  }, [selectedPath, selectedContent, getContentByPath, setSelectedContent]);

  if (!selectedContent || !selectedPath) {
    return (
      <div className="p-5 text-center text-gray-500">
        Select a section, subsection, paragraph, or paper to edit
      </div>
    );
  }

  // Only allow editing for paper, section, subsection, and paragraph types
  if (
    !["paper", "section", "subsection", "paragraph"].includes(
      selectedContent.type
    )
  ) {
    return (
      <div className="p-5 text-center text-gray-500">
        Only paper, sections, subsections, and paragraphs can be edited
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
        <ContentRenderer
          content={selectedContent}
          path={selectedPath}
          isTopLevel={true}
          level={parentContents.length}
        />
      </div>
    </div>
  );
};

export default Editor;
