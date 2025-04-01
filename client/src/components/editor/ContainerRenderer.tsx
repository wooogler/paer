import React from "react";
import { Content, ContentType } from "@paer/shared";
import { useAppStore } from "../../store/useAppStore";
import HierarchyTitle from "./HierarchyTitle";
import ContentRenderer from "./ContentRenderer";
import AddBlockButton from "./AddBlockButton";
import { useAddBlock } from "../../hooks/usePaperQuery";

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
    const addBlockMutation = useAddBlock();

    // Handle cases where content.content is null or not an array
    const safeContent = {
      ...content,
      content:
        content.content && Array.isArray(content.content)
          ? content.content
          : [],
    };

    // Determine which block type to add based on the current content type
    const getNextBlockType = (): ContentType => {
      switch (content.type) {
        case "paper":
          return "section";
        case "section":
          return "subsection";
        case "subsection":
          return "subsubsection";
        case "subsubsection":
          return "paragraph";
        case "paragraph":
          return "sentence";
        default:
          return "paragraph";
      }
    };

    // Function to add a new block
    const handleAddBlock = (prevIndex: number) => {
      const blockType = getNextBlockType();
      const parentBlockId = content["block-id"] || null;

      let prevBlockId = null;
      if (
        prevIndex >= 0 &&
        content.content &&
        Array.isArray(content.content) &&
        prevIndex < content.content.length
      ) {
        const prevBlock = content.content[prevIndex];
        if (typeof prevBlock !== "string" && prevBlock["block-id"]) {
          prevBlockId = prevBlock["block-id"] as string;
        }
      }

      addBlockMutation.mutate({
        parentBlockId,
        prevBlockId,
        blockType,
      });
    };

    return (
      <div
        className={`${config.marginClass} ${!showHierarchy ? "pl-0" : ""}`}
        data-block-id={content["block-id"] || undefined}
      >
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
          className={`group cursor-pointer transition-all duration-200`}
        >
          <AddBlockButton
            onClick={() => handleAddBlock(-1)}
            isVisible={hoverIndex === -1}
            blockType={getNextBlockType()}
          />
        </div>

        {/* Render children with dividers between paragraphs */}
        {safeContent.content.map((child, index) => {
          const isParagraph =
            typeof child !== "string" && child.type === "paragraph";
          const contentArray = safeContent.content as Content[];
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
                child.type === "subsubsection" ||
                child.type === "section" ||
                child.type === "sentence") && (
                <div
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  className={`group cursor-pointer transition-all duration-200`}
                >
                  <AddBlockButton
                    onClick={() => handleAddBlock(index)}
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
