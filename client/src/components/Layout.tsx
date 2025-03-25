import React from "react";
import Structure from "./Structure";
import Editor from "./Editor";
import Pane from "./layout/Pane";
import ToggleSwitch from "./ui/ToggleSwitch";
import Button from "./ui/Button";
import ChatInterface from "./chat/ChatInterface";
import { useAppStore } from "../store/useAppStore";
import { useChatStore } from "../store/useChatStore";
import { readChatHistory } from "../utils/chatStorage";
import { usePaperQuery } from "../hooks/usePaperQuery";

const Layout: React.FC = () => {
  const { displayMode, setDisplayMode, showHierarchy, setShowHierarchy } =
    useAppStore();
  const { addMessage } = useChatStore();

  // Fetching data from server using React Query
  const { isLoading, error } = usePaperQuery();

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
          <ToggleSwitch
            checked={displayMode === "intent"}
            onChange={(checked) =>
              setDisplayMode(checked ? "intent" : "summary")
            }
            leftLabel="Summary"
            rightLabel="Intent"
          />
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
