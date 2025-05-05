import React, { useCallback, useEffect, useState, useRef, ChangeEvent } from "react";
import { Content } from "@paer/shared";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";
import { useChatStore } from "../../store/useChatStore";
import { ClipLoader } from "react-spinners";
import {
  useUpdateSentence,
  useDeleteSentence,
  getNewSentenceBlockId,
  setNewSentenceBlockId,
} from "../../hooks/usePaperQuery";
import EditableField from "./EditableField";
import LevelIndicator, {
  getBackgroundColorClass,
  getBorderColorClass,
} from "./LevelIndicator";
import { getUserInfo } from "../../api/userApi";
import { FiMoreVertical, FiFilter, FiTrash2, FiClock } from "react-icons/fi";
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
import EditHistoryModal from "./EditHistoryModal";

interface TextEditorProps {
  content: Content;
  level?: number;
  path?: number[];
  isLast?: boolean;
  showHierarchy?: boolean;
  onNextFocus?: () => void;
  onAddNewSentence?: () => void;
}

const TextEditor: React.FC<TextEditorProps> = React.memo(
  ({
    content,
    level = 0,
    path = [],
    isLast = false,
    showHierarchy = true,
    onNextFocus,
    onAddNewSentence,
  }) => {
    const { updateContent, setSelectedContent, selectedContent } =
      useContentStore();
    const { showHierarchy: appShowHierarchy, userId } = useAppStore();
    const { filterBlockId, isFilteringEnabled, setFilterBlockId, toggleFiltering } =
      useChatStore();
    const updateSentenceMutation = useUpdateSentence();
    const deleteSentenceMutation = useDeleteSentence();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    // 현재 렌더링되는 문장이 selectedContent인지 확인
    const isSelectedContent =
      selectedContent && content["block-id"] === selectedContent["block-id"];

    // 현재 항목이 필터링된 메시지의 BlockId와 같은지 확인
    const isActiveMessageFilter =
      content["block-id"] === filterBlockId && isFilteringEnabled;

    // State for textarea
    const [initialContent, setInitialContent] = useState<string>("");
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // State for loading indicators
    const isUpdating = updateSentenceMutation.isPending;

    // State for editable fields
    const [editingIntent, _] = useState(false);
    const [editingSummary, setEditingSummary] = useState(false);
    const [localIntent, setLocalIntent] = useState(content.intent || "");
    const [localSummary, setLocalSummary] = useState(content.summary || "");
    const intentInputRef = useRef<HTMLInputElement>(null);
    const summaryInputRef = useRef<HTMLInputElement>(null);

    // Content value
    const [localValue, setLocalValue] = useState<string>(
      content.type === "sentence"
        ? (content.content as string) || ""
        : content.summary || ""
    );

    // State for username
    const [lastModifiedBy, setLastModifiedBy] = useState<string>("");

    // State for history modal
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const paperId = useContentStore(state => state.selectedPaperId);

    // Update local state only when content prop changes
    useEffect(() => {
      const newValue =
        content.type === "sentence"
          ? (content.content as string) || ""
          : content.summary || "";

      setLocalValue(newValue);
      setInitialContent(newValue);
    }, [content.type, content.content, content.summary]);

    // Update local intent and summary state when content props change
    useEffect(() => {
      if (content.intent !== undefined) {
        setLocalIntent(content.intent);
      }
      if (content.summary !== undefined) {
        setLocalSummary(content.summary);
      }
    }, [content.intent, content.summary]);

    // Fetch username when lastModifiedBy changes
    useEffect(() => {
      const fetchUserInfo = async () => {
        if (content.type === "sentence" && content.lastModifiedBy) {
          const userInfo = await getUserInfo(content.lastModifiedBy);
          setLastModifiedBy(userInfo.user.username);
        }
      };
      fetchUserInfo();
    }, [content.lastModifiedBy, content.type]);

    // Focus the textarea
    const focus = useCallback(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, []);

    // Expose focus method
    useEffect(() => {
      // Compare blockId of newly added sentence with current sentence to apply focus
      const newBlockId = getNewSentenceBlockId();
      if (
        content.type === "sentence" &&
        content["block-id"] &&
        newBlockId === content["block-id"]
      ) {
        // Initialize content for newly added sentence
        setLocalValue("");
        setInitialContent("");

        // Use setTimeout to apply focus after rendering is complete
        setTimeout(() => {
          focus();
          // Reset newSentenceBlockId after focus is applied
          setNewSentenceBlockId(null);
        }, 100);
      }
    }, [content, focus]);

    // For sentence type, content contains the actual text
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setLocalValue(value);

        if (content.type !== "sentence") {
          // For non-sentence types, maintain real-time updates
          if (content["block-id"]) {
            updateContent(content["block-id"], { summary: value });
          }
        }
      },
      [content.type, content["block-id"], updateContent]
    );

    // Add onFocus event handler
    const handleFocus = useCallback(() => {
      setIsFocused(true);

      // Update selectedContent when sentence gets focus
      if (content.type === "sentence" && path.length > 0) {
        setSelectedContent(content as any, path);
      }
    }, [content, path, setSelectedContent]);

    // Add onBlur event handler
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        // 버튼 클릭을 방해하지 않도록 이벤트 타겟 확인
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        // 포커스가 버튼으로 이동한 경우에는 포커스 상태 유지
        if (
          relatedTarget &&
          (relatedTarget.tagName === "BUTTON" ||
            relatedTarget.closest("button"))
        ) {
          return;
        }
        setIsFocused(false);
      },
      []
    );

    // Update button handler
    const handleUpdate = useCallback(() => {
      console.log("handleUpdate called", content["block-id"]);
      if (content.type === "sentence" && content["block-id"]) {
        const blockId = content["block-id"] as string;

        // Send update request to server first
        console.log("Sending mutation to server");
        updateSentenceMutation.mutate(
          {
            blockId,
            content: localValue,
            summary: localSummary,
            intent: localIntent,
            previousContent: initialContent
          },
          {
            onSuccess: () => {
              console.log("Update successful");
              // Update local state after server confirms
              updateContent(blockId, {
                content: localValue,
                summary: localSummary,
                intent: localIntent,
              });

              // Also update initial content with current value
              setInitialContent(localValue);

              // Set focus state to false
              setIsFocused(false);

              // Remove focus after update
              if (textareaRef.current) {
                textareaRef.current.blur();
              }
            },
            onError: (error) => {
              console.error("Update error:", error);
            },
          }
        );
      } else {
        console.log(
          "Not a sentence or no block-id",
          content.type,
          content["block-id"]
        );
      }
    }, [
      content.type,
      content["block-id"],
      updateSentenceMutation,
      localValue,
      localSummary,
      localIntent,
      updateContent,
      initialContent
    ]);

    // Update with shift+Enter handler (새 문장 추가 또는 다음 문장으로 포커스 이동)
    const handleUpdateWithNext = useCallback(() => {
      console.log("handleUpdateWithNext called", content["block-id"]);
      if (content.type === "sentence" && content["block-id"] && !isUpdating) {
        const blockId = content["block-id"] as string;

        // Send update request to server first
        console.log("Sending mutation to server");
        updateSentenceMutation.mutate(
          {
            blockId,
            content: localValue,
            summary: localSummary,
            intent: localIntent,
            previousContent: initialContent
          },
          {
            onSuccess: () => {
              console.log("Update successful");
              // Update local state after server confirms
              updateContent(blockId, {
                content: localValue,
                summary: localSummary,
                intent: localIntent,
              });

              // Also update initial content with current value
              setInitialContent(localValue);

              // 업데이트 성공 후 다음 액션 수행
              // If this is the last sentence, add a new one
              if (isLast && onAddNewSentence) {
                onAddNewSentence();
              }
              // Otherwise move focus to the next sentence
              else if (onNextFocus) {
                onNextFocus();
              }
            },
            onError: (error) => {
              console.error("Update error:", error);
            },
          }
        );
      }
    }, [
      content.type,
      content["block-id"],
      updateSentenceMutation,
      localValue,
      localSummary,
      localIntent,
      updateContent,
      isLast,
      onAddNewSentence,
      onNextFocus,
      isUpdating,
      initialContent
    ]);

    // Cancel button handler
    const handleCancel = useCallback(() => {
      // Restore to original content
      setLocalValue(initialContent);
      setLocalSummary(content.summary || "");
      setLocalIntent(content.intent || "");

      // Set focus state to false
      setIsFocused(false);

      // Remove focus after cancel
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
    }, [initialContent, content.summary, content.intent]);

    // Delete handler
    const handleDelete = useCallback(() => {
      if (content.type === "sentence" && content["block-id"] && !isUpdating) {
        // Confirm before deleting
        if (window.confirm("Are you sure you want to delete this sentence?")) {
          // Send delete request to server
          deleteSentenceMutation.mutate(content["block-id"], {
            onSuccess: () => {},
          });
        }
      }
    }, [content.type, content["block-id"], deleteSentenceMutation, isUpdating]);

    // Keyboard event handler
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // 업데이트 중인 경우 키보드 이벤트 비활성화
        if (isUpdating) return;

        // When Enter key is pressed (without Shift key)
        if (e.key === "Enter" && !e.shiftKey && content.type === "sentence") {
          e.preventDefault(); // Prevent default Enter behavior
          handleUpdate(); // Execute update

          // Keep focus during update, handle in success callback
          // if (textareaRef.current) {
          //   textareaRef.current.blur();
          // }
        }

        // When Shift+Enter is pressed for a sentence
        if (e.key === "Enter" && e.shiftKey && content.type === "sentence") {
          e.preventDefault(); // Prevent default Enter behavior

          // Handle next action in separate function
          handleUpdateWithNext();
        }

        // When Backspace is pressed in an empty sentence
        if (
          e.key === "Backspace" &&
          content.type === "sentence" &&
          localValue === ""
        ) {
          e.preventDefault(); // Prevent default Backspace behavior
          handleDelete(); // Delete the current sentence
        }
      },
      [
        handleUpdate,
        handleUpdateWithNext,
        content.type,
        localValue,
        handleDelete,
        isUpdating,
      ]
    );

    // Handlers for editable fields
    // const handleIntentUpdate = useCallback(() => {
    //   if (content.type === "sentence" && content["block-id"]) {
    //     const blockId = content["block-id"] as string;
    //     updateSentenceMutation.mutate(
    //       {
    //         blockId,
    //         intent: localIntent,
    //       },
    //       {
    //         onSuccess: () => {
    //           updateContent(blockId, { intent: localIntent });
    //           setEditingIntent(false);
    //         },
    //       }
    //     );
    //   }
    // }, [
    //   content.type,
    //   content["block-id"],
    //   localIntent,
    //   updateSentenceMutation,
    //   updateContent,
    // ]);

    const handleSummaryUpdate = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        const blockId = content["block-id"] as string;
        updateSentenceMutation.mutate(
          {
            blockId,
            summary: localSummary,
          },
          {
            onSuccess: () => {
              updateContent(blockId, { summary: localSummary });
              setEditingSummary(false);
            },
          }
        );
      }
    }, [
      content.type,
      content["block-id"],
      localSummary,
      updateSentenceMutation,
      updateContent,
    ]);

    // const handleIntentCancel = useCallback(() => {
    //   setLocalIntent(content.intent || "");
    //   setEditingIntent(false);
    // }, [content.intent]);

    const handleSummaryCancel = useCallback(() => {
      setLocalSummary(content.summary || "");
      setEditingSummary(false);
    }, [content.summary]);

    // const handleIntentKeyDown = useCallback(
    //   (e: React.KeyboardEvent<HTMLInputElement>) => {
    //     if (e.key === "Enter") {
    //       handleIntentUpdate();
    //     } else if (e.key === "Escape") {
    //       handleIntentCancel();
    //     }
    //   },
    //   [handleIntentUpdate, handleIntentCancel]
    // );

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

    // Focus intent input when editing starts
    useEffect(() => {
      if (editingIntent && intentInputRef.current) {
        intentInputRef.current.focus();
      }
    }, [editingIntent]);

    // Focus summary input when editing starts
    useEffect(() => {
      if (editingSummary && summaryInputRef.current) {
        summaryInputRef.current.focus();
      }
    }, [editingSummary]);

    // Get style classes based on content type
    const bgColorClass = getBackgroundColorClass(content.type || "");
    const borderColorClass = getBorderColorClass(content.type || "");

    // selectedContent인 경우 진한 파란색 테두리 스타일
    const selectedContentBorderStyle = isSelectedContent
      ? "border-blue-600 border-2"
      : borderColorClass;

    // Menu action handlers
    const handleFilter = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (content["block-id"]) {
        if (isActiveMessageFilter) {
          setFilterBlockId(null);
          toggleFiltering(false);
        } else {
          setFilterBlockId(content["block-id"]);
          toggleFiltering(true);
        }
      }
      setIsMenuOpen(false);
    };
    const handleDeleteMenu = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDelete();
      setIsMenuOpen(false);
    };

    const handleHistory = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsHistoryModalOpen(true);
      setIsMenuOpen(false);
    };

    useEffect(() => {
      // Adjust textarea height on initial render or when content changes
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"; // Reset height
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight+5}px`; // Adjust to content
      }
    }, [localValue]); // Run this effect whenever `localValue` changes

    /**
     * It handles the textarea resize. Notice that the subtracted number on
     * `e.target.scrollHeight - 16` is the sum of top and bottom padding.
     * It's important to keep it up-to-date to avoid flickering.
     */
    const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${e.target.scrollHeight}px`;
      }
      setLocalValue(e.target.value); // Update local value
    };

    return (
      <div className="relative group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} data-block-id={content["block-id"] || undefined}>
        {/* Vertical level indicator lines */}
        <LevelIndicator
          level={level}
          showHierarchy={appShowHierarchy}
          contentType={content.type || ""}
        />

        {/* Floating menu button for sentences */}
        {content.type === "sentence" && (
          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              ref={refs.setReference}
              {...getReferenceProps()}
              className="p-1.5 rounded-full bg-white shadow hover:bg-gray-100 text-gray-600 transition-colors"
              title="Sentence actions"
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
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                    onClick={handleFilter}
                  >
                    <FiFilter className={isActiveMessageFilter ? "text-blue-500" : ""} />
                    {isActiveMessageFilter ? "Show All Messages" : "Show Related Messages"}
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                    onClick={handleDeleteMenu}
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </div>
              </FloatingPortal>
            )}
            {isHistoryModalOpen && (
              <EditHistoryModal
                block={content}
                paperId={paperId || ''}
                userId={userId || ''}
                onClose={() => setIsHistoryModalOpen(false)}
              />
            )}
          </div>
        )}

        <div
          style={{
            paddingLeft: showHierarchy ? `${level * 16 + 16}px` : "0",
          }}
        >
          <div
            className={`flex flex-col py-1 px-2 rounded-t-lg pr-10 ${
              isSelectedContent ? "bg-blue-100" : bgColorClass
            } relative`}
          >
            {/* Summary Field - sentence 타입이 아닐 경우에만 표시 */}
            {content.type !== "sentence" && (
              <EditableField
                value={localSummary}
                onChange={setLocalSummary}
                onUpdate={handleSummaryUpdate}
                onCancel={handleSummaryCancel}
                isEditing={editingSummary}
                setIsEditing={setEditingSummary}
                inputRef={summaryInputRef}
                placeholder="Enter summary"
                isHovered={isHovered}
                isSentence={false}
                onKeyDown={handleSummaryKeyDown}
                isLoading={isUpdating}
              />
            )}

            {/* Intent Field - sentence 타입인 경우에만 표시하고, intent가 있을 때만 아이콘 표시 */}
            {/* {content.type === "sentence" && (
              <EditableField
                value={localIntent}
                onChange={setLocalIntent}
                onUpdate={handleIntentUpdate}
                onCancel={handleIntentCancel}
                isEditing={editingIntent}
                setIsEditing={setEditingIntent}
                inputRef={intentInputRef}
                placeholder="Add Intent"
                icon={localIntent ? "🎯" : ""}
                isHovered={isHovered}
                isSentence={true}
                onKeyDown={handleIntentKeyDown}
                isLoading={isUpdating}
              />
            )} */}
          </div>
          <div>
            {content.type === "sentence" && lastModifiedBy && (
              <div className="text-xs text-gray-500 mb-1">
                Last modified by: {lastModifiedBy}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={localValue || ""}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              className={`w-full min-h-[0px] p-2 rounded-b-lg font-inherit resize-vertical border text-sm pr-10 ${selectedContentBorderStyle}`}
            />

            {/* Show button when focused (regardless of content changes) */}
            {(isFocused || isUpdating) && content.type === "sentence" && (
              <div className="flex justify-end gap-2 mb-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // 이벤트 버블링 방지
                    e.preventDefault();
                    console.log("Cancel button clicked");
                    handleCancel();
                  }}
                  className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                  disabled={isUpdating}
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // 이벤트 버블링 방지
                    e.preventDefault();
                    console.log("Update button clicked");
                    handleUpdate();
                  }}
                  className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ClipLoader size={12} color="#ffffff" />
                  ) : (
                    <>
                      Update
                      <span
                        className="text-xs opacity-80"
                        title="Press Enter key to update"
                      >
                        ⏎
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default TextEditor;
