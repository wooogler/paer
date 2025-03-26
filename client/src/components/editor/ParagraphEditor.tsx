import React, { useState, useRef, useCallback } from "react";
import { Content } from "@paer/shared";
import { useAppStore } from "../../store/useAppStore";
import { useAddSentence } from "../../hooks/usePaperQuery";
import TextEditor from "./TextEditor";
import AddBlockButton from "./AddBlockButton";

interface ParagraphEditorProps {
  content: Content;
  path: number[];
  level?: number;
}

const ParagraphEditor: React.FC<ParagraphEditorProps> = React.memo(
  ({ content, level = 0 }) => {
    const { showHierarchy } = useAppStore();
    const addSentenceMutation = useAddSentence();

    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    // Refs for each textarea in the sentences
    const textEditorsRef = useRef<(HTMLDivElement | null)[]>([]);

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
    const handleAddSentence = useCallback(
      (index: number) => {
        // If at beginning, pass null as blockId
        if (index === 0) {
          // 서버에 요청 후 클라이언트 상태 업데이트
          addSentenceMutation.mutate(null, {
            onSuccess: () => {
              // 새 문장이 추가되면 자동으로 포커스됨
              // block-id를 별도 상태로 관리하여 포커스 처리
            },
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
            onSuccess: () => {
              // 새 문장이 추가되면 자동으로 포커스됨
              // block-id를 별도 상태로 관리하여 포커스 처리
            },
          });
        } else {
          // Previous sentence has no blockId, cannot add
        }
      },
      [addSentenceMutation, content.content]
    );

    // Function to handle focus for the next sentence
    const handleNextFocus = useCallback(
      (currentIndex: number) => {
        const nextIndex = currentIndex + 1;
        const contentArray = content.content as Content[];

        // Check if there is a next sentence
        if (nextIndex < contentArray.length) {
          // Focus the next sentence's textarea
          const nextEditorElement = textEditorsRef.current[nextIndex];
          if (nextEditorElement) {
            // Find textarea within this element and focus it
            const textarea = nextEditorElement.querySelector("textarea");
            if (textarea) {
              textarea.focus();
            }
          }
        }
      },
      [content.content]
    );

    // Add sentence after the last one
    const handleAddLastSentence = useCallback(() => {
      const contentArray = content.content as Content[];

      if (contentArray.length > 0) {
        // Get the last sentence
        const lastSentence = contentArray[contentArray.length - 1];

        if (typeof lastSentence !== "string" && lastSentence["block-id"]) {
          // Add a new sentence after the last one
          addSentenceMutation.mutate(lastSentence["block-id"] as string, {
            onSuccess: () => {
              // 새 문장이 추가되면 자동으로 포커스됨
              // block-id를 별도 상태로 관리하여 포커스 처리
            },
          });
        }
      } else {
        // If there are no sentences, add at the beginning
        addSentenceMutation.mutate(null, {
          onSuccess: () => {
            // 새 문장이 추가되면 자동으로 포커스됨
            // block-id를 별도 상태로 관리하여 포커스 처리
          },
        });
      }
    }, [addSentenceMutation, content.content]);

    return (
      <div
        className={`${
          !showHierarchy ? "pt-2 pl-0" : `pl-${level * 4} mb-4`
        } relative`}
      >
        {/* Top add button - before all sentences */}
        <div
          onMouseEnter={() => setHoverIndex(-1)}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <AddBlockButton
            onClick={() => handleAddSentence(0)}
            isVisible={hoverIndex === -1}
            blockType="sentence"
          />
        </div>

        {/* Render all sentences with add buttons between them */}
        {Array.isArray(content.content) &&
          content.content.map((sentenceContent, index) => (
            <React.Fragment key={index}>
              <div ref={(el) => (textEditorsRef.current[index] = el)}>
                <TextEditor
                  content={sentenceContent}
                  level={sentenceLevel}
                  isLast={index === (content.content?.length || 0) - 1}
                  onNextFocus={() => handleNextFocus(index)}
                  onAddNewSentence={
                    index === (content.content?.length || 0) - 1
                      ? handleAddLastSentence
                      : undefined
                  }
                />
              </div>

              {/* Add button between sentences */}
              <div
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <AddBlockButton
                  onClick={() => handleAddSentence(index + 1)}
                  isVisible={hoverIndex === index}
                  blockType="sentence"
                />
              </div>
            </React.Fragment>
          ))}
      </div>
    );
  }
);

export default ParagraphEditor;
