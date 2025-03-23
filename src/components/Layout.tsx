import React from "react";
import Structure from "./Structure";
import Editor from "./Editor";
import Pane from "./layout/Pane";
import ToggleSwitch from "./ui/ToggleSwitch";
import ChatInterface from "./chat/ChatInterface";
import { useAppStore } from "../store/useAppStore";

const Layout: React.FC = () => {
  const { displayMode, setDisplayMode } = useAppStore();

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

      <Pane title="Editor" width="45%">
        <Editor />
      </Pane>

      <Pane title="AI Chat" width="25%" isLast>
        <div className="h-full">
          <ChatInterface />
        </div>
      </Pane>
    </div>
  );
};

export default Layout;
