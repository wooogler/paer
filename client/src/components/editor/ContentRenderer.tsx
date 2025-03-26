import React from "react";
import { Content, ContentType } from "@paer/shared";
import ContainerRenderer from "./ContainerRenderer";
import ParagraphRenderer from "./ParagraphRenderer";

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
  subsection: { showTitle: true, marginClass: "" },
  section: { showTitle: true, marginClass: "" },
  paper: { showTitle: false, marginClass: "" },
  sentence: { showTitle: false, marginClass: "" },
};

const ContentRenderer: React.FC<ContentRendererProps> = React.memo(
  ({ content, path, isTopLevel = true, level = 0 }) => {
    if (!content || !content.type) {
      console.error("Invalid content:", content);
      return null;
    }

    // For paragraph type content - special handling with ParagraphRenderer
    if (content.type === "paragraph") {
      return <ParagraphRenderer content={content} path={path} level={level} />;
    }

    // Get configuration for this content type
    const config = typeConfig[content.type];

    // For container types (section, subsection, paper)
    if (
      content.type === "section" ||
      content.type === "subsection" ||
      content.type === "paper" ||
      (content.content && Array.isArray(content.content))
    ) {
      // Initialize content.content as an empty array if it doesn't exist
      const safeContent = {
        ...content,
        content:
          content.content && Array.isArray(content.content)
            ? content.content
            : [],
      };

      return (
        <ContainerRenderer
          content={safeContent}
          path={path}
          level={level}
          isTopLevel={isTopLevel}
          config={config}
        />
      );
    }

    // For other cases (empty rendering)
    return null;
  }
);

export default ContentRenderer;
