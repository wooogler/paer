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
    const { selectedBlock } = useContentStore();
    const { showHierarchy } = useAppStore();
    const selectedType = selectedBlock?.type;
    const shouldShowTitle = selectedType !== "paragraph";

    return (
      <div
        key={path.join("-")}
        data-block-id={content["block-id"] || undefined}
      >
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
