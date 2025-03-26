import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Content } from "@paer/shared";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";
import {
  useUpdateSentence,
  useDeleteSentence,
  getNewSentenceBlockId,
  setNewSentenceBlockId,
} from "../../hooks/usePaperQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSentenceContent } from "../../api/paperApi";

interface TextEditorProps {
  content: Content;
  level?: number;
  isLast?: boolean;
  showHierarchy?: boolean;
  onNextFocus?: () => void;
  onAddNewSentence?: () => void;
}

const TextEditor: React.FC<TextEditorProps> = React.memo(
  ({
    content,
    level = 0,
    isLast = false,
    showHierarchy = true,
    onNextFocus,
    onAddNewSentence,
  }) => {
    const { updateContent } = useContentStore();
    const { showHierarchy: appShowHierarchy } = useAppStore();
    const updateSentenceMutation = useUpdateSentence();
    const deleteSentenceMutation = useDeleteSentence();
    const queryClient = useQueryClient();
    // Add state to save current content when focus starts
    const [initialContent, setInitialContent] = useState<string>("");
    // Add state to track if the textarea is focused
    const [isFocused, setIsFocused] = useState<boolean>(false);
    // Add state to track hover for delete button
    const [isHovered, setIsHovered] = useState<boolean>(false);
    // Add ref for textarea to manage focus
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [editingIntent, setEditingIntent] = useState(false);
    const [editingSummary, setEditingSummary] = useState(false);
    const [localIntent, setLocalIntent] = useState(content.intent || "");
    const [localSummary, setLocalSummary] = useState(content.summary || "");
    const intentInputRef = useRef<HTMLInputElement>(null);
    const summaryInputRef = useRef<HTMLInputElement>(null);
    // 강제 리렌더링을 위한 상태 변수
    const [updateTrigger, setUpdateTrigger] = useState(0);

    // Manage content value in local state for better responsiveness
    const [localValue, setLocalValue] = useState<string>(
      content.type === "sentence"
        ? (content.content as string) || ""
        : content.summary || ""
    );

    // Update local state only when content prop changes
    useEffect(() => {
      const newValue =
        content.type === "sentence"
          ? (content.content as string) || ""
          : content.summary || "";

      setLocalValue(newValue);
      // Also update initial content for accurate change detection
      setInitialContent(newValue);
    }, [content.type, content.content, content.summary]);

    // Update local intent and summary state when content props change
    useEffect(() => {
      console.log(
        "Content props changed - intent:",
        content.intent,
        "summary:",
        content.summary
      );

      if (content.intent !== undefined) {
        setLocalIntent(content.intent);
      }
      if (content.summary !== undefined) {
        setLocalSummary(content.summary);
      }
    }, [content.intent, content.summary]);

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
      // Set focus state to true
      setIsFocused(true);
    }, []);

    // Add onBlur event handler
    const handleBlur = useCallback(() => {
      // Set focus state to false
      setIsFocused(false);
    }, []);

    // Update button handler
    const handleUpdate = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        // Send update request to server
        updateSentenceMutation.mutate({
          blockId: content["block-id"],
          content: localValue,
        });

        // Update store
        updateContent(content["block-id"], { content: localValue });

        // Also update initial content with current value
        setInitialContent(localValue);

        // Set focus state to false
        setIsFocused(false);

        // Remove focus after update
        if (textareaRef.current) {
          textareaRef.current.blur();
        }
      }
    }, [
      content.type,
      content["block-id"],
      updateSentenceMutation,
      localValue,
      updateContent,
    ]);

    // Cancel button handler
    const handleCancel = useCallback(() => {
      // Restore to original content
      setLocalValue(initialContent);

      // Set focus state to false
      setIsFocused(false);

      // Remove focus after cancel
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
    }, [initialContent]);

    // Delete handler
    const handleDelete = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        // Confirm before deleting
        if (window.confirm("Are you sure you want to delete this sentence?")) {
          // Send delete request to server
          deleteSentenceMutation.mutate(content["block-id"], {
            onSuccess: () => {},
          });
        }
      }
    }, [content.type, content["block-id"], deleteSentenceMutation]);

    // Keyboard event handler
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // When Enter key is pressed (without Shift key)
        if (e.key === "Enter" && !e.shiftKey && content.type === "sentence") {
          e.preventDefault(); // Prevent default Enter behavior
          handleUpdate(); // Execute update

          // Remove focus after update
          if (textareaRef.current) {
            textareaRef.current.blur();
          }
        }

        // When Shift+Enter is pressed for a sentence
        if (e.key === "Enter" && e.shiftKey && content.type === "sentence") {
          e.preventDefault(); // Prevent default Enter behavior

          // Always update the current content
          handleUpdate();

          // If this is the last sentence, add a new one
          if (isLast && onAddNewSentence) {
            onAddNewSentence();
          }
          // Otherwise move focus to the next sentence
          else if (onNextFocus) {
            onNextFocus();
          }
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
        content.type,
        isLast,
        onNextFocus,
        onAddNewSentence,
        localValue,
        handleDelete,
      ]
    );

    // Determine background color CSS class based on content type
    const bgColorClass = useMemo(() => {
      switch (content.type) {
        case "paper":
          return "bg-blue-50";
        case "section":
          return "bg-green-50";
        case "subsection":
          return "bg-yellow-50";
        case "paragraph":
          return "bg-orange-50";
        case "sentence":
          return "bg-gray-100";
        default:
          return "bg-white";
      }
    }, [content.type]);

    // Determine border color based on content type
    const borderColorClass = useMemo(() => {
      switch (content.type) {
        case "paper":
          return "border-blue-200";
        case "section":
          return "border-green-200";
        case "subsection":
          return "border-yellow-200";
        case "paragraph":
          return "border-orange-200";
        case "sentence":
          return "border-gray-200";
        default:
          return "border-gray-200";
      }
    }, [content.type]);

    // Determine icon color class based on content type
    const colorClass = useMemo(() => {
      switch (content.type) {
        case "paper":
          return "text-blue-600";
        case "section":
          return "text-green-600";
        case "subsection":
          return "text-yellow-600";
        case "paragraph":
          return "text-red-600";
        case "sentence":
          return "text-purple-600";
        default:
          return "text-gray-600";
      }
    }, [content.type]);

    // Create vertical level indicator lines
    const renderLevelLines = () => {
      if (level === 0 || !appShowHierarchy) return null;

      const lines = [];
      for (let i = 0; i < level; i++) {
        // Last vertical line matches content type color, others are gray
        const lineColorClass = i === level - 1 ? colorClass : "border-gray-300";

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

    // Handle intent update
    const handleIntentUpdate = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        console.log(
          "Intent update - Before:",
          content.intent,
          "New:",
          localIntent
        );

        // Use the same updateSentenceMutation for intent updates
        updateSentenceMutation.mutate({
          blockId: content["block-id"],
          intent: localIntent,
        });

        // Then update store for immediate UI update
        updateContent(content["block-id"], { intent: localIntent });

        // 강제 리렌더링 트리거
        setUpdateTrigger((prev) => prev + 1);

        setEditingIntent(false);
      }
    }, [
      content.type,
      content["block-id"],
      localIntent,
      updateSentenceMutation,
      updateContent,
    ]);

    // Handle summary update
    const handleSummaryUpdate = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        console.log(
          "Summary update - Before:",
          content.summary,
          "New:",
          localSummary
        );

        // Use the same updateSentenceMutation for summary updates
        updateSentenceMutation.mutate({
          blockId: content["block-id"],
          summary: localSummary,
        });

        // Then update store for immediate UI update
        updateContent(content["block-id"], { summary: localSummary });

        // 강제 리렌더링 트리거
        setUpdateTrigger((prev) => prev + 1);

        setEditingSummary(false);
      }
    }, [
      content.type,
      content["block-id"],
      localSummary,
      updateSentenceMutation,
      updateContent,
    ]);

    // Handle intent cancel
    const handleIntentCancel = useCallback(() => {
      setLocalIntent(content.intent || "");
      setEditingIntent(false);
    }, [content.intent]);

    // Handle summary cancel
    const handleSummaryCancel = useCallback(() => {
      setLocalSummary(content.summary || "");
      setEditingSummary(false);
    }, [content.summary]);

    // Handle intent key down
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

    // Handle summary key down
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

    return (
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Vertical level indicator lines */}
        {renderLevelLines()}

        {/* Delete button - only show for sentences when hovered */}
        {isHovered && content.type === "sentence" && content["block-id"] && (
          <button
            onClick={handleDelete}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center z-10"
            title="Delete sentence"
          >
            ✕
          </button>
        )}

        <div
          style={{
            paddingLeft:
              showHierarchy && (!content.type || content.type !== "sentence")
                ? `${level * 16 + 16}px`
                : "0",
          }}
        >
          <div
            className={`flex flex-col gap-1 p-2 rounded-t-lg ${bgColorClass}`}
          >
            <div className="text-sm relative group">
              {editingSummary ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={summaryInputRef}
                    type="text"
                    value={localSummary}
                    onChange={(e) => setLocalSummary(e.target.value)}
                    onKeyDown={handleSummaryKeyDown}
                    className="flex-1 p-1 rounded border"
                    placeholder="Enter summary"
                  />
                  <button
                    onClick={handleSummaryCancel}
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSummaryUpdate}
                    className="px-2 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Update
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="break-words">{localSummary}</span>
                  {isHovered && content.type === "sentence" && (
                    <button
                      onClick={() => setEditingSummary(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 flex-shrink-0"
                      title="Edit summary"
                    >
                      ✎
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="text-sm flex items-center gap-2 relative group">
              <span className="font-medium">🎯 </span>
              {editingIntent ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    ref={intentInputRef}
                    type="text"
                    value={localIntent}
                    onChange={(e) => setLocalIntent(e.target.value)}
                    onKeyDown={handleIntentKeyDown}
                    className="flex-1 p-1 rounded border"
                    placeholder="Enter intent"
                  />
                  <button
                    onClick={handleIntentCancel}
                    className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleIntentUpdate}
                    className="px-2 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Update
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="break-words">{localIntent}</span>
                  {isHovered && content.type === "sentence" && (
                    <button
                      onClick={() => setEditingIntent(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 flex-shrink-0"
                      title="Edit intent"
                    >
                      ✎
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-full min-h-[80px] p-2 rounded-b-lg font-inherit resize-vertical border text-sm ${borderColorClass}`}
            />

            {/* Show button when focused (regardless of content changes) */}
            {isFocused && content.type === "sentence" && (
              <div className="flex justify-end gap-2 mb-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Discard
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1"
                >
                  Update
                  <span
                    className="text-xs opacity-80"
                    title="Press Enter key to update"
                  >
                    ⏎
                  </span>
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
