import React, { useMemo, useState } from "react";
import { Content } from "@paer/shared";
import { FaTrash } from "react-icons/fa";

interface HierarchyTitleProps {
  content: Content;
  level?: number;
  isCurrentSelected?: boolean;
  renderLines?: boolean;
  displayMode?: "summary" | "intent";
  isPlaceholder?: boolean;
}

const HierarchyTitle: React.FC<HierarchyTitleProps> = React.memo(
  ({
    content,
    level = 0,
    isCurrentSelected = false,
    displayMode = "summary",
    renderLines = true,
    isPlaceholder = false,
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Get icon color class based on content type
    const iconColorClass = useMemo(() => {
      switch (content.type) {
        case "paper":
          return "text-blue-600";
        case "section":
          return "text-green-600";
        case "subsection":
          return "text-yellow-600";
        case "paragraph":
          return "text-gray-600";
        case "sentence":
          return "text-purple-600";
        default:
          return "text-gray-600";
      }
    }, [content.type]);

    // Determine title size based on hierarchy level
    const titleSizeClass = useMemo(() => {
      switch (level) {
        case 0:
          return "text-3xl";
        case 1:
          return "text-2xl";
        case 2:
          return "text-lg";
        default:
          return "text-base";
      }
    }, [level]);

    // Create vertical level indicator lines
    const renderLevelLines = () => {
      if (level === 0) return null;

      const lines = [];
      for (let i = 0; i < level; i++) {
        // Last line uses content type color, others use grey
        const lineColorClass =
          i === level - 1 ? iconColorClass : "border-gray-300";

        lines.push(
          <div
            key={i}
            className={`absolute border-l-2 ${lineColorClass} h-full`}
            style={{ left: `${i * 16 + 8}px` }}
          />
        );
      }
      return lines;
    };

    // Determine how to display the title
    const getDisplayTitle = () => {
      if (content.type === "paragraph") {
        // For paragraphs, show summary or intent based on display mode
        // to maintain consistency with TreeItem component
        return displayMode === "summary"
          ? content.summary || "Empty Summary"
          : content.intent || "Empty Intent";
      }
      return (
        content.title ||
        content.type.charAt(0).toUpperCase() + content.type.slice(1)
      );
    };

    // Handle delete block (UI only)
    const handleDeleteBlock = () => {
      const blockId = content["block-id"];
      if (!blockId) return;

      console.log(`Delete ${content.type} block with ID: ${blockId}`);
      // 여기에서는 UI만 구현하고 실제 서버 호출은 하지 않습니다.
      // 나중에 서버 API가 구현되면 아래와 같이 사용할 수 있습니다.
      /*
      // 뮤테이션 훅 추가
      const deleteBlockMutation = useDeleteBlock();
      
      deleteBlockMutation.mutate(blockId, {
        onSuccess: () => {
          // 성공 처리
        }
      });
      */
    };

    // Display delete for any content type except paper and placeholder content
    const showDeleteButton = content.type !== "paper" && !isPlaceholder;

    return (
      <div
        className={`relative ${
          isCurrentSelected ? "bg-blue-50 rounded-md" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Vertical level indicator lines */}
        {renderLines && renderLevelLines()}

        {/* Title content */}
        <div
          className="relative"
          style={{ paddingLeft: renderLines ? `${level * 16 + 16}px` : "0px" }}
        >
          <div
            className={`${titleSizeClass} font-bold flex items-center gap-2 group relative`}
          >
            <span className={`${iconColorClass} break-words`}>
              {getDisplayTitle()}
            </span>

            {/* Delete button */}
            {showDeleteButton && (
              <button
                className={`text-red-500 hover:text-red-700 ml-2 transition-opacity duration-200 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      `Are you sure you want to delete this ${content.type}?`
                    )
                  ) {
                    handleDeleteBlock();
                  }
                }}
                aria-label={`Delete ${content.type}`}
              >
                <FaTrash size={14} />
              </button>
            )}
          </div>

          <div className={`text-base flex flex-col text-gray-700`}>
            {/* Display summary for non-paragraph types */}
            {content.type !== "paragraph" && (
              <div>
                <span className="break-words">
                  {content.summary || "Empty Summary"}
                </span>
              </div>
            )}
            {/* Display intent for all types */}
            <div className="flex items-center gap-2">
              <span className="font-medium">🎯</span>
              <span className="break-words">
                {content.intent || "Empty Intent"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default HierarchyTitle;
