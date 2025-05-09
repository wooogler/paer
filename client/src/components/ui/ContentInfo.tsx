import React from "react";
import { Content, ContentType } from "@paer/shared";
import { useContentStore } from "../../store/useContentStore";
import { getTypeColor } from "../../utils/contentUtils";

interface ContentInfoProps {
  content: Content | null;
  path?: number[]; // Add path prop for hierarchical label
  lightText?: boolean; // Dark text on light background or vice versa
  isClickable?: boolean; // Whether the content is clickable
}

const ContentInfo: React.FC<ContentInfoProps> = ({
  content,
  path = [],
  lightText = false,
  isClickable = false,
}) => {
  const { setSelectedBlock } = useContentStore();

  if (!content) return null;

  // Convert content type to English (capitalize first letter)
  const contentType = content.type
    ? content.type.charAt(0).toUpperCase() + content.type.slice(1)
    : "Unknown";

  // Get color class based on type
  const colorClass = content.type ? getTypeColor(content.type as ContentType).main : "text-gray-500";

  // Determine text to display based on content type
  let contentTitle = "No title";

  if (content.title && content.title.trim() !== "") {
    contentTitle = content.title;
  } else if (content.intent && content.intent.trim() !== "") {
    contentTitle = content.intent;
  } else if (content.type === "sentence") {
    if (content.summary && content.summary.trim() !== "") {
      contentTitle = content.summary;
    } else if (typeof content.content === "string") {
      contentTitle =
        content.content.length > 60
          ? content.content.substring(0, 60) + "..."
          : content.content;
    } else {
      contentTitle = "No content";
    }
  } else if (content.type === "paragraph") {
    // Only use summary if it's non-empty and not 'Empty Summary'
    if (content.summary && content.summary.trim() !== "" && content.summary !== "Empty Summary") {
      contentTitle = content.summary;
    } else {
      // Use path prop if available
      const paragraphPath = path || (content as any).path;
      if (Array.isArray(paragraphPath)) {
        contentTitle = `Paragraph ${paragraphPath.map((idx: number) => idx + 1).join(".")}`;
      } else {
        contentTitle = "Paragraph";
      }
    }
  } else if (content.type === "subsection") {
    contentTitle = content.title && content.title.trim() !== "" ? content.title : "";
    if (!contentTitle) {
      const subsectionPath = path || (content as any).path;
      if (Array.isArray(subsectionPath)) {
        contentTitle = `Subsection ${subsectionPath.map((idx: number) => idx + 1).join(".")}`;
      } else {
        contentTitle = "Subsection";
      }
    }
  } else if (content.type === "subsubsection") {
    contentTitle = content.title && content.title.trim() !== "" ? content.title : "";
    if (!contentTitle) {
      const subsubsectionPath = path || (content as any).path;
      if (Array.isArray(subsubsectionPath)) {
        contentTitle = `Subsubsection ${subsubsectionPath.map((idx: number) => idx + 1).join(".")}`;
      } else {
        contentTitle = "Subsubsection";
      }
    }
  } else if (content.summary && content.summary.trim() !== "") {
    contentTitle = content.summary;
  }
  // If still no title, fallback to type + path
  if (!contentTitle || contentTitle === "No summary" || contentTitle === "No title") {
    const fallbackPath = path || (content as any).path;
    if (Array.isArray(fallbackPath)) {
      contentTitle = `${contentType} ${fallbackPath.map((idx: number) => idx + 1).join(".")}`;
    } else {
      contentTitle = contentType;
    }
  }

  // Click handler - content selection and scroll
  const handleContentClick = () => {
    if (!isClickable || !content["block-id"]) return;

    // Find path by content type (recursive function)
    const findContentPath = (
      rootContent: any,
      targetId: string,
      currentPath: number[] = []
    ): number[] | null => {
      // Check if current node is target node
      if (rootContent["block-id"] === targetId) {
        return currentPath;
      }

      // Check if there are any subcontents
      if (rootContent.content && Array.isArray(rootContent.content)) {
        // Search each subcontent
        for (let i = 0; i < rootContent.content.length; i++) {
          const childPath = findContentPath(rootContent.content[i], targetId, [
            ...currentPath,
            i,
          ]);
          if (childPath) return childPath;
        }
      }

      return null;
    };

    // Find path in the entire content tree
    const rootContent = useContentStore.getState().content;
    const path = findContentPath(rootContent, content["block-id"]);

    if (path) {
      // If sentence is clicked, find its parent paragraph
      if (content.type === "sentence") {
        // Find parent paragraph of sentence
        if (path.length >= 2) {
          // Since paragraph.content[index] = sentence structure, at least 2 levels
          // paragraph path (remove last element from sentence path)
          const paragraphPath = path.slice(0, -1);

          // Get paragraph content
          let paragraphContent: any = rootContent;
          for (const index of paragraphPath) {
            if (
              paragraphContent?.content &&
              Array.isArray(paragraphContent.content)
            ) {
              paragraphContent = paragraphContent.content[index];
            } else {
              paragraphContent = null;
              break;
            }
          }

          // If parent paragraph exists, set selectedBlock
          if (paragraphContent && paragraphContent.type === "paragraph") {
            // First set content as sentence (before setting Block)
            setSelectedBlock(content, path);

            // Then set block as paragraph (this way selectedContent is not overwritten)
            // useContentStore internal logic bypass by directly setting state
            useContentStore.setState({
              selectedBlock: paragraphContent,
              selectedBlockPath: paragraphPath,
            });
          } else {
            // If paragraph cannot be found, set sentence itself as content and block
            setSelectedBlock(content, path);
            useContentStore.setState({
              selectedBlock: content,
              selectedBlockPath: path,
            });
          }
        } else {
          // If path is too short, just set sentence itself as content and block
          setSelectedBlock(content, path);
          useContentStore.setState({
            selectedBlock: content,
            selectedBlockPath: path,
          });
        }
      } else {
        // If not sentence, handle normally
        setSelectedBlock(content, path);
      }

      // Scroll to element
      setTimeout(() => {
        // Scroll to target ID
        const element = document.querySelector(
          `[data-block-id="${content["block-id"]}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  };

  // Additional class based on whether content is clickable
  const clickableLabelClasses = isClickable
    ? "cursor-pointer hover:opacity-90 hover:scale-105 hover:shadow-sm active:opacity-75 transition-all duration-200"
    : "";

  // Always display as block (apply background color)
  return (
    <div className={`border-b border-gray-200 p-2 text-sm text-gray-600 h-10`}>
      <div className="flex items-center">
        <span
          className={`font-medium ${colorClass} px-2 py-0.5 rounded text-xs mr-2 border border-current ${
            lightText ? "bg-opacity-20 text-white" : "bg-white/50"
          } ${clickableLabelClasses}`}
          onClick={isClickable ? handleContentClick : undefined}
          title={isClickable ? "Click to navigate to this content" : undefined}
          role={isClickable ? "button" : undefined}
        >
          {contentType}
        </span>
        <span
          className={`truncate font-medium max-w-[calc(100%-5rem)] ${
            lightText ? "text-white" : ""
          }`}
        >
          {contentTitle}
        </span>
      </div>
    </div>
  );
};

export default ContentInfo;
