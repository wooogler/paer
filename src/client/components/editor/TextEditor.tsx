import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Content } from "../../types/content";
import { useContentStore } from "../../store/useContentStore";

interface TextEditorProps {
  content: Content;
  path: number[];
  index: number;
  level?: number;
}

const TextEditor: React.FC<TextEditorProps> = React.memo(
  ({ content, path, index, level = 0 }) => {
    const { updateContent } = useContentStore();

    // For sentence type, content contains the actual text
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (content.type === "sentence") {
          // Using setTimeout for delayed update
          setTimeout(() => {
            updateContent([...path, index], { content: value });
          }, 0);
        } else {
          setTimeout(() => {
            updateContent([...path, index], { summary: value });
          }, 0);
        }
      },
      [content.type, path, index, updateContent]
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
      if (level === 0) return null;

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

    // Manage content value in local state for better responsiveness
    const [localValue, setLocalValue] = useState<string>(
      content.type === "sentence"
        ? (content.content as string) || ""
        : content.summary || ""
    );

    // Update local state only when content prop changes
    useEffect(() => {
      setLocalValue(
        content.type === "sentence"
          ? (content.content as string) || ""
          : content.summary || ""
      );
    }, [content.type, content.content, content.summary]);

    // Local state change handler
    const handleLocalChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setLocalValue(value);
        handleChange(e);
      },
      [handleChange]
    );

    return (
      <div className="relative">
        {/* Vertical level indicator lines */}
        {renderLevelLines()}

        <div style={{ paddingLeft: `${level * 16 + 16}px` }}>
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
          <textarea
            value={localValue}
            onChange={handleLocalChange}
            className={`w-full min-h-[80px] p-2 rounded-b-lg font-inherit resize-vertical border text-sm ${borderColorClass}`}
          />
        </div>
      </div>
    );
  }
);

export default TextEditor;
