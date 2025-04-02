import React, { useState, useRef, useCallback } from "react";
import { Content } from "@paer/shared";
import { useAppStore } from "../../store/useAppStore";
import { useAddBlock } from "../../hooks/usePaperQuery";
import TextEditor from "./TextEditor";
import AddBlockButton from "./AddBlockButton";
import { getHoverBackgroundColor } from "../../utils/contentUtils";

interface ParagraphEditorProps {
  content: Content;
  path: number[];
  level?: number;
}

const ParagraphEditor: React.FC<ParagraphEditorProps> = React.memo(
  ({ content, path, level = 0 }) => {
    const { showHierarchy } = useAppStore();
    const addBlockMutation = useAddBlock();

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
          // Add a new block with sentence type
          addBlockMutation.mutate({
            parentBlockId: content["block-id"] as string,
            prevBlockId: null,
            blockType: "sentence",
          });
          return;
        }

        // Safe to access content.content since we've already checked it's an array
        const contentArray = content.content as Content[];
        // Otherwise, get the blockId of the sentence before the insertion point
        const prevSentence = contentArray[index - 1];

        if (typeof prevSentence !== "string" && prevSentence["block-id"]) {
          // Send request to server and update client state
          addBlockMutation.mutate({
            parentBlockId: content["block-id"] as string,
            prevBlockId: prevSentence["block-id"] as string,
            blockType: "sentence",
          });
        }
      },
      [addBlockMutation, content]
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
          addBlockMutation.mutate({
            parentBlockId: content["block-id"] as string,
            prevBlockId: lastSentence["block-id"] as string,
            blockType: "sentence",
          });
        }
      } else {
        // If there are no sentences, add at the beginning
        addBlockMutation.mutate({
          parentBlockId: content["block-id"] as string,
          prevBlockId: null,
          blockType: "sentence",
        });
      }
    }, [addBlockMutation, content]);

    return (
      <div
        className={`${
          !showHierarchy ? "pt-2 pl-0" : `pl-${level * 4} mb-4`
        } relative`}
        data-block-id={content["block-id"] || undefined}
      >
        {/* Top add button - before all sentences */}
        <div
          onMouseEnter={() => setHoverIndex(-1)}
          onMouseLeave={() => setHoverIndex(null)}
          className={`${
            hoverIndex === -1 ? getHoverBackgroundColor("sentence") : ""
          }`}
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
            <React.Fragment key={sentenceContent?.["block-id"] || index}>
              <div ref={(el) => (textEditorsRef.current[index] = el)}>
                <TextEditor
                  content={sentenceContent}
                  level={sentenceLevel}
                  path={[...path, index]}
                  isLast={index === (content.content?.length || 0) - 1}
                  onNextFocus={() => handleNextFocus(index)}
                  onAddNewSentence={
                    index === (content.content?.length || 0) - 1
                      ? handleAddLastSentence
                      : undefined
                  }
                  showHierarchy={showHierarchy}
                />
              </div>

              {/* Add button between sentences */}
              <div
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                className={`${
                  hoverIndex === index
                    ? getHoverBackgroundColor("sentence")
                    : ""
                }`}
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
