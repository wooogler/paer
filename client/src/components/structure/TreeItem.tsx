import React, { memo, useMemo } from "react";
import { useContentStore } from "../../store/useContentStore";
import { Content } from "@paer/shared";
import { isSelectableContent } from "../../utils/contentUtils";
import { useChatStore } from "../../store/useChatStore";

interface TreeItemProps {
  content: Content;
  path: number[];
  depth: number;
  displayMode: "summary" | "intent";
}

const TreeItem: React.FC<TreeItemProps> = memo(
  ({ content, path, depth, displayMode }) => {
    const { selectedPath, selectedBlockPath, setSelectedBlock } =
      useContentStore();
    const { setFilterBlockId } = useChatStore();

    // 현재 항목이 selectedBlock인지 확인
    const isSelectedBlock = selectedBlockPath?.join(",") === path.join(",");
    // 현재 항목이 selectedContent인지 확인
    const isSelectedContent = selectedPath?.join(",") === path.join(",");

    if (content.type === "sentence") {
      return null;
    }

    const handleClick = () => {
      if (isSelectableContent(content.type)) {
        setSelectedBlock(content, path);
      }
    };

    // 채팅 필터링 활성화 처리
    const handleShowMessages = (e: React.MouseEvent) => {
      e.stopPropagation(); // 부모 요소의 클릭 이벤트 전파 방지
      if (content["block-id"]) {
        setFilterBlockId(content["block-id"]);
      }
    };

    // 스타일과 표시 텍스트 메모이제이션
    const { contentColorClass, displayTitle, displayText } = useMemo(() => {
      // Get color class based on content type
      const getColorClass = () => {
        switch (content.type) {
          case "paper":
            return "text-blue-600";
          case "section":
            return "text-green-600";
          case "subsection":
            return "text-yellow-600";
          case "subsubsection":
            return "text-pink-600";
          case "paragraph":
            return "text-gray-600";
          default:
            return "text-gray-600";
        }
      };

      // Determine how to display the title
      const getDisplayTitle = () => {
        if (content.type === "paragraph") {
          // For paragraphs, show summary in summary mode, otherwise show intent
          // Summary가 비어있을 경우 기본 텍스트 표시
          if (displayMode === "summary") {
            return (
              content.summary ||
              `Paragraph ${path.map((idx) => idx + 1).join(".")}`
            );
          } else {
            return (
              content.intent ||
              `Paragraph ${path.map((idx) => idx + 1).join(".")}`
            );
          }
        }

        return (
          content.title ||
          `${
            content.type.charAt(0).toUpperCase() + content.type.slice(1)
          } ${path.map((idx) => idx + 1).join(".")}`
        );
      };

      // Get the display text based on display mode
      const getDisplayText = () => {
        // 비어있는 경우 기본 텍스트 제공
        const text =
          displayMode === "summary" ? content.summary : content.intent;
        return (
          text ||
          `${
            content.type.charAt(0).toUpperCase() + content.type.slice(1)
          } ${path.map((idx) => idx + 1).join(".")}`
        );
      };

      return {
        contentColorClass: getColorClass(),
        displayTitle: getDisplayTitle(),
        displayText: getDisplayText(),
      };
    }, [content, displayMode, path]);

    return (
      <div>
        <div
          className={`py-1 flex items-start gap-2 ${
            isSelectableContent(content.type)
              ? "cursor-pointer opacity-100"
              : "cursor-default opacity-70"
          } ${isSelectedContent ? "bg-blue-100" : ""} ${
            isSelectedBlock && !isSelectedContent ? "bg-gray-100" : ""
          }`}
          style={{ paddingLeft: `${depth * 20}px` }}
          onClick={handleClick}
        >
          <div className="flex flex-col w-full min-w-0">
            {/* Display the title */}
            <div className="flex justify-between items-center">
              <span
                className={`break-words ${contentColorClass} ${
                  content.type === "paragraph" ? "" : "font-bold"
                } ${isSelectedContent ? "text-blue-800" : ""}`}
              >
                {displayTitle}
              </span>

              {/* 메시지 아이콘 버튼 - 선택된 항목일 때만 표시 */}
              {(isSelectedContent || isSelectedBlock) && (
                <button
                  onClick={handleShowMessages}
                  className="ml-2 text-gray-500 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-blue-50"
                  title="Show related messages"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
              )}
            </div>

            {/* Display summary or intent for non-paragraph types */}
            {content.type !== "paragraph" && (
              <span className="text-gray-600 text-sm break-words">
                {displayText}
              </span>
            )}
          </div>
        </div>

        {/* Render child content recursively */}
        {Array.isArray(content.content) &&
          content.content.map((child: Content, index: number) => (
            <TreeItem
              key={child?.["block-id"] || index}
              content={child}
              path={[...path, index]}
              depth={depth + 1}
              displayMode={displayMode}
            />
          ))}
      </div>
    );
  }
);

export default TreeItem;
