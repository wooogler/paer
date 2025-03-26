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

interface TextEditorProps {
  content: Content;
  level?: number;
  isLast?: boolean;
  onNextFocus?: () => void;
  onAddNewSentence?: () => void;
}

const TextEditor: React.FC<TextEditorProps> = React.memo(
  ({ content, level = 0, isLast = false, onNextFocus, onAddNewSentence }) => {
    const { updateContent } = useContentStore();
    const { showHierarchy } = useAppStore();
    const updateSentenceMutation = useUpdateSentence();
    const deleteSentenceMutation = useDeleteSentence();
    // Add state to save current content when focus starts
    const [initialContent, setInitialContent] = useState<string>("");
    // Add state to track if the textarea is focused
    const [isFocused, setIsFocused] = useState<boolean>(false);
    // Add state to track hover for delete button
    const [isHovered, setIsHovered] = useState<boolean>(false);
    // Add ref for textarea to manage focus
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
