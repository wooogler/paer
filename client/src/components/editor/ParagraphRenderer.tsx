import React from "react";
import { Content } from "@paer/shared";
import { useContentStore } from "../../store/useContentStore";
import HierarchyTitle from "./HierarchyTitle";
import ParagraphEditor from "./ParagraphEditor";
import { useAppStore } from "../../store/useAppStore";

interface ParagraphRendererProps {
  content: Content;
  path: number[];
  level: number;
}

const ParagraphRenderer: React.FC<ParagraphRendererProps> = React.memo(
  ({ content, path, level }) => {
    const { selectedContent } = useContentStore();
    const { showHierarchy } = useAppStore();
    const selectedType = selectedContent?.type;
    const shouldShowTitle = !showHierarchy || selectedType !== "paragraph";

    return (
      <div key={path.join("-")} className="border-2">
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
);

export default ParagraphRenderer;
