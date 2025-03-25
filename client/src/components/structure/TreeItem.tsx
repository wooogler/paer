import React from "react";
import { useContentStore } from "../../store/useContentStore";
import { Content } from "@paer/shared";
import { isSelectableContent } from "../../utils/contentUtils";

interface TreeItemProps {
  content: Content;
  path: number[];
  depth: number;
  displayMode: "summary" | "intent";
}

const TreeItem: React.FC<TreeItemProps> = ({
  content,
  path,
  depth,
  displayMode,
}) => {
  const { selectedPath, setSelectedContent } = useContentStore();
  const isSelected = selectedPath?.join(",") === path.join(",");

  if (content.type === "sentence") {
    return null;
  }

  const handleClick = () => {
    if (isSelectableContent(content.type)) {
      setSelectedContent(content, path);
    }
  };

  // Get color class based on content type
  const getColorClass = () => {
    switch (content.type) {
      case "paper":
        return "text-blue-600";
      case "section":
        return "text-green-600";
      case "subsection":
        return "text-yellow-600";
      case "paragraph":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const contentColorClass = getColorClass();

  // Determine how to display the title
  const getDisplayTitle = () => {
    if (content.type === "paragraph") {
      // For paragraphs, show summary in summary mode, otherwise show intent
      // Match behavior with HierarchyTitle component
      return displayMode === "summary" ? content.summary : content.intent;
    }

    return (
      content.title ||
      `${
        content.type.charAt(0).toUpperCase() + content.type.slice(1)
      } ${path.join(".")}`
    );
  };

  // Get the display text based on display mode
  const getDisplayText = () => {
    return displayMode === "summary" ? content.summary : content.intent;
  };

  return (
    <div>
      <div
        className={`py-1 flex items-start gap-2 ${
          isSelectableContent(content.type)
            ? "cursor-pointer opacity-100"
            : "cursor-default opacity-70"
        } ${isSelected ? "bg-blue-50" : "bg-transparent"}`}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={handleClick}
      >
        <div className="flex flex-col w-full min-w-0">
          {/* Display the title */}
          <span
            className={`break-words ${contentColorClass} ${
              content.type === "paragraph" ? "" : "font-bold"
            }`}
          >
            {getDisplayTitle()}
          </span>

          {/* Display summary or intent for non-paragraph types */}
          {content.type !== "paragraph" && (
            <span className="text-gray-600 text-sm break-words">
              {getDisplayText()}
            </span>
          )}
        </div>
      </div>

      {/* Render child content recursively */}
      {Array.isArray(content.content) &&
        content.content.map((child: Content, index: number) => (
          <TreeItem
            key={index}
            content={child}
            path={[...path, index]}
            depth={depth + 1}
            displayMode={displayMode}
          />
        ))}
    </div>
  );
};

export default TreeItem;
