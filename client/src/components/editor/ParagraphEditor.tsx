import React from "react";
import { Content } from "@paer/shared";
import { useAppStore } from "../../store/useAppStore";
import TextEditor from "./TextEditor";

interface ParagraphEditorProps {
  content: Content;
  path: number[];
  level?: number;
}

const ParagraphEditor: React.FC<ParagraphEditorProps> = React.memo(
  ({ content, path, level = 0 }) => {
    const { showHierarchy } = useAppStore();

    if (!content.content || !Array.isArray(content.content)) {
      return (
        <div className="text-gray-600 text-center mb-5">
          This paragraph has no sentences
        </div>
      );
    }

    // Level for sentences is paragraph level + 1
    const sentenceLevel = level + 1;

    return (
      <div className={`mb-8 ${!showHierarchy ? "pl-0" : `pl-${level * 4}`}`}>
        {content.content.map((sentenceContent, index) => (
          <TextEditor
            key={index}
            content={sentenceContent}
            path={path}
            index={index}
            level={sentenceLevel}
          />
        ))}
      </div>
    );
  }
);

export default ParagraphEditor;
