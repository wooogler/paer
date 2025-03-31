import React, { useEffect, useMemo } from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ContentRenderer from "./editor/ContentRenderer";
import { usePaperQuery } from "../hooks/usePaperQuery";

const Editor: React.FC = () => {
  const {
    selectedBlock,
    selectedBlockPath,
    selectedContent,
    selectedPath,
    parentContents,
    getContentByPath,
    setSelectedBlock,
    content,
  } = useContentStore();
  const { showHierarchy } = useAppStore();

  // 중요: paper 데이터의 변경을 직접 구독
  const { data: paperData } = usePaperQuery();

  // paperData가 변경될 때만 선택된 블록을 업데이트
  useEffect(() => {
    if (!paperData || !selectedBlockPath) return;

    // 디바운스: 짧은 시간 내에 여러 번 호출되는 것 방지
    const timeoutId = setTimeout(() => {
      // 선택된 블록의 최신 데이터를 찾아 업데이트
      const updatedBlock = getContentByPath(selectedBlockPath);
      if (
        updatedBlock &&
        JSON.stringify(updatedBlock) !== JSON.stringify(selectedBlock)
      ) {
        setSelectedBlock(updatedBlock, selectedBlockPath);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    paperData,
    selectedBlockPath,
    getContentByPath,
    setSelectedBlock,
    selectedBlock,
  ]);

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

  // 렌더링을 위한 메모이제이션된 컨텐츠 및 메시지
  const renderContent = useMemo(() => {
    if (!selectedBlock || !selectedBlockPath) {
      return (
        <div className="p-5 text-center text-gray-500">
          Select a section, subsection, paragraph, or paper to edit
        </div>
      );
    }

    // Only allow editing for paper, section, subsection, and paragraph types
    if (
      ![
        "paper",
        "section",
        "subsection",
        "subsubsection",
        "paragraph",
      ].includes(selectedBlock.type)
    ) {
      return (
        <div className="p-5 text-center text-gray-500">
          Only paper, sections, subsections, subsubsections, and paragraphs can
          be edited
        </div>
      );
    }

    // 실제 에디터 UI 반환
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
  }, [selectedBlock, selectedBlockPath, showHierarchy, parentContents]);

  return renderContent;
};

export default Editor;
