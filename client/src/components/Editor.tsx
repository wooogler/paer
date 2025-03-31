import React, { useEffect } from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ContentRenderer from "./editor/ContentRenderer";

const Editor: React.FC = () => {
  const {
    selectedBlock,
    selectedBlockPath,
    selectedContent,
    selectedPath,
    parentContents,
    getContentByPath,
    setSelectedBlock,
  } = useContentStore();
  const { showHierarchy } = useAppStore();

  // Effect to restore content for selected path even after page refresh
  useEffect(() => {
    // If path exists but content is missing (after refresh), restore the content
    if (selectedBlockPath && !selectedBlock) {
      const content = getContentByPath(selectedBlockPath);
      if (content) {
        setSelectedBlock(content, selectedBlockPath);
      }
    }
  }, [selectedBlockPath, selectedBlock, getContentByPath, setSelectedBlock]);

  if (!selectedBlock || !selectedBlockPath) {
    return (
      <div className="p-5 text-center text-gray-500">
        Select a section, subsection, paragraph, or paper to edit
      </div>
    );
  }

  // Only allow editing for paper, section, subsection, and paragraph types
  if (
    !["paper", "section", "subsection", "subsubsection", "paragraph"].includes(
      selectedBlock.type
    )
  ) {
    return (
      <div className="p-5 text-center text-gray-500">
        Only paper, sections, subsections, subsubsections, and paragraphs can be
        edited
      </div>
    );
  }

  // selectedContent와 selectedBlock이 다른 경우를 확인
  const isDifferentSelection =
    selectedContent &&
    selectedBlock &&
    selectedContent["block-id"] !== selectedBlock["block-id"];

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
            content={selectedBlock}
            level={parentContents.length}
            isCurrentSelected={true}
          />
        </div>
      )}

      <div className="mt-4">
        <ContentRenderer
          content={selectedBlock}
          path={selectedBlockPath}
          isTopLevel={true}
          level={parentContents.length}
        />
      </div>
    </div>
  );
};

export default Editor;
