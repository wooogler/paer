import React, { memo } from "react";
import { useContentStore } from "../../store/useContentStore";
import { Content, ContentType } from "@paer/shared";
import { isSelectableContent, getTypeColor } from "../../utils/contentUtils";
import { useChatStore } from "../../store/useChatStore";
import { ClipLoader } from "react-spinners";

interface TreeItemProps {
  content: Content | null;
  path: number[];
  depth: number;
  displayMode: "summary" | "intent";
}

const TreeItem: React.FC<TreeItemProps> = memo(
  ({ content, path, depth, displayMode }) => {
    const {
      selectedPath,
      selectedBlockPath,
      setSelectedBlock,
      isBlockUpdating,
    } = useContentStore();
    const { setFilterBlockId, isFilteringEnabled, filterBlockId, toggleFiltering } =
      useChatStore();

    // Check if current item is selectedBlock
    const isSelectedBlock = selectedBlockPath?.join(",") === path.join(",");
    // Check if current item is selectedContent
    const isSelectedContent = selectedPath?.join(",") === path.join(",");
    // Check if current item is active message filter
    const isActiveMessageFilter =
      content?.["block-id"] === filterBlockId && isFilteringEnabled;

    // Check if current item is updating
    const isUpdating = content?.["block-id"]
      ? isBlockUpdating(content["block-id"] as string)
      : false;

    if (!content) {
      return (
        <div className="p-4 text-gray-500">
          No paper has been written yet. Please create a new paper.
        </div>
      );
    }

    const handleClick = () => {
      // Allow clicking even during updates
      if (isSelectableContent(content.type)) {
        setSelectedBlock(content, path);
      }
    };

    // Handle chat filtering toggle
    const handleShowMessages = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent parent element click event propagation

      // Disable button for updating items
      if (isUpdating) return;

      if (content["block-id"]) {
        if (isActiveMessageFilter) {
          // If already active, clear filtering
          setFilterBlockId(null);
          toggleFiltering(false);
        } else {
          // If not active, filter by this block
          setFilterBlockId(content["block-id"]);
          toggleFiltering(true);
        }
      }
    };

    // Determine whether to show message icon
    // 1. In filtering mode: only show icon for filtered item
    // 2. In normal mode: show icon for selected item
    const shouldShowMessageIcon = isFilteringEnabled
      ? content["block-id"] === filterBlockId // Filtering mode: show icon for filtered item
      : isSelectedContent || isSelectedBlock; // Normal mode: show icon for selected item

    // Get color class based on content type
    const contentColorClass = getTypeColor(content.type as ContentType).main;

    // Determine how to display the title
    const displayTitle = (() => {
      if (content.type === "paragraph") {
        // For paragraphs, show summary in summary mode, otherwise show intent
        // If intent is empty, show the paragraph label
        if (displayMode === "summary") {
          return (
            content.summary ||
            `Paragraph ${path.map((idx) => idx + 1).join(".")}`
          );
        } else {
          return (
            content.intent && content.intent.trim() !== ""
              ? content.intent
              : `Paragraph ${path.map((idx) => idx + 1).join(".")}`
          );
        }
      }
      // For subsection and subsubsection, show label if title is empty
      if (content.type === "subsection") {
        return (
          content.title && content.title.trim() !== ""
            ? content.title
            : `Subsection ${path.map((idx) => idx + 1).join(".")}`
        );
      }
      if (content.type === "subsubsection") {
        return (
          content.title && content.title.trim() !== ""
            ? content.title
            : `Subsubsection ${path.map((idx) => idx + 1).join(".")}`
        );
      }
      // Handle default case when content.type is missing
      if (!content.type) {
        return `Unknown ${path.map((idx) => idx + 1).join(".")}`;
      }
      return (
        content.title ||
        `${
          content.type.charAt(0).toUpperCase() + content.type.slice(1)
        } ${path.map((idx) => idx + 1).join(".")}`
      );
    })();

    return (
      <div>
        <div
          className={`py-1 flex items-start gap-2 ${
            isSelectableContent(content.type)
              ? "cursor-pointer opacity-100"
              : "cursor-default opacity-70"
          } ${isSelectedContent ? "bg-blue-100" : ""} ${
            isSelectedBlock && !isSelectedContent ? "bg-gray-100" : ""
          }`}
          style={{ paddingLeft: `${depth * 20}px` }}
          onClick={handleClick}
        >
          <div className="flex flex-col w-full min-w-0">
            {/* Display the title */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {/* Loading indicator - keep the spinner but remove the text */}
                {isUpdating && (
                  <ClipLoader size={12} color="#3B82F6" className="mr-2" />
                )}
                <span
                  className={`${contentColorClass} ${
                    content.type === "paragraph"
                      ? "text-xs" // Apply smaller font size for paragraph type
                      : "text-sm font-bold"
                  } ${isSelectedContent ? "" : ""} ${
                    isSelectedContent ? "" : "truncate"
                  }`}
                  title={isSelectedContent ? "" : displayTitle}
                >
                  {displayTitle}
                </span>
              </div>

              {/* Message icon button - shown for selected items, blue when active */}
              {shouldShowMessageIcon && (
                <button
                  onClick={handleShowMessages}
                  className={`ml-2 flex-shrink-0 ${
                    isActiveMessageFilter
                      ? "text-blue-500 bg-blue-50"
                      : "text-gray-500 hover:text-blue-500 hover:bg-blue-50"
                  } transition-colors p-1 rounded-full ${
                    isUpdating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title={
                    isActiveMessageFilter
                      ? "Show all messages"
                      : "Show related messages"
                  }
                  disabled={isUpdating}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </button>
              )}
            </div>

            {/* Display summary or intent for non-paragraph types */}
            {/* {content.type !== "paragraph" && (
              <span
                className={`text-gray-600 text-xs ${
                  isSelectedContent ? "break-words" : "truncate block"
                }`}
                title={isSelectedContent ? "" : displayText}
              >
                {displayText}
              </span>
            )} */}

          </div>
        </div>

        {/* Render child content recursively */}
        {Array.isArray(content.content) &&
          content.content.map((child: Content, index: number) => (
            child.type !== "sentence" && (
              <TreeItem
                key={child?.["block-id"] || index}
                content={child}
                path={[...path, index]}
                depth={depth + 1}
                displayMode={displayMode}
              />
            )
          ))}
      </div>
    );
  }
);

export default TreeItem;
