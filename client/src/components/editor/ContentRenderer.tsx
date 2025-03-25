import React from "react";
import { Content, ContentType } from "@paer/shared";
import { useAppStore } from "../../store/useAppStore";
import HierarchyTitle from "./HierarchyTitle";
import ParagraphEditor from "./ParagraphEditor";
import { useContentStore } from "../../store/useContentStore";

interface ContentRendererProps {
  content: Content;
  path: number[];
  isTopLevel?: boolean;
  level?: number;
}

// Configuration for different content types
const typeConfig: Record<
  ContentType,
  { showTitle: boolean; marginClass: string }
> = {
  paragraph: { showTitle: true, marginClass: "" },
  subsection: { showTitle: true, marginClass: "mb-8" },
  section: { showTitle: true, marginClass: "mb-8" },
  paper: { showTitle: false, marginClass: "" },
  sentence: { showTitle: false, marginClass: "" },
};

const ContentRenderer: React.FC<ContentRendererProps> = ({
  content,
  path,
  isTopLevel = true,
  level = 0,
}) => {
  const { showHierarchy } = useAppStore();
  // Get the type of the selected content
  const { selectedContent } = useContentStore();
  const selectedType = selectedContent?.type;

  // For paragraph type content - special handling with ParagraphEditor
  if (content.type === "paragraph") {
    const shouldShowTitle =
      selectedType === "subsection" || selectedType === "paragraph";

    return (
      <div key={path.join("-")}>
        {shouldShowTitle && (
          <HierarchyTitle
            content={content}
            level={level}
            renderLines={showHierarchy}
          />
        )}
        <ParagraphEditor content={content} path={path} level={level} />
      </div>
    );
  }

  // Get configuration for this content type
  const config = typeConfig[content.type];

  // For container types (section, subsection, paper)
  if (content.content && Array.isArray(content.content)) {
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

        {/* Render children with dividers between paragraphs */}
        {content.content.map((child, index) => {
          const isParagraph =
            typeof child !== "string" && child.type === "paragraph";
          // We already checked that content.content exists and is an array above
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
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // For other cases (empty rendering)
  return null;
};

export default ContentRenderer;
