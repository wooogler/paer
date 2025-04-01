import React, { useEffect, useMemo, useState } from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ContentRenderer from "./editor/ContentRenderer";
import { usePaperQuery } from "../hooks/usePaperQuery";
import api from "../services/api";
import { useQueryClient } from "@tanstack/react-query";
import { FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";

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
  const queryClient = useQueryClient();

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
      let renderedContent = "";

      if (
        selectedBlock.type === "paper" ||
        selectedBlock.type === "section" ||
        selectedBlock.type === "subsection"
      ) {
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

      // if (!renderedContent.trim()) {
      //   throw new Error("No content found to generate summary and intent");
      // }

      // Send the rendered content to the backend to generate new summaries and intents
      const response = await api.post("/paper/update-rendered-summaries", {
        renderedContent: renderedContent.trim(),
        blockId: selectedBlock["block-id"],
      });

      console.log("OpenAI API 요청 결과:", response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to update summaries");
      }

      // 데이터 갱신을 위해 쿼리 무효화 및 리패치
      await queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
      });

      // 최신 데이터 가져오기
      await queryClient.refetchQueries({
        queryKey: ["paper"],
        exact: true,
      });

      toast.success("Summary and intent updated successfully!");
    } catch (error) {
      console.error("Error updating summaries:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update summaries"
      );
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
        {/* 계층 구조 정보 및 업데이트 버튼 */}
        <div className="mb-4">
          {/* 상위 계층 구조는 showHierarchy가 true일 때만 표시 */}
          {showHierarchy &&
            parentContents.map((content, index) => (
              <HierarchyTitle
                key={index}
                content={content}
                level={index}
                isCurrentSelected={false}
              />
            ))}

          {/* 선택된 블록과 업데이트 버튼은 항상 표시 */}
          <div className="flex items-center">
            <div className="flex-grow">
              <HierarchyTitle
                content={selectedBlock}
                level={parentContents.length}
                isCurrentSelected={true}
                renderLines={showHierarchy}
              />
            </div>
            {selectedBlock && selectedBlock["block-id"] && (
              <button
                onClick={handleUpdateSummaries}
                disabled={isUpdating}
                className="ml-2 p-2 text-blue-500 hover:text-blue-600 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Update Summaries and Intents"
              >
                <FiRefreshCw
                  className={`w-5 h-5 ${isUpdating ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>

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
  }, [
    selectedBlock,
    selectedBlockPath,
    showHierarchy,
    parentContents,
    isUpdating,
  ]);

  return renderContent;
};

export default Editor;
