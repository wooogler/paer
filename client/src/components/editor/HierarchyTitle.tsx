import React, { useMemo, useState, useRef, useCallback } from "react";
import { Content, ContentType } from "@paer/shared";
import EditableField from "./EditableField";
import DeleteBlockButton from "./DeleteBlockButton";
import LevelLines from "./LevelLines";
import {
  useUpdateBlockIntent,
  useUpdateBlockSummary,
  useUpdateBlockTitle,
  useDeleteBlock,
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
    const [editingTitle, setEditingTitle] = useState(false);
    const [localIntent, setLocalIntent] = useState(content.intent || "");
    const [localSummary, setLocalSummary] = useState(content.summary || "");
    const [localTitle, setLocalTitle] = useState(content.title || "");

    const intentInputRef = useRef<HTMLInputElement>(null);
    const summaryInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const updateBlockIntentMutation = useUpdateBlockIntent();
    const updateBlockSummaryMutation = useUpdateBlockSummary();
    const updateBlockTitleMutation = useUpdateBlockTitle();
    const deleteBlockMutation = useDeleteBlock();

    // Logic to extract parent block ID (actual implementation depends on application structure)
    const parentBlockId = null; // This part should be modified according to actual implementation

    // Update local intent and summary state when content props change
    React.useEffect(() => {
      if (content.intent !== undefined) {
        setLocalIntent(content.intent);
      }
      if (content.summary !== undefined) {
        setLocalSummary(content.summary);
      }
      if (content.title !== undefined) {
        setLocalTitle(content.title);
      }
    }, [content.intent, content.summary, content.title]);

    // Get icon color class based on content type
    const iconColorClass = useMemo(() => {
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

    // Determine how to display the title
    const getDisplayTitle = useCallback(() => {
      if (content.type === "paragraph") {
        // For paragraphs, show summary or intent based on display mode
        return displayMode === "summary"
          ? content.summary || "Empty Summary"
          : content.intent || "Empty Intent";
      }
      return (
        content.title ||
        content.type.charAt(0).toUpperCase() + content.type.slice(1)
      );
    }, [
      content.type,
      content.title,
      content.summary,
      content.intent,
      displayMode,
    ]);

    // Handle delete block
    const handleDeleteBlock = useCallback(() => {
      const blockId = content["block-id"];
      if (!blockId) return;

      deleteBlockMutation.mutate(blockId, {
        onSuccess: () => {
          // Success handling
        },
      });
    }, [content, deleteBlockMutation]);

    // Generic handler for updating block properties
    const handleBlockUpdate = useCallback(
      (
        property: "intent" | "summary" | "title",
        value: string,
        setEditing: React.Dispatch<React.SetStateAction<boolean>>
      ) => {
        if (content.type !== "sentence" && content["block-id"]) {
          if (property === "intent") {
            updateBlockIntentMutation.mutate({
              parentBlockId,
              targetBlockId: content["block-id"],
              blockType: content.type as ContentType,
              intent: value,
            });
          } else if (property === "summary") {
            updateBlockSummaryMutation.mutate({
              parentBlockId,
              targetBlockId: content["block-id"],
              blockType: content.type as ContentType,
              summary: value,
            });
          } else {
            // Use dedicated API for title updates
            updateBlockTitleMutation.mutate({
              parentBlockId,
              targetBlockId: content["block-id"],
              blockType: content.type as ContentType,
              title: value,
            });
          }

          setEditing(false);
        }
      },
      [
        content,
        parentBlockId,
        updateBlockIntentMutation,
        updateBlockSummaryMutation,
        updateBlockTitleMutation,
      ]
    );

    // Handlers for intent updates
    const handleIntentUpdate = useCallback(() => {
      handleBlockUpdate("intent", localIntent, setEditingIntent);
    }, [handleBlockUpdate, localIntent]);

    const handleIntentCancel = useCallback(() => {
      setLocalIntent(content.intent || "");
      setEditingIntent(false);
    }, [content.intent]);

    const handleIntentKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleIntentUpdate();
        else if (e.key === "Escape") handleIntentCancel();
      },
      [handleIntentUpdate, handleIntentCancel]
    );

    // Handlers for summary updates
    const handleSummaryUpdate = useCallback(() => {
      handleBlockUpdate("summary", localSummary, setEditingSummary);
    }, [handleBlockUpdate, localSummary]);

    const handleSummaryCancel = useCallback(() => {
      setLocalSummary(content.summary || "");
      setEditingSummary(false);
    }, [content.summary]);

    const handleSummaryKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSummaryUpdate();
        else if (e.key === "Escape") handleSummaryCancel();
      },
      [handleSummaryUpdate, handleSummaryCancel]
    );

    // Handlers for title updates
    const handleTitleUpdate = useCallback(() => {
      handleBlockUpdate("title", localTitle, setEditingTitle);
    }, [handleBlockUpdate, localTitle]);

    const handleTitleCancel = useCallback(() => {
      setLocalTitle(content.title || "");
      setEditingTitle(false);
    }, [content.title]);

    const handleTitleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleTitleUpdate();
        else if (e.key === "Escape") handleTitleCancel();
      },
      [handleTitleUpdate, handleTitleCancel]
    );

    // Display delete for any content type except paper and placeholder content
    const showDeleteButton = content.type !== "paper" && !isPlaceholder;

    // Only allow editing for non-sentence blocks
    const isEditableBlock =
      content.type !== "sentence" && content.type !== "paper" && !isPlaceholder;

    // isParagraph for special handling
    const isParagraph = content.type === "paragraph";

    // Render the delete button with appropriate styling
    const renderDeleteButton = useCallback(
      (className = "") =>
        showDeleteButton && isHovered ? (
          <DeleteBlockButton
            contentType={content.type}
            onDelete={handleDeleteBlock}
            className={className}
          />
        ) : null,
      [showDeleteButton, isHovered, content.type, handleDeleteBlock]
    );

    // Render editable field for summary or intent
    const renderEditableField = useCallback(
      (
        value: string,
        onChange: (value: string) => void,
        onUpdate: () => void,
        onCancel: () => void,
        isEditing: boolean,
        setIsEditing: React.Dispatch<React.SetStateAction<boolean>>,
        inputRef: React.RefObject<HTMLInputElement>,
        placeholder: string,
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void,
        extraProps?: {
          icon?: string;
          fontSize?: string;
          fontWeight?: string;
          extraButton?: React.ReactNode;
        }
      ) => (
        <EditableField
          value={value}
          onChange={onChange}
          onUpdate={onUpdate}
          onCancel={onCancel}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          inputRef={inputRef}
          placeholder={placeholder}
          isHovered={isHovered}
          isSentence={true}
          onKeyDown={onKeyDown}
          {...extraProps}
        />
      ),
      [isHovered]
    );

    return (
      <div
        className={`relative ${
          isCurrentSelected ? "bg-blue-50 rounded-md" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Vertical level indicator lines */}
        {renderLines && (
          <LevelLines level={level} iconColorClass={iconColorClass} />
        )}

        {/* Title content */}
        <div
          className="relative"
          style={{
            paddingLeft: renderLines ? `${level * 16 + 16}px` : "0px",
          }}
        >
          {/* Normal type title display */}
          {!isParagraph && (
            <div
              className={`${titleSizeClass} font-bold flex items-center gap-2 group relative`}
            >
              {isEditableBlock ? (
                <div className={`${iconColorClass} flex-grow w-full`}>
                  {renderEditableField(
                    localTitle,
                    setLocalTitle,
                    handleTitleUpdate,
                    handleTitleCancel,
                    editingTitle,
                    setEditingTitle,
                    titleInputRef,
                    "Title",
                    handleTitleKeyDown,
                    {
                      fontSize: titleSizeClass,
                      fontWeight: "font-bold",
                      extraButton: renderDeleteButton(
                        "opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      ),
                    }
                  )}
                </div>
              ) : (
                <>
                  <span className={`${iconColorClass} break-words`}>
                    {getDisplayTitle()}
                  </span>
                  {/* Action buttons */}
                  {renderDeleteButton()}
                </>
              )}
            </div>
          )}

          <div className={`text-base flex flex-col text-gray-700`}>
            {/* For paragraph type, display summary as title */}
            {isParagraph && (
              <div
                className={`${titleSizeClass} font-bold flex items-center gap-2 group relative mb-2`}
              >
                {isEditableBlock ? (
                  <div className={`${iconColorClass} flex-grow w-full`}>
                    {renderEditableField(
                      localSummary,
                      setLocalSummary,
                      handleSummaryUpdate,
                      handleSummaryCancel,
                      editingSummary,
                      setEditingSummary,
                      summaryInputRef,
                      "Empty Summary",
                      handleSummaryKeyDown,
                      {
                        fontSize: titleSizeClass,
                        fontWeight: "font-bold",
                        extraButton: renderDeleteButton(
                          "opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        ),
                      }
                    )}
                  </div>
                ) : (
                  <span className={`${iconColorClass} break-words`}>
                    {content.summary || "Empty Summary"}
                  </span>
                )}
              </div>
            )}

            {/* Display summary for non-paragraph types */}
            {!isParagraph && (
              <div>
                {isEditableBlock ? (
                  renderEditableField(
                    localSummary,
                    setLocalSummary,
                    handleSummaryUpdate,
                    handleSummaryCancel,
                    editingSummary,
                    setEditingSummary,
                    summaryInputRef,
                    "Empty Summary",
                    handleSummaryKeyDown
                  )
                ) : (
                  <span className="break-words">
                    {content.summary || "Empty Summary"}
                  </span>
                )}
              </div>
            )}

            {/* Display intent for all types */}
            <div className="flex items-center gap-2 w-full mb-2">
              <span className="font-medium flex-shrink-0">🎯</span>
              {isEditableBlock ? (
                <div className="flex-grow w-full">
                  {renderEditableField(
                    localIntent,
                    setLocalIntent,
                    handleIntentUpdate,
                    handleIntentCancel,
                    editingIntent,
                    setEditingIntent,
                    intentInputRef,
                    "Empty Intent",
                    handleIntentKeyDown,
                    { icon: "" }
                  )}
                </div>
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
