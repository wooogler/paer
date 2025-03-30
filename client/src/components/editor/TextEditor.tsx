import React, { useCallback, useEffect, useState, useRef } from "react";
import { Content } from "@paer/shared";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";
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

    // State for textarea
    const [initialContent, setInitialContent] = useState<string>("");
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // State for editable fields
    const [editingIntent, setEditingIntent] = useState(false);
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
    }, []);

    // Add onBlur event handler
    const handleBlur = useCallback(() => {
      setIsFocused(false);
    }, []);

    // Update button handler
    const handleUpdate = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        const blockId = content["block-id"] as string;

        // Send update request to server first
        updateSentenceMutation.mutate(
          {
            blockId,
            content: localValue,
            summary: localSummary,
            intent: localIntent,
          },
          {
            onSuccess: () => {
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

    // Handlers for editable fields
    const handleIntentUpdate = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        console.log(
          "Intent update - Before:",
          content.intent,
          "New:",
          localIntent
        );

        updateSentenceMutation.mutate({
          blockId: content["block-id"],
          intent: localIntent,
        });

        updateContent(content["block-id"], { intent: localIntent });
        setEditingIntent(false);
      }
    }, [
      content.type,
      content["block-id"],
      localIntent,
      updateSentenceMutation,
      updateContent,
    ]);

    const handleSummaryUpdate = useCallback(() => {
      if (content.type === "sentence" && content["block-id"]) {
        console.log(
          "Summary update - Before:",
          content.summary,
          "New:",
          localSummary
        );

        updateSentenceMutation.mutate({
          blockId: content["block-id"],
          summary: localSummary,
        });

        updateContent(content["block-id"], { summary: localSummary });
        setEditingSummary(false);
      }
    }, [
      content.type,
      content["block-id"],
      localSummary,
      updateSentenceMutation,
      updateContent,
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

    return (
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Vertical level indicator lines */}
        <LevelIndicator
          level={level}
          showHierarchy={appShowHierarchy}
          contentType={content.type || ""}
        />

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
            paddingLeft: showHierarchy ? `${level * 16 + 16}px` : "0",
          }}
        >
          <div
            className={`flex flex-col py-1 px-2 rounded-t-lg ${bgColorClass}`}
          >
            {/* Summary Field */}
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
              isSentence={content.type === "sentence"}
              onKeyDown={handleSummaryKeyDown}
            />

            {/* Intent Field */}
            <EditableField
              value={localIntent}
              onChange={setLocalIntent}
              onUpdate={handleIntentUpdate}
              onCancel={handleIntentCancel}
              isEditing={editingIntent}
              setIsEditing={setEditingIntent}
              inputRef={intentInputRef}
              placeholder="Enter intent"
              icon="🎯"
              isHovered={isHovered}
              isSentence={content.type === "sentence"}
              onKeyDown={handleIntentKeyDown}
            />
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
