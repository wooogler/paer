import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Content } from "@paer/shared";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";
import { useUpdateSentence } from "../../hooks/usePaperQuery";

interface TextEditorProps {
  content: Content;
  path: number[];
  index: number;
  level?: number;
}

const TextEditor: React.FC<TextEditorProps> = React.memo(
  ({ content, level = 0 }) => {
    const { updateContent } = useContentStore();
    const { showHierarchy } = useAppStore();
    const updateSentenceMutation = useUpdateSentence();
    // Add state to save current content when focus starts
    const [initialContent, setInitialContent] = useState<string>("");
    // Add state to track if content has been changed
    const [isContentChanged, setIsContentChanged] = useState<boolean>(false);

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
      // Reset isContentChanged state when content changes
      setIsContentChanged(false);
    }, [content.type, content.content, content.summary]);

    // For sentence type, content contains the actual text
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setLocalValue(value);
        // Mark as changed if different from initial value
        setIsContentChanged(value !== initialContent);

        if (content.type !== "sentence") {
          // For non-sentence types, maintain real-time updates
          if (content["block-id"]) {
            updateContent(content["block-id"], { summary: value });
          }
        }
      },
      [content.type, content["block-id"], updateContent, initialContent]
    );

    // Add onFocus event handler
    const handleFocus = useCallback(() => {
      // Don't directly use content.content on focus
      // Keep initialContent as is and only check change state when needed
      if (content.type === "sentence") {
        // Set change state if current localValue differs from initialContent
        setIsContentChanged(localValue !== initialContent);
      }
    }, [content.type, localValue, initialContent]);

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

        // Reset change state
        setIsContentChanged(false);
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
      // Reset change state
      setIsContentChanged(false);
    }, [initialContent]);

    // Keyboard event handler
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // When Enter key is pressed (without Shift key)
        if (e.key === "Enter" && !e.shiftKey && content.type === "sentence") {
          // Only works when content is changed and Update button is active
          if (isContentChanged) {
            e.preventDefault(); // Prevent default Enter behavior
            handleUpdate(); // Execute update
          }
        }
      },
      [isContentChanged, handleUpdate, content.type]
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
      if (level === 0 || !showHierarchy) return null;

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

    return (
      <div className="relative">
        {/* Vertical level indicator lines */}
        {renderLevelLines()}

        <div
          style={{ paddingLeft: showHierarchy ? `${level * 16 + 16}px` : "0" }}
        >
          <div
            className={`flex flex-col gap-1 p-2 rounded-t-lg ${bgColorClass}`}
          >
            <div className="text-sm">
              <span className="break-words">{content.summary}</span>
            </div>
            <div className="text-sm flex items-center gap-2">
              <span className="font-medium">🎯 </span>
              <span className="break-words">{content.intent}</span>
            </div>
          </div>
          <div>
            <textarea
              value={localValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              className={`w-full min-h-[80px] p-2 rounded-b-lg font-inherit resize-vertical border text-sm ${borderColorClass}`}
            />

            {/* Show button only when there are changes */}
            {isContentChanged && content.type === "sentence" && (
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
