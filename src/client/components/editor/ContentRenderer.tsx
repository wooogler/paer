import React from "react";
import { Content } from "../../types/content";
import HierarchyTitle from "./HierarchyTitle";
import ParagraphEditor from "./ParagraphEditor";

interface ContentRendererProps {
  content: Content;
  path: number[];
  isTopLevel?: boolean;
  level?: number;
}

const ContentRenderer: React.FC<ContentRendererProps> = ({
  content,
  path,
  isTopLevel = true,
  level = 0,
}) => {
  // For paragraph type content
  if (content.type === "paragraph") {
    return (
      <div key={path.join("-")}>
        <HierarchyTitle content={content} level={level} />
        <ParagraphEditor content={content} path={path} level={level} />
      </div>
    );
  }

  // For subsection type content
  if (content.type === "subsection") {
    return (
      <div className="mb-8">
        {!isTopLevel && <HierarchyTitle content={content} level={level} />}
        {content.content && Array.isArray(content.content) && (
          <>
            {content.content.map((child, index) => (
              <ContentRenderer
                key={index}
                content={child}
                path={[...path, index]}
                isTopLevel={false}
                level={level + 1}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  // For other content types with content array (such as section)
  if (content.content && Array.isArray(content.content)) {
    return (
      <>
        {content.content.map((child, index) => (
          <ContentRenderer
            key={index}
            content={child}
            path={[...path, index]}
            isTopLevel={false}
            level={level + 1}
          />
        ))}
      </>
    );
  }

  // For other cases (empty rendering)
  return null;
};

export default ContentRenderer;
