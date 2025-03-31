import React, { memo, useMemo } from "react";
import { useContentStore } from "../../store/useContentStore";
import { Content } from "@paer/shared";
import { isSelectableContent } from "../../utils/contentUtils";

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
            <span
              className={`break-words ${contentColorClass} ${
                content.type === "paragraph" ? "" : "font-bold"
              } ${isSelectedContent ? "text-blue-800" : ""}`}
            >
              {displayTitle}
            </span>

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
