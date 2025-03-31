import React, { useEffect, useMemo } from "react";
import Structure from "./Structure";
import Editor from "./Editor";
import Pane from "./layout/Pane";
import ToggleSwitch from "./ui/ToggleSwitch";
import ChatInterface from "./chat/ChatInterface";
import FileImport from "./FileImport";
import { useAppStore } from "../store/useAppStore";
import { useChatStore } from "../store/useChatStore";
import { usePaperStore } from "../store/paperStore";
import { useContentStore } from "../store/useContentStore";
import { usePaperQuery } from "../hooks/usePaperQuery";
import { useQueryClient } from "@tanstack/react-query";
import { processPaperContent, savePaper } from "../api/paperApi";
import { FiDownload } from "react-icons/fi";
import ContentInfo from "./ui/ContentInfo";

const Layout: React.FC = () => {
  const { displayMode, setDisplayMode, showHierarchy, setShowHierarchy } =
    useAppStore();
  const {
    addMessage,
    filterBlockId,
    isFilteringEnabled,
    toggleFiltering,
    setMessages,
    fetchMessages,
  } = useChatStore();
  const { setPaper } = usePaperStore();
  const { content: rootContent } = useContentStore();
  const queryClient = useQueryClient();

  // Fetching data from server using React Query
  const { isLoading, error, refetch } = usePaperQuery();

  // 필터링된 콘텐츠 정보 가져오기
  const filteredContent = useMemo(() => {
    if (!filterBlockId || !rootContent) return null;

    const findContentByBlockId = (content: any, blockId: string): any => {
      if (!content) return null;

      if (content["block-id"] === blockId) {
        return content;
      }

      if (content.content && Array.isArray(content.content)) {
        for (const child of content.content) {
          const found = findContentByBlockId(child, blockId);
          if (found) return found;
        }
      }

      return null;
    };

    return findContentByBlockId(rootContent, filterBlockId);
  }, [filterBlockId, rootContent]);

  // 필터링 토글 처리
  const handleToggleFiltering = () => {
    toggleFiltering(!isFilteringEnabled);
  };

  // 페이지 로드 시 데이터 새로고침
  useEffect(() => {
    // 페이지 로드 시 무조건 새로고침
    refetch();

    // 페이지 새로고침 시 데이터 리로드
    const handleBeforeUnload = () => {
      // 브라우저 새로고침 전에 캐시 무효화
      queryClient.removeQueries({ queryKey: ["paper"] });
    };

    // 브라우저 새로고침 이벤트 리스너 등록
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [refetch, queryClient]);

  const handleFileImport = async (content: string) => {
    try {
      const processedPaper = await processPaperContent(content);
      setPaper(processedPaper);
      await savePaper(processedPaper);
      // 데이터 캐시 무효화하여 UI 업데이트
      queryClient.invalidateQueries({ queryKey: ["paper"] });
      // You might want to show a success message here
    } catch (error) {
      console.error("Error processing paper:", error);
      // You might want to show an error message here
    }
  };

  // Handle paper export
  const handleExport = async () => {
    try {
      const response = await fetch("/api/paper/export");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to export paper");
      }

      // Create a blob from the LaTeX content
      const blob = new Blob([data.content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "paper.tex";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting paper:", error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white text-gray-800">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center">
            <p className="text-lg font-medium">Loading data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg text-center">
            <p className="text-lg font-medium text-red-600">
              Data loading failed
            </p>
            <p className="text-sm text-gray-600">{(error as Error).message}</p>
          </div>
        </div>
      )}

      <Pane
        title="Structure"
        width="30%"
        rightContent={
          <div className="flex items-center space-x-2">
            <FileImport onFileImport={handleFileImport} />
            <button
              onClick={handleExport}
              className="p-2 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Export Paper"
            >
              <FiDownload className="w-5 h-5" />
            </button>
          </div>
        }
      >
        <React.Fragment>
          <Structure displayMode={displayMode} />
        </React.Fragment>
      </Pane>

      <Pane
        title="Editor"
        width="45%"
        rightContent={
          <ToggleSwitch
            checked={showHierarchy}
            onChange={setShowHierarchy}
            leftLabel="Sentence Only"
            rightLabel="Show Hierarchy"
          />
        }
      >
        <Editor />
      </Pane>

      <Pane
        title={
          isFilteringEnabled && filterBlockId ? "Filtered Messages" : "AI Chat"
        }
        width="25%"
        isLast
        rightContent={
          <div className="flex items-center space-x-2">
            {isFilteringEnabled && filterBlockId && (
              <button
                onClick={() => toggleFiltering(false)}
                className="mr-2 p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors flex items-center"
                title="Back to all messages"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <button
              onClick={handleToggleFiltering}
              className={`p-1.5 rounded-md ${
                isFilteringEnabled && filterBlockId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              } transition-colors`}
              title={
                isFilteringEnabled && filterBlockId
                  ? "Show all messages"
                  : "Filter messages"
              }
              disabled={!filterBlockId}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
          </div>
        }
      >
        <div className="h-full flex flex-col">
          {/* 필터링된 콘텐츠 정보 표시 */}
          {isFilteringEnabled && filterBlockId && filteredContent && (
            <div className="border-b border-gray-200">
              <ContentInfo content={filteredContent} isClickable={true} />
            </div>
          )}
          <div className="flex-1">
            <ChatInterface />
          </div>
        </div>
      </Pane>
    </div>
  );
};

export default Layout;
