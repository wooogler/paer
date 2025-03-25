import React, { useState } from "react";
import { Content } from "@paer/shared";
import { useAppStore } from "../../store/useAppStore";
import { useContentStore } from "../../store/useContentStore";
import { useAddSentence } from "../../hooks/usePaperQuery";
import TextEditor from "./TextEditor";

interface ParagraphEditorProps {
  content: Content;
  path: number[];
  level?: number;
}

const ParagraphEditor: React.FC<ParagraphEditorProps> = React.memo(
  ({ content, path, level = 0 }) => {
    const { showHierarchy } = useAppStore();
    const { addSentence } = useContentStore();
    const addSentenceMutation = useAddSentence();
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    if (!content.content || !Array.isArray(content.content)) {
      return (
        <div className="text-gray-600 text-center mb-5">
          This paragraph has no sentences
        </div>
      );
    }

    // Level for sentences is paragraph level + 1
    const sentenceLevel = level + 1;

    // Handle add sentence button click
    const handleAddSentence = (index: number) => {
      // If at beginning, pass null as blockId
      if (index === 0) {
        // 서버에 요청 후 클라이언트 상태 업데이트
        addSentenceMutation.mutate(null, {
          onSuccess: () => {},
        });
        return;
      }

      // 이미 이전에 content.content가 배열인지 확인했으므로 여기서는 안전하게 접근 가능
      const contentArray = content.content as Content[];
      // Otherwise, get the blockId of the sentence before the insertion point
      const prevSentence = contentArray[index - 1];

      if (typeof prevSentence !== "string" && prevSentence["block-id"]) {
        // 서버에 요청 후 클라이언트 상태 업데이트
        addSentenceMutation.mutate(prevSentence["block-id"] as string, {
          onSuccess: () => {},
        });
      } else {
        // Previous sentence has no blockId, cannot add
      }
    };

    return (
      <div
        className={`${
          !showHierarchy ? "pt-2 pl-0" : `pl-${level * 4} mb-4`
        } relative`}
      >
        {/* Top add button - before all sentences */}
        <div
          className="relative h-4 group cursor-pointer"
          onMouseEnter={() => setHoverIndex(-1)}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {hoverIndex === -1 && (
            <div className="absolute inset-x-0 flex justify-center">
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center transform transition-transform hover:scale-110 z-10"
                onClick={() => handleAddSentence(0)}
                title="Add sentence at the beginning"
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Render all sentences with add buttons between them */}
        {content.content.map((sentenceContent, index) => (
          <React.Fragment key={index}>
            <TextEditor content={sentenceContent} level={sentenceLevel} />

            {/* Add button between sentences */}
            <div
              className="relative h-4 group cursor-pointer"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {hoverIndex === index && (
                <div className="absolute inset-x-0 flex justify-center">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center transform transition-transform hover:scale-110 z-10"
                    onClick={() => handleAddSentence(index + 1)}
                    title="Add sentence here"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }
);

export default ParagraphEditor;
