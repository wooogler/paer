import React, { useMemo, useState, useRef, useCallback } from "react";
import { Content, ContentType } from "@paer/shared";
import { FaTrash } from "react-icons/fa";
import EditableField from "./EditableField";
import {
  useUpdateBlockIntent,
  useUpdateBlockSummary,
} from "../../hooks/usePaperQuery";

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
    const [editingIntent, setEditingIntent] = useState(false);
    const [editingSummary, setEditingSummary] = useState(false);
    const [localIntent, setLocalIntent] = useState(content.intent || "");
    const [localSummary, setLocalSummary] = useState(content.summary || "");

    const intentInputRef = useRef<HTMLInputElement>(null);
    const summaryInputRef = useRef<HTMLInputElement>(null);

    const updateBlockIntentMutation = useUpdateBlockIntent();
    const updateBlockSummaryMutation = useUpdateBlockSummary();

    // 부모 블록 ID를 추출하는 로직 (실제 구현은 애플리케이션 구조에 따라 다름)
    const parentBlockId = null; // 이 부분은 실제 구현에 맞게 수정해야 함

    // Update local intent and summary state when content props change
    React.useEffect(() => {
      if (content.intent !== undefined) {
        setLocalIntent(content.intent);
      }
      if (content.summary !== undefined) {
        setLocalSummary(content.summary);
      }
    }, [content.intent, content.summary]);

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

    // Handlers for editable fields
    const handleIntentUpdate = useCallback(() => {
      if (content.type !== "sentence" && content["block-id"]) {
        updateBlockIntentMutation.mutate({
          parentBlockId: parentBlockId,
          targetBlockId: content["block-id"],
          blockType: content.type as ContentType,
          intent: localIntent,
        });
        setEditingIntent(false);
      }
    }, [
      content.type,
      content["block-id"],
      localIntent,
      parentBlockId,
      updateBlockIntentMutation,
    ]);

    const handleSummaryUpdate = useCallback(() => {
      if (content.type !== "sentence" && content["block-id"]) {
        updateBlockSummaryMutation.mutate({
          parentBlockId: parentBlockId,
          targetBlockId: content["block-id"],
          blockType: content.type as ContentType,
          summary: localSummary,
        });
        setEditingSummary(false);
      }
    }, [
      content.type,
      content["block-id"],
      localSummary,
      parentBlockId,
      updateBlockSummaryMutation,
    ]);

    const handleIntentCancel = useCallback(() => {
      setLocalIntent(content.intent || "");
      setEditingIntent(false);
    }, [content.intent]);

    const handleSummaryCancel = useCallback(() => {
      setLocalSummary(content.summary || "");
      setEditingSummary(false);
    }, [content.summary]);

    const handleIntentKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          handleIntentUpdate();
        } else if (e.key === "Escape") {
          handleIntentCancel();
        }
      },
      [handleIntentUpdate, handleIntentCancel]
    );

    const handleSummaryKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          handleSummaryUpdate();
        } else if (e.key === "Escape") {
          handleSummaryCancel();
        }
      },
      [handleSummaryUpdate, handleSummaryCancel]
    );

    // Display delete for any content type except paper and placeholder content
    const showDeleteButton = content.type !== "paper" && !isPlaceholder;

    // Only allow editing for non-sentence blocks
    const isEditableBlock =
      content.type !== "sentence" && content.type !== "paper" && !isPlaceholder;

    // isParagraph for special handling
    const isParagraph = content.type === "paragraph";

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
          style={{
            paddingLeft: renderLines ? `${level * 16 + 16}px` : "0px",
          }}
        >
          {/* 일반 타입일 경우 제목 표시 */}
          {!isParagraph && (
            <div
              className={`${titleSizeClass} font-bold flex items-center gap-2 group relative`}
            >
              <span className={`${iconColorClass} break-words`}>
                {getDisplayTitle()}
              </span>

              {/* Action buttons */}
              {isHovered && showDeleteButton && (
                <button
                  className="text-red-500 hover:text-red-700"
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
          )}

          <div className={`text-base flex flex-col text-gray-700`}>
            {/* paragraph 타입일 경우 summary를 title 처럼 표시 */}
            {isParagraph && (
              <div
                className={`${titleSizeClass} font-bold flex items-center gap-2 group relative mb-2`}
              >
                {isEditableBlock ? (
                  <div className={`${iconColorClass} flex-grow`}>
                    <EditableField
                      value={localSummary}
                      onChange={setLocalSummary}
                      onUpdate={handleSummaryUpdate}
                      onCancel={handleSummaryCancel}
                      isEditing={editingSummary}
                      setIsEditing={setEditingSummary}
                      inputRef={summaryInputRef}
                      placeholder="Empty Summary"
                      isHovered={isHovered}
                      isSentence={true}
                      onKeyDown={handleSummaryKeyDown}
                    />
                  </div>
                ) : (
                  <span className={`${iconColorClass} break-words`}>
                    {content.summary || "Empty Summary"}
                  </span>
                )}

                {/* Delete button for paragraph */}
                {isHovered && showDeleteButton && (
                  <button
                    className="text-red-500 hover:text-red-700"
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
            )}

            {/* Display summary for non-paragraph types */}
            {!isParagraph && (
              <div>
                {isEditableBlock ? (
                  <EditableField
                    value={localSummary}
                    onChange={setLocalSummary}
                    onUpdate={handleSummaryUpdate}
                    onCancel={handleSummaryCancel}
                    isEditing={editingSummary}
                    setIsEditing={setEditingSummary}
                    inputRef={summaryInputRef}
                    placeholder="Empty Summary"
                    isHovered={isHovered}
                    isSentence={true}
                    onKeyDown={handleSummaryKeyDown}
                  />
                ) : (
                  <span className="break-words">
                    {content.summary || "Empty Summary"}
                  </span>
                )}
              </div>
            )}

            {/* Display intent for all types */}
            <div className="flex items-center gap-2">
              <span className="font-medium">🎯</span>
              {isEditableBlock ? (
                <EditableField
                  value={localIntent}
                  onChange={setLocalIntent}
                  onUpdate={handleIntentUpdate}
                  onCancel={handleIntentCancel}
                  isEditing={editingIntent}
                  setIsEditing={setEditingIntent}
                  inputRef={intentInputRef}
                  placeholder="Empty Intent"
                  icon=""
                  isHovered={isHovered}
                  isSentence={true}
                  onKeyDown={handleIntentKeyDown}
                />
              ) : (
                <span className="break-words">
                  {content.intent || "Empty Intent"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default HierarchyTitle;
