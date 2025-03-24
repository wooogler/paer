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

const Layout: React.FC = () => {
  const { displayMode, setDisplayMode, showHierarchy, setShowHierarchy } =
    useAppStore();
  const { addMessage } = useChatStore();

  return (
    <div className="flex h-screen w-screen bg-white text-gray-800">
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
