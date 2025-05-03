import React, { memo, useMemo } from "react";
import { useContentStore } from "../../store/useContentStore";
import { Content, ContentType } from "@paer/shared";
import { isSelectableContent, getTypeColor } from "../../utils/contentUtils";
import { useChatStore } from "../../store/useChatStore";
import { ClipLoader } from "react-spinners";

interface TreeItemProps {
  content: Content | null;
  path: number[];
  depth: number;
  displayMode: "summary" | "intent";
}

const TreeItem: React.FC<TreeItemProps> = memo(
  ({ content, path, depth, displayMode }) => {
    const {
      selectedPath,
      selectedBlockPath,
      setSelectedBlock,
      isBlockUpdating,
    } = useContentStore();
    const { setFilterBlockId, isFilteringEnabled, filterBlockId } =
      useChatStore();

    // 현재 항목이 selectedBlock인지 확인
    const isSelectedBlock = selectedBlockPath?.join(",") === path.join(",");
    // 현재 항목이 selectedContent인지 확인
    const isSelectedContent = selectedPath?.join(",") === path.join(",");
    // 현재 항목이 필터링된 메시지의 BlockId와 같은지 확인 (active 상태 표시용)
    const isActiveMessageFilter =
      content?.["block-id"] === filterBlockId && isFilteringEnabled;

    // 현재 항목이 업데이트 중인지 확인
    const isUpdating = content?.["block-id"]
      ? isBlockUpdating(content["block-id"] as string)
      : false;

    if (!content) {
      return (
        <div className="p-4 text-gray-500">
          No paper has been written yet. Please create a new paper.
        </div>
      );
    }

    const handleClick = () => {
      // Allow clicking even during updates
      if (isSelectableContent(content.type)) {
        setSelectedBlock(content, path);
      }
    };

    // 채팅 필터링 활성화/비활성화 토글 처리
    const handleShowMessages = (e: React.MouseEvent) => {
      e.stopPropagation(); // 부모 요소의 클릭 이벤트 전파 방지

      // 업데이트 중인 항목은 버튼 비활성화
      if (isUpdating) return;

      if (content["block-id"]) {
        if (isActiveMessageFilter) {
          // 이미 active 상태일 경우, 필터링 해제
          setFilterBlockId(null);
        } else {
          // active 상태가 아닐 경우, 해당 블록으로 필터링
          setFilterBlockId(content["block-id"]);
        }
      }
    };

    // 메시지 아이콘 표시 여부 결정
    // 1. 필터링 모드일 때: 필터링된 아이템의 아이콘만 표시
    // 2. 필터링 모드가 아닐 때: 선택된 아이템의 아이콘만 표시
    const shouldShowMessageIcon = isFilteringEnabled
      ? content["block-id"] === filterBlockId // 필터링 모드: 필터링된 아이템만 아이콘 표시
      : isSelectedContent || isSelectedBlock; // 일반 모드: 선택된 아이템만 아이콘 표시

    // 스타일과 표시 텍스트 메모이제이션
    const { contentColorClass, displayTitle, displayText } = useMemo(() => {
      // Get color class based on content type
      const getColorClass = () => {
        return getTypeColor(content.type as ContentType).main;
      };

      // Determine how to display the title
      const getDisplayTitle = () => {
        if (content.type === "paragraph") {
          // For paragraphs, show summary in summary mode, otherwise show intent
          // If intent is empty, show the paragraph label
          if (displayMode === "summary") {
            return (
              content.summary ||
              `Paragraph ${path.map((idx) => idx + 1).join(".")}`
            );
          } else {
            return (
              content.intent && content.intent.trim() !== ""
                ? content.intent
                : `Paragraph ${path.map((idx) => idx + 1).join(".")}`
            );
          }
        }
        // For subsection and subsubsection, show label if title is empty
        if (content.type === "subsection") {
          return (
            content.title && content.title.trim() !== ""
              ? content.title
              : `Subsection ${path.map((idx) => idx + 1).join(".")}`
          );
        }
        if (content.type === "subsubsection") {
          return (
            content.title && content.title.trim() !== ""
              ? content.title
              : `Subsubsection ${path.map((idx) => idx + 1).join(".")}`
          );
        }
        // content.type이 없는 경우 기본값 처리
        if (!content.type) {
          return `Unknown ${path.map((idx) => idx + 1).join(".")}`;
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
        // content.type이 없는 경우 기본값 처리
        if (!content.type) {
          return `Unknown ${path.map((idx) => idx + 1).join(".")}`;
        }

        // 비어있는 경우 기본 텍스트 제공
        const text = displayMode === "summary" ? content.summary : content.intent;
        
        // text가 있는 경우 반환
        if (text) {
          return text;
        }

        // 기본 텍스트 생성
        const typeText = content.type.charAt(0).toUpperCase() + content.type.slice(1);
        return `${typeText} ${path.map((idx) => idx + 1).join(".")}`;
      };

      return {
        contentColorClass: getColorClass(),
        displayTitle: getDisplayTitle(),
        displayText: getDisplayText(),
      };
    }, [content.type, content.summary, content.intent, content.title, displayMode, path]);

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
              <div className="flex items-center">
                {/* Loading indicator - keep the spinner but remove the text */}
                {isUpdating && (
                  <ClipLoader size={12} color="#3B82F6" className="mr-2" />
                )}
                <span
                  className={`${contentColorClass} ${
                    content.type === "paragraph"
                      ? "text-xs" // paragraph 타입의 경우 더 작은 폰트 사이즈 적용
                      : "text-sm font-bold"
                  } ${isSelectedContent ? "" : ""} ${
                    isSelectedContent ? "" : "truncate"
                  }`}
                  title={isSelectedContent ? "" : displayTitle}
                >
                  {displayTitle}
                </span>
              </div>

              {/* 메시지 아이콘 버튼 - 선택된 항목일 때 표시하고, active 상태일 때 파란색으로 표시 */}
              {shouldShowMessageIcon && (
                <button
                  onClick={handleShowMessages}
                  className={`ml-2 flex-shrink-0 ${
                    isActiveMessageFilter
                      ? "text-blue-500 bg-blue-50"
                      : "text-gray-500 hover:text-blue-500 hover:bg-blue-50"
                  } transition-colors p-1 rounded-full ${
                    isUpdating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title={
                    isActiveMessageFilter
                      ? "Show all messages"
                      : "Show related messages"
                  }
                  disabled={isUpdating}
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
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </button>
              )}
            </div>

            {/* Display summary or intent for non-paragraph types */}
            {/* {content.type !== "paragraph" && (
              <span
                className={`text-gray-600 text-xs ${
                  isSelectedContent ? "break-words" : "truncate block"
                }`}
                title={isSelectedContent ? "" : displayText}
              >
                {displayText}
              </span>
            )} */}

          </div>
        </div>

        {/* Render child content recursively */}
        {Array.isArray(content.content) &&
          content.content.map((child: Content, index: number) => (
            child.type !== "sentence" && (
              <TreeItem
                key={child?.["block-id"] || index}
                content={child}
                path={[...path, index]}
                depth={depth + 1}
                displayMode={displayMode}
              />
            )
          ))}
      </div>
    );
  }
);

export default TreeItem;
