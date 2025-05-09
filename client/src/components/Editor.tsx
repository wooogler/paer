import React, { useEffect, useMemo, useState } from "react";
import { useContentStore } from "../store/useContentStore";
import { useAppStore } from "../store/useAppStore";
import HierarchyTitle from "./editor/HierarchyTitle";
import ContentRenderer from "./editor/ContentRenderer";
import { usePaperQuery } from "../hooks/usePaperQuery";
import { useQueryClient } from "@tanstack/react-query";
import { FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import { Content } from "@paer/shared";
import { ClipLoader } from "react-spinners";
import { api } from "../api/paperApi";

interface EditorProps {
  userName: string;
}

const Editor: React.FC<EditorProps> = () => {
  const {
    selectedBlock,
    selectedBlockPath,
    parentContents,
    getContentByPath,
    setSelectedBlock,
    addUpdatingBlockId,
    clearUpdatingBlockIds,
    isBlockUpdating,
    content,
  } = useContentStore();
  const { showHierarchy } = useAppStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  // Important: Directly subscribe to paper data changes
  const { data: paperData } = usePaperQuery();

  // Update selected block with latest data
  useEffect(() => {
    if (!paperData || !selectedBlockPath) return;

    // Debounce: Prevent multiple calls in a short time
    const timeoutId = setTimeout(() => {
      // Find the latest data for the selected block
      const updatedBlock = getContentByPath(selectedBlockPath);
      if (
        updatedBlock &&
        JSON.stringify(updatedBlock) !== JSON.stringify(selectedBlock)
      ) {
        setSelectedBlock(updatedBlock, selectedBlockPath);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    paperData,
    selectedBlockPath,
    getContentByPath,
    setSelectedBlock,
    selectedBlock,
  ]);

  // Effect to restore content for selected path even after page refresh
  useEffect(() => {
    // If path exists but content is missing (after refresh), restore the content
    if (selectedBlockPath && !selectedBlock) {
      const content = getContentByPath(selectedBlockPath);
      if (content) {
        setSelectedBlock(content, selectedBlockPath);
      }
    }
  }, [selectedBlockPath, selectedBlock, getContentByPath, setSelectedBlock]);

  // Function to collect all IDs of block and its sub-blocks
  const collectBlockIds = (content: Content): string[] => {
    const ids: string[] = [];

    // Add current block ID
    if (content["block-id"]) {
      ids.push(content["block-id"] as string);
    }

    // Process sub-blocks
    if (content.content && Array.isArray(content.content)) {
      for (const child of content.content) {
        if (typeof child !== "string") {
          ids.push(...collectBlockIds(child));
        }
      }
    }

    return ids;
  };

  const handleUpdateSummaries = async () => {
    if (!selectedBlock || !selectedBlock["block-id"]) {
      alert("Please select a content block to update");
      return;
    }

    const userId = useAppStore.getState().userId;
    const paperId = useContentStore.getState().selectedPaperId;

    console.log("Current userId:", userId);
    console.log("Current paperId:", paperId);

    if (!userId || !paperId) {
      alert("Please login and select a paper first");
      return;
    }

    setIsUpdating(true);

    // Reset all update block IDs at start of update
    clearUpdatingBlockIds();

    // Collect IDs of current block and all sub-blocks and set them as updating
    const blockIds = collectBlockIds(selectedBlock);
    blockIds.forEach((id) => addUpdatingBlockId(id));

    try {
      // Get the rendered content based on block type
      let renderedContent = "";

      if (
        selectedBlock.type === "paper" ||
        selectedBlock.type === "section" ||
        selectedBlock.type === "subsection" ||
        selectedBlock.type === "subsubsection"
      ) {
        const asteriskDict = {
          "paper": "",
          "section": "*",
          "subsection": "**",
          "subsubsection": "***",
          "paragraph": "",
          "sentence": "",
        }

        // flatten nested content
        let sentenceList: string[] = 
          selectedBlock.title 
          ? [ asteriskDict[selectedBlock.type] + selectedBlock.title + asteriskDict[selectedBlock.type] + "\n" ]
          : [];
        // deep copy of selectedBlock.content
        let selectedBlockCopy = JSON.parse(
          JSON.stringify(selectedBlock.content)
        ) as Content[];
        // while selectedBlockCopy has content, depth first expansion of nested blocks
        // while current block is not of type paragraph, further expand its content
        const newLineContent : Content = {
          type: "sentence",
          content: "\n",
          summary: "",
          intent: "",
        };

        if (selectedBlockCopy.length > 0) {
          let currentBlock = selectedBlockCopy.shift();
          while (selectedBlockCopy) {
            if (!currentBlock) break;
            if (currentBlock.type === "sentence" && typeof currentBlock.content === "string") {
              // For sentences, get the content
              sentenceList.push(currentBlock.content);
            } else if (currentBlock.type === "paragraph") {
              // For paragraphs, get all sentence contents
              if (Array.isArray(currentBlock.content)) {
                sentenceList = [
                  ...sentenceList,
                  ...currentBlock.content
                    .filter((s: any) => s && s.type === "sentence")
                    .map((s: any) => s.content),
                ];
              }
              selectedBlockCopy.unshift(newLineContent);
            } else if (Array.isArray(currentBlock.content)) {
              // selectedBlockCopy.unshift(newLineContent);

              const titleContent : Content = {
                type: "sentence",
                content: asteriskDict[currentBlock.type] + currentBlock.title + asteriskDict[currentBlock.type],
                summary: "",
                intent: "",
              };
              selectedBlockCopy.unshift(...currentBlock.content);
              selectedBlockCopy.unshift(newLineContent);
              selectedBlockCopy.unshift(titleContent);
            }

            currentBlock = selectedBlockCopy.shift();
          }
        }
        console.log("sentenceList", sentenceList);
        renderedContent = sentenceList.join(" ");
      } else if (selectedBlock.type === "paragraph") {
        // For paragraphs, get all sentence contents
        if (Array.isArray(selectedBlock.content)) {
          renderedContent = selectedBlock.content
            .filter((item: any) => item && item.type === "sentence")
            .map((item: any) => item.content)
            .join(" ");
        } else if (typeof selectedBlock.content === "string") {
          renderedContent = selectedBlock.content;
        }
      }

      if (!renderedContent.trim()) {
        throw new Error("No content found to generate summary and intent");
      }

      // Send the rendered content to the backend to generate new summaries and intents
      const response = await api.post("/papers/update-rendered-summaries", {
        authorId: userId,
        paperId,
        renderedContent: renderedContent.trim(),
        blockId: selectedBlock["block-id"],
      });

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to update summaries");
      }

      // Invalidate and refetch query to refresh data
      await queryClient.invalidateQueries({
        queryKey: ["papers", userId],
        exact: false,
      });

      toast.success("Summary and intent updated successfully!");
    } catch (error) {
      console.error("Error updating summaries:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update summaries"
      );
    } finally {
      // Reset all update block IDs at start of update
      clearUpdatingBlockIds();
      setIsUpdating(false);
    }
  };

  // Memoized content and messages for rendering
  const renderContent = useMemo(() => {
    if (!content) {
      return (
        <div className="p-5 text-center text-gray-500">
          No paper has been written yet. Please create a new paper.
        </div>
      );
    }

    if (!selectedBlock || !selectedBlockPath) {
      return (
        <div className="p-5 text-center text-gray-500">
          Select a section, subsection, paragraph, or paper to edit
        </div>
      );
    }

    // Check if currently selected block is being updated
    const isSelectedBlockUpdating =
      selectedBlock && selectedBlock["block-id"]
        ? isBlockUpdating(selectedBlock["block-id"] as string)
        : false;

    // Only allow editing for paper, section, subsection, and paragraph types
    if (
      ![
        "paper",
        "section",
        "subsection",
        "subsubsection",
        "paragraph",
      ].includes(selectedBlock.type)
    ) {
      return (
        <div className="p-5 text-center text-gray-500">
          Only paper, sections, subsections, subsubsections, and paragraphs can
          be edited
        </div>
      );
    }

    // Return actual editor UI
    return (
      <div
        className={`p-5 relative ${
          isSelectedBlockUpdating ? "overflow-hidden" : "overflow-auto"
        }`}
      >
        {/* Global overlay for updating state - only covering Editor area */}
        {isSelectedBlockUpdating && (
          <div className="absolute inset-0 bg-white/50 z-50">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
              <ClipLoader size={40} color="#3B82F6" />
              <p className="mt-4 font-medium text-gray-700">
                Updating content...
              </p>
            </div>
          </div>
        )}

        {/* Hierarchy information and update button */}
        <div className="flex flex-col space-y-2 mb-4">
          {/* Show parent hierarchy only when showHierarchy is true */}
          {showHierarchy && parentContents.length > 0 && (
            parentContents.map((content, index) => (
              <HierarchyTitle
                key={index}
                content={content}
                level={index}
                isCurrentSelected={false}
              />
            ))
          )}

          {/* Selected block and update button are always shown */}
          <div className="flex items-center justify-between">
            <div className="flex-grow">
              <HierarchyTitle
                content={selectedBlock}
                level={parentContents.length}
                isCurrentSelected={true}
                renderLines={showHierarchy}
              />
            </div>
            {selectedBlock && selectedBlock["block-id"] && (
              <button
                onClick={handleUpdateSummaries}
                disabled={isUpdating}
                className="ml-2 p-2 text-blue-500 hover:text-blue-600 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Update Summaries and Intents"
              >
                <FiRefreshCw
                  className={`w-5 h-5 ${isUpdating ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ContentRenderer
            content={selectedBlock}
            path={selectedBlockPath}
            isTopLevel={true}
            level={parentContents.length}
          />
        </div>
      </div>
    );
  }, [
    selectedBlock,
    selectedBlockPath,
    showHierarchy,
    parentContents,
    isUpdating,
    isBlockUpdating,
  ]);

  return renderContent;
};

export default Editor;
