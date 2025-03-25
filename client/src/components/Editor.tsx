import React, { useEffect } from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ParagraphEditor from "./editor/ParagraphEditor";
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

  // 페이지가 새로고침된 후에도 선택된 경로에 대한 컨텐츠를 복원하는 효과
  useEffect(() => {
    // 경로가 있고 컨텐츠가 없는 경우(새로고침 후 상태) 컨텐츠를 복원
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
