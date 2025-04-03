import React, { useEffect, useMemo } from "react";
import Structure from "./Structure";
import Editor from "./Editor";
import Pane from "./layout/Pane";
import ToggleSwitch from "./ui/ToggleSwitch";
import ChatInterface from "./chat/ChatInterface";
import FileImport from "./FileImport";
import { useAppStore } from "../store/useAppStore";
import { useChatStore } from "../store/useChatStore";
import { useStructureStore } from "../store/useStructureStore";
import { usePaperStore } from "../store/paperStore";
import { useContentStore } from "../store/useContentStore";
import { usePaperQuery } from "../hooks/usePaperQuery";
import { useQueryClient } from "@tanstack/react-query";
import { processPaperContent, savePaper } from "../api/paperApi";
import { FiDownload, FiTrash2 } from "react-icons/fi";
import ContentInfo from "./ui/ContentInfo";

const Layout: React.FC = () => {
  const { displayMode, showHierarchy, setShowHierarchy } = useAppStore();
  const { isStructureVisible, toggleStructureVisibility } = useStructureStore();
  const {
    filterBlockId,
    isFilteringEnabled,
    toggleFiltering,
    isChatVisible,
    toggleChatVisibility,
  } = useChatStore();
  const { setPaper } = usePaperStore();
  const { content: rootContent } = useContentStore();
  const queryClient = useQueryClient();

  // Fetching data from server using React Query
  const { error, refetch } = usePaperQuery();

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
      // 파일 가져오기 시작 시 로딩 상태 설정
      const { setLoading } = useContentStore.getState();
      setLoading(true);

      // FileImport 컴포넌트 내부에서도 로딩 상태를 관리합니다
      const processedPaper = await processPaperContent(content);
      setPaper(processedPaper);
      await savePaper(processedPaper);

      // 데이터 캐시 무효화하여 UI 업데이트
      await queryClient.invalidateQueries({
        queryKey: ["paper"],
        refetchType: "active", // 즉시 refetch 수행
      });

      // 잠시 대기하여 데이터 로딩이 완료될 때까지 로딩 상태 유지
      await new Promise((resolve) => setTimeout(resolve, 500));

      // You might want to show a success message here
    } catch (error) {
      console.error("Error processing paper:", error);
      // You might want to show an error message here
    } finally {
      // 로딩 상태 해제
      const { setLoading } = useContentStore.getState();
      setLoading(false);
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

  // Paper and chat initialization function
  const handleInitialize = async () => {
    if (
      window.confirm(
        "Are you sure you want to initialize paper and chat history?"
      )
    ) {
      try {
        const { setLoading } = useContentStore.getState();
        setLoading(true);

        // Request to initialize data on server
        const response = await fetch("/api/paper/initialize", {
          method: "POST",
        });
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to initialize data");
        }

        // Reset content store
        const contentStore = useContentStore.getState();
        if (contentStore) {
          // Reset selected content/block
          if (typeof contentStore.setSelectedBlock === "function") {
            contentStore.setSelectedBlock(null, null);
          }

          // Reset content data
          if (typeof contentStore.setContent === "function") {
            contentStore.setContent({
              title: "New Paper",
              summary: "",
              intent: "",
              type: "paper",
              content: [],
              "block-id": Date.now().toString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            });
          }
        }

        // Reset chat store
        try {
          const chatStore = useChatStore.getState();
          if (chatStore && typeof chatStore.clearMessages === "function") {
            await chatStore.clearMessages();

            // Manually add initial welcome message
            if (typeof chatStore.setMessages === "function") {
              chatStore.setMessages([
                {
                  id: "system-welcome-" + Date.now(),
                  role: "system",
                  content:
                    "Hello! Do you need help with writing your document? How can I assist you?",
                  timestamp: Date.now(),
                },
              ]);
            }
          }
        } catch (e) {
          console.log("Chat store reset failed", e);
        }

        // Invalidate queries to refresh data without page reload
        queryClient.invalidateQueries({ queryKey: ["paper"] });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      } catch (error) {
        console.error("Error initializing data:", error);
        alert(
          `Error during initialization: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        const { setLoading } = useContentStore.getState();
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white text-gray-800">
      {/* 전체 화면 로딩 인디케이터는 제거하고 각 컴포넌트에서 처리 */}
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

      {/* Structure Pane */}
      {isStructureVisible && (
        <Pane
          title="Structure"
          width="20%"
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
              <div className="relative group">
                <button
                  onClick={handleInitialize}
                  className="p-2 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  title="Initialize Data (Clear Everything)"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  Initialize Data
                </div>
              </div>
            </div>
          }
        >
          <React.Fragment>
            <Structure displayMode={displayMode} />
          </React.Fragment>
        </Pane>
      )}

      {/* Editor Pane */}
      <Pane
        title="Editor"
        width={
          !isStructureVisible && !isChatVisible
            ? "100%"
            : !isStructureVisible || !isChatVisible
            ? "80%"
            : "55%"
        }
        rightContent={
          <div className="flex items-center space-x-2">
            <ToggleSwitch
              checked={showHierarchy}
              onChange={setShowHierarchy}
              leftLabel="Sentence Only"
              rightLabel="Show Hierarchy"
            />
            <button
              onClick={toggleChatVisibility}
              className={`ml-2 p-1.5 rounded ${
                isChatVisible
                  ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
              } transition-colors`}
              title={isChatVisible ? "Hide AI Chat" : "Show AI Chat"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button
              onClick={toggleStructureVisibility}
              className={`ml-2 p-1.5 rounded ${
                isStructureVisible
                  ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
              } transition-colors`}
              title={isStructureVisible ? "Hide Structure" : "Show Structure"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </button>
          </div>
        }
      >
        <Editor />
      </Pane>

      {isChatVisible && (
        <Pane
          title={
            isFilteringEnabled && filterBlockId
              ? "Filtered Messages"
              : "AI Chat"
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
      )}
    </div>
  );
};

export default Layout;
