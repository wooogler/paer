import React from "react";
import { ChatMessage as ChatMessageType } from "../../types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          isUser
            ? "bg-blue-500 text-white rounded-tr-none"
            : "bg-gray-200 text-gray-800 rounded-tl-none"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div className="text-xs mt-1 opacity-70 text-right">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
