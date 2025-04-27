import React, { useEffect, useMemo, useState } from "react";
import Structure from "./Structure";
import Editor from "./Editor";
import Pane from "./layout/Pane";
import ToggleSwitch from "./ui/ToggleSwitch";
import ChatInterface from "./chat/ChatInterface";
import FileImport from "./FileImport";
import { useAppStore } from "../store/useAppStore";
import { useChatStore } from "../store/useChatStore";
import { useContentStore } from "../store/useContentStore";
import { usePaperQuery } from "../hooks/usePaperQuery";
import { useQueryClient } from "@tanstack/react-query";
import { importPaper, getPaperById } from "../api/paperApi";
import { FiDownload, FiTrash2, FiLogOut, FiList, FiUsers } from "react-icons/fi";
import ContentInfo from "./ui/ContentInfo";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import PaperListModal from "./paperList/PaperListModal";
import CollaboratorModal from "./chat/CollaboratorModal";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { 
    displayMode, 
    showHierarchy, 
    setShowHierarchy, 
    userName, 
    userId, 
    logout,
    isStructureVisible,
    toggleStructureVisibility 
  } = useAppStore();
  const {
    filterBlockId,
    isFilteringEnabled,
    toggleFiltering,
    isChatVisible,
    toggleChatVisibility,
  } = useChatStore();
  const { content: rootContent, setContent } = useContentStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isPaperListOpen, setIsPaperListOpen] = useState(false);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);

  // Fetching data from server using React Query
  const { data: paperData, refetch } = usePaperQuery();

  // Get filtered content information
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

  // Handle filtering toggle
  const handleToggleFiltering = () => {
    toggleFiltering(!isFilteringEnabled);
  };

  // Refresh data on page load
  useEffect(() => {
    if (userId) {
      refetch();
    }
  }, [userId, refetch]);

  const handleFileImport = async (content: string) => {
    try {
      const { userId } = useAppStore.getState();
      if (!userId) {
        throw new Error("User ID is required");
      }

      // 파일 가져오기 시작 시 로딩 상태 설정
      const { setLoading } = useContentStore.getState();
      setLoading(true);

      // FileImport 컴포넌트 내부에서도 로딩 상태를 관리합니다
      const response = await importPaper(content, userId);
      if (response.message === 'Paper created successfully') {
        // 새로 생성된 논문을 가져옵니다
        const newPaper = await getPaperById(response.paperId, userId);
        setContent(newPaper);
        // 데이터 캐시 무효화하여 UI 업데이트
        await queryClient.invalidateQueries({
          queryKey: ["papers", userId],
          refetchType: "active", // 즉시 refetch 수행
        });
        toast.success("Paper imported successfully.");
      } else {
        throw new Error("Failed to import paper.");
      }
    } catch (error) {
      console.error("Error importing paper:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import paper.");
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
                  userId: userId || "",
                  paperId: "",
                  userName: "System"
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

  const handleLogout = () => {
    logout();
    localStorage.removeItem("user-storage");
    localStorage.removeItem("content-storage");
    navigate("/login");
    toast.success("Logged out successfully.");
  };

  return (
    <div className="flex h-screen w-screen bg-white text-gray-800">
      {/* Structure Pane */}
      {isStructureVisible && (
        <Pane
          title="Structure"
          width="20%"
          rightContent={
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPaperListOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-800"
                title="논문 목록"
              >
                <FiList />
              </button>
              <FileImport onFileImport={handleFileImport} />
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 hover:text-gray-800"
                title="Export Paper"
              >
                <FiDownload />
              </button>
            </div>
          }
        >
          <Structure displayMode="intent" />
        </Pane>
      )}

      {/* 논문 목록 모달 */}
      <PaperListModal isOpen={isPaperListOpen} onClose={() => setIsPaperListOpen(false)} />

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
              leftLabel="Sentence"
              rightLabel="Hierarchy"
            />
            {isFilteringEnabled && (
              <div className="text-sm text-gray-500">
                Filtering: {filteredContent?.title || "No content"}
              </div>
            )}
          </div>
        }
      >
        <Editor userName={userName} />
      </Pane>

      {/* Chat Pane */}
      {isChatVisible && (
        <Pane
          title="Chat"
          width="25%"
          isLast
          rightContent={
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{userName}</span>
                {rootContent && (() => {
                  console.log('Current paper:', {
                    authorId: rootContent.authorId,
                    collaboratorIds: rootContent.collaboratorIds,
                    currentUserId: userId
                  });
                  return (
                    <span className={`text-xs px-2 py-1 rounded-full 
                      ${rootContent.authorId === userId ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {rootContent.authorId === userId ? 'Author' : 'Collaborator'}
                    </span>
                  );
                })()}
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors"
                  title="로그아웃"
                >
                  <FiLogOut />
                </button>
              </div>
              <button
                onClick={() => setIsCollaboratorModalOpen(true)}
                className="p-1.5 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors"
                title="View collaborators"
              >
                <FiUsers />
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all chat messages?")) {
                    useChatStore.getState().clearMessages();
                  }
                }}
                className="p-1.5 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors"
                title="Clear chat messages"
              >
                <FiTrash2 />
              </button>
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

      <CollaboratorModal
        isOpen={isCollaboratorModalOpen}
        onClose={() => setIsCollaboratorModalOpen(false)}
      />
    </div>
  );
};

export default Layout;
