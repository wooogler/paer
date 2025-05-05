import React, { useMemo, useState, useRef, useCallback } from "react";
import { Content, ContentType } from "@paer/shared";
import EditableField from "./EditableField";
import LevelLines from "./LevelLines";
import { getTypeColor } from "../../utils/contentUtils";
import {
  useUpdateBlockIntent,
  useUpdateBlockSummary,
  useUpdateBlockTitle,
  useDeleteBlock,
} from "../../hooks/usePaperQuery";
import { FiClock, FiMoreVertical, FiFilter, FiTrash2 } from "react-icons/fi";
import EditHistoryModal from "./EditHistoryModal";
import {
  useFloating,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
  offset,
  flip,
  shift,
  autoUpdate
} from "@floating-ui/react";
import { useChatStore } from "../../store/useChatStore";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";

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
    // const [editingSummary, setEditingSummary] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [localIntent, setLocalIntent] = useState(content.intent || "");
    const [_, setLocalSummary] = useState(content.summary || "");
    const [localTitle, setLocalTitle] = useState(content.title || "");
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { filterBlockId, isFilteringEnabled, setFilterBlockId } = useChatStore();
    const { refs, floatingStyles, context } = useFloating({
      open: isMenuOpen,
      onOpenChange: setIsMenuOpen,
      placement: "bottom-end",
      middleware: [offset(5), flip(), shift()],
      whileElementsMounted: autoUpdate
    });
    const click = useClick(context);
    const dismiss = useDismiss(context);
    const { getReferenceProps, getFloatingProps } = useInteractions([
      click,
      dismiss,
    ]);

    const intentInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    const updateBlockIntentMutation = useUpdateBlockIntent();
    const updateBlockSummaryMutation = useUpdateBlockSummary();
    const updateBlockTitleMutation = useUpdateBlockTitle();
    const deleteBlockMutation = useDeleteBlock();

    // Logic to extract parent block ID (actual implementation depends on application structure)
    const parentBlockId = null; // This part should be modified according to actual implementation

    const paperId = useContentStore(state => state.selectedPaperId);
    const userId = useAppStore(state => state.userId);

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
      return getTypeColor(content.type as ContentType).main;
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
          ? content.summary || `Paragraph ${Array.isArray((content as any).path) ? (content as any).path.map((idx: number) => idx + 1).join(".") : ''}`
          : content.intent || `Paragraph ${Array.isArray((content as any).path) ? (content as any).path.map((idx: number) => idx + 1).join(".") : ''}`;
      }
      // For subsection and subsubsection, show label if title is empty
      if (content.type === "subsection") {
        return (
          content.title && content.title.trim() !== ""
            ? content.title
            : `Subsection ${Array.isArray((content as any).path) ? (content as any).path.map((idx: number) => idx + 1).join(".") : ''}`
        );
      }
      if (content.type === "subsubsection") {
        return (
          content.title && content.title.trim() !== ""
            ? content.title
            : `Subsubsection ${Array.isArray((content as any).path) ? (content as any).path.map((idx: number) => idx + 1).join(".") : ''}`
        );
      }
      return (
        content.title ||
        content.type.charAt(0).toUpperCase() + content.type.slice(1)
      );
    }, [content.type, content.title, content.summary, content.intent, displayMode]);

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
              targetBlockId: content["block-id"],
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
    // const handleSummaryUpdate = useCallback(() => {
    //   handleBlockUpdate("summary", localSummary, setEditingSummary);
    // }, [handleBlockUpdate, localSummary]);

    // const handleSummaryCancel = useCallback(() => {
    //   setLocalSummary(content.summary || "");
    //   setEditingSummary(false);
    // }, [content.summary]);

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

    // Only allow editing for non-sentence blocks
    const isEditableBlock =
      content.type !== "sentence" && content.type !== "paper" && !isPlaceholder;

    // isParagraph for special handling
    const isParagraph = content.type === "paragraph";

    // Menu action handlers
    const handleHistory = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsHistoryModalOpen(true);
      setIsMenuOpen(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDeleteBlock();
      setIsMenuOpen(false);
    };

    const handleFilter = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (content["block-id"]) {
        if (isActiveMessageFilter) {
          setFilterBlockId(null);
        } else {
          setFilterBlockId(content["block-id"]);
        }
      }
      setIsMenuOpen(false);
    };

    // Check if this block is currently being filtered
    const isActiveMessageFilter = content["block-id"] === filterBlockId && isFilteringEnabled;

    // Render the menu button and dropdown
    const renderBlockActionsMenu = () => (
      <div className="absolute top-2 right-2 z-20">
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          className="p-1.5 rounded-full bg-white shadow hover:bg-gray-100 text-gray-600 transition-colors"
          title="Block actions"
          onClick={e => { e.stopPropagation(); setIsMenuOpen(v => !v); }}
        >
          <FiMoreVertical size={16} />
        </button>
        {isMenuOpen && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 mt-2"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                onClick={handleHistory}
              >
                <FiClock />
                View Edit History
              </button>
              {content.type === "sentence" && (
                <>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    onClick={handleFilter}
                  >
                    <FiFilter className={isActiveMessageFilter ? "text-blue-500" : ""} />
                    {isActiveMessageFilter ? "Show All Messages" : "Show Related Messages"}
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                    onClick={handleDelete}
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </>
              )}
              {content.type !== "sentence" && (
                <>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                    onClick={handleDelete}
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </>
              )}
            </div>
          </FloatingPortal>
        )}
      </div>
    );

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
          isSentence={false}
          onKeyDown={onKeyDown}
          {...extraProps}
        />
      ),
      [isHovered]
    );

    return (
      <div
        className={`relative group ${isCurrentSelected ? "bg-blue-50 rounded-md" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          {renderBlockActionsMenu()}
        </div>
        {isHistoryModalOpen && (
          <EditHistoryModal
            block={content}
            paperId={paperId || ''}
            userId={userId || ''}
            onClose={() => setIsHistoryModalOpen(false)}
          />
        )}
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
              className={`${titleSizeClass} font-bold flex items-center gap-2 group relative pr-12`}
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
                      extraButton: null,
                    }
                  )}
                </div>
              ) : (
                <>
                  <span className={`${iconColorClass} break-words overflow-hidden text-ellipsis whitespace-nowrap block`}>
                    {getDisplayTitle()}
                  </span>
                </>
              )}
            </div>
          )}

          <div className={`text-base flex flex-col text-gray-700`}>
            {/* For paragraph type, display summary as title */}
            {/* {isParagraph && (
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
                        extraButton: renderFloatingDeleteButton(),
                      }
                    )}
                  </div>
                ) : (
                  <span className={`${iconColorClass} break-words`}>
                    {content.summary || "Empty Summary"}
                  </span>
                )}
              </div>
            )} */}

            {/* Display summary for non-paragraph types */}
            {/* {!isParagraph && (
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
            )} */}

            {/* Display intent for all types */}
            <div className="flex items-center gap-2 w-full mb-2 justify-between">
              <span className="font-medium flex-shrink-0">🎯</span>
              <div className="flex-grow">
              {isEditableBlock ? (
                  renderEditableField(
                    localIntent,
                    setLocalIntent,
                    handleIntentUpdate,
                    handleIntentCancel,
                    editingIntent,
                    setEditingIntent,
                    intentInputRef,
                    "Empty Intent",
                    handleIntentKeyDown,
                    {
                      fontSize: titleSizeClass,
                      fontWeight: "font-bold"
                    }
                  )
              ) : (
                <span className="break-words">
                    {content.type === "paragraph" && (!content.intent || content.intent.trim() === "")
                      ? `Paragraph ${Array.isArray((content as any).path) ? (content as any).path.map((idx: number) => idx + 1).join(".") : ''} — Empty Intent`
                      : content.intent || "Empty Intent"}
                </span>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default HierarchyTitle;
