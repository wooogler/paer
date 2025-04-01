import React, { useEffect, useMemo, useState } from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ContentRenderer from "./editor/ContentRenderer";
import { usePaperQuery, useUpdateBlockSummary, useUpdateBlockIntent } from "../hooks/usePaperQuery";
import api from "../services/api";

const Editor: React.FC = () => {
  const {
    selectedBlock,
    selectedBlockPath,
    parentContents,
    getContentByPath,
    setSelectedBlock,
  } = useContentStore();
  const { showHierarchy } = useAppStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const updateBlockSummary = useUpdateBlockSummary();
  const updateBlockIntent = useUpdateBlockIntent();

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

  const handleUpdateSummaries = async () => {
    if (!selectedBlock || !selectedBlock["block-id"]) {
      alert("Please select a content block to update");
      return;
    }

    setIsUpdating(true);
    try {
      // Get the rendered content based on block type
      let renderedContent = '';
      
      if (selectedBlock.type === "paper" || selectedBlock.type === "section" || selectedBlock.type === "subsection") {
        // For paper, section, and subsection, get all child content
        if (Array.isArray(selectedBlock.content)) {
          renderedContent = selectedBlock.content
            .map((item: any) => {
              if (item.type === "paragraph") {
                // For paragraphs, get all sentence contents
                if (Array.isArray(item.content)) {
                  return item.content
                    .filter((s: any) => s && s.type === "sentence")
                    .map((s: any) => s.content)
                    .join(" ");
                }
                return item.content;
              }
              return "";
            })
            .filter(Boolean)
            .join("\n\n");
        }
      } else if (selectedBlock.type === "paragraph") {
        // For paragraphs, get all sentence contents
        if (Array.isArray(selectedBlock.content)) {
          renderedContent = selectedBlock.content
            .filter((item: any) => item && item.type === "sentence")
            .map((item: any) => item.content)
            .join(" ");
        } else if (typeof selectedBlock.content === "string") {
          renderedContent = selectedBlock.content;
        }
      }

      if (!renderedContent.trim()) {
        throw new Error("No content found to generate summary and intent");
      }

      // Send the rendered content to the backend to generate new summaries and intents
      const response = await api.post("/paper/update-rendered-summaries", {
        renderedContent: renderedContent.trim(),
        blockId: selectedBlock["block-id"]
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to update summaries");
      }

      alert("Summary and intent updated successfully!");
    } catch (error) {
      console.error("Error updating summaries:", error);
      alert(error instanceof Error ? error.message : "Failed to update summaries");
    } finally {
      setIsUpdating(false);
    }
  };

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

        {/* Add Update Summaries button */}
        {selectedBlock && selectedBlock["block-id"] && (
          <div className="mb-4">
            <button
              onClick={handleUpdateSummaries}
              disabled={isUpdating}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Update Summaries"}
            </button>
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
  }, [selectedBlock, selectedBlockPath, showHierarchy, parentContents, isUpdating]);

  return renderContent;
};

export default Editor;
