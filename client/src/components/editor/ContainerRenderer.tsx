import React from "react";
import { Content, ContentType } from "@paer/shared";
import { useAppStore } from "../../store/useAppStore";
import HierarchyTitle from "./HierarchyTitle";
import ContentRenderer from "./ContentRenderer";
import AddBlockButton from "./AddBlockButton";

interface ContainerRendererProps {
  content: Content;
  path: number[];
  level: number;
  isTopLevel: boolean;
  config: {
    showTitle: boolean;
    marginClass: string;
  };
}

const ContainerRenderer: React.FC<ContainerRendererProps> = React.memo(
  ({ content, path, level, isTopLevel, config }) => {
    const { showHierarchy } = useAppStore();
    const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

    if (!content.content || !Array.isArray(content.content)) {
      return null;
    }

    // Determine which block type to add based on the current content type
    const getNextBlockType = (): ContentType => {
      switch (content.type) {
        case "paper":
          return "section";
        case "section":
          return "subsection";
        case "subsection":
          return "paragraph";
        case "paragraph":
          return "sentence";
        default:
          return "paragraph";
      }
    };

    // Get hover background color based on block type
    const getHoverBgColor = (): string => {
      switch (getNextBlockType()) {
        case "section":
          return "bg-orange-50/80";
        case "subsection":
          return "bg-purple-50/80";
        case "paragraph":
          return "bg-green-50/80";
        case "sentence":
          return "bg-blue-50/80";
        default:
          return "bg-gray-50/80";
      }
    };

    return (
      <div className={`${config.marginClass} ${!showHierarchy ? "pl-0" : ""}`}>
        {/* Show title if configured and not top level */}
        {config.showTitle && !isTopLevel && (
          <HierarchyTitle
            content={content}
            level={level}
            renderLines={showHierarchy}
          />
        )}

        {/* Top add button - before all blocks */}
        <div
          onMouseEnter={() => setHoverIndex(-1)}
          onMouseLeave={() => setHoverIndex(null)}
          className={`group cursor-pointer transition-all duration-200 ${
            hoverIndex === -1 ? "h-auto" : "h-4"
          }`}
        >
          <AddBlockButton
            onClick={() => {}}
            isVisible={hoverIndex === -1}
            blockType={getNextBlockType()}
          />
        </div>

        {/* Render children with dividers between paragraphs */}
        {content.content.map((child, index) => {
          const isParagraph =
            typeof child !== "string" && child.type === "paragraph";
          const contentArray = content.content as Content[];
          const prevChild = index > 0 ? contentArray[index - 1] : null;
          const isPrevParagraph =
            prevChild &&
            typeof prevChild !== "string" &&
            prevChild.type === "paragraph";

          // Only show divider between consecutive paragraphs
          const showDivider = isParagraph && isPrevParagraph && !showHierarchy;

          return (
            <React.Fragment key={index}>
              {showDivider && (
                <div className="border-t-2 border-gray-200 border-dashed my-1"></div>
              )}
              <ContentRenderer
                content={child}
                path={[...path, index]}
                isTopLevel={false}
                level={level + 1}
              />

              {/* Add button between blocks */}
              {(isParagraph ||
                child.type === "subsection" ||
                child.type === "section" ||
                child.type === "sentence") && (
                <div
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  className={`group cursor-pointer transition-all duration-200 ${
                    hoverIndex === index ? "h-auto" : "h-4"
                  }`}
                >
                  <AddBlockButton
                    onClick={() => {}}
                    isVisible={hoverIndex === index}
                    blockType={getNextBlockType()}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);

export default ContainerRenderer;
