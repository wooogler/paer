import React, { useEffect } from "react";
import Structure from "./Structure";
import Editor from "./Editor";
import Pane from "./layout/Pane";
import ToggleSwitch from "./ui/ToggleSwitch";
import Button from "./ui/Button";
import ChatInterface from "./chat/ChatInterface";
import FileImport from "./FileImport";
import { useAppStore } from "../store/useAppStore";
import { useChatStore } from "../store/useChatStore";
import { usePaperStore } from "../store/paperStore";
import { readChatHistory } from "../utils/chatStorage";
import { usePaperQuery } from "../hooks/usePaperQuery";
import { useQueryClient } from "@tanstack/react-query";
import { processPaperContent, savePaper } from "../api/paperApi";
const Layout: React.FC = () => {
  const { displayMode, setDisplayMode, showHierarchy, setShowHierarchy } =
    useAppStore();
  const { addMessage } = useChatStore();
  const { setPaper } = usePaperStore();
  const queryClient = useQueryClient();

  // Fetching data from server using React Query
  const { isLoading, error, refetch } = usePaperQuery();

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
          <div className="flex items-center gap-2">
            <FileImport onFileImport={handleFileImport} />
            <ToggleSwitch
              checked={displayMode === "intent"}
              onChange={(checked) =>
                setDisplayMode(checked ? "intent" : "summary")
              }
              leftLabel="Summary"
              rightLabel="Intent"
            />
          </div>
        }
      >
        <Structure displayMode={displayMode} />
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
        title="AI Chat"
        width="25%"
        isLast
        rightContent={
          <Button
            onChange={(checked) => {
              if (checked) {
                const chatHistory = readChatHistory();
                chatHistory.forEach(({ role, content }) => {
                  addMessage(content, role);
                });
              }
            }}
          />
        }
      >
        <div className="h-full">
          <ChatInterface />
        </div>
      </Pane>
    </div>
  );
};

export default Layout;
