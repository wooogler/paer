import React from "react";
import { Message } from "../../api/chatApi";
import { FiCheck, FiShare2 } from 'react-icons/fi';
import MessageBubble from "./MessageBubble";

export type MessageRole = "user" | "assistant" | "system";

interface ChatMessageProps {
  message: Message;
  isSelected: boolean;
  onSelect: (messageId: string) => void;
  selectionMode: boolean;
  linkedPaper?: any;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isSelected, 
  onSelect,
  selectionMode,
}) => {
  const isUser = message.role === "user";

  const SelectionCircle = () => (
    <div 
      className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer
        ${isSelected 
          ? 'border-blue-500 bg-blue-500 text-white scale-110' 
          : message.viewAccess === "public"
            ? 'border-green-500 bg-green-50 hover:bg-green-100'
            : 'border-gray-400 bg-gray-50 hover:bg-gray-100'
        }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(message.id);
      }}
    >
      {isSelected && <FiCheck size={16} className="stroke-[3]" />}
      {!isSelected && message.viewAccess === "public" && <FiShare2 size={14} className="text-green-600" />}
    </div>
  );

  // User message - right-aligned with gray background
  if (isUser) {
    return (
      <div className="flex w-full mb-4 items-start space-x-3 min-w-0">
        {selectionMode && <div className="pt-2"><SelectionCircle /></div>}
        <div className="flex flex-grow justify-end min-w-0">
          <div className="max-w-[85%]">
            <MessageBubble 
              message={message} 
              isSelected={isSelected} 
              showType={!selectionMode}
            />
          </div>
        </div>
      </div>
    );
  }

  // Agent message - full width without background
  return (
    <div className="flex w-full mb-4 items-start space-x-3 min-w-0">
      {selectionMode && <div className="pt-2"><SelectionCircle /></div>}
      <div className="flex-grow min-w-0">
        <MessageBubble 
          message={message} 
          isSelected={isSelected} 
          showType={!selectionMode}
        />
      </div>
    </div>
  );
};

export default ChatMessage;
