import React, { useMemo } from "react";
import { Message } from "../../api/chatApi";
import { useContentStore } from "../../store/useContentStore";
import ContentInfo from "../ui/ContentInfo";
import { Content } from "@paer/shared";
import { FiCheck, FiMessageSquare, FiMessageCircle, FiShare2 } from 'react-icons/fi';

export type MessageRole = "user" | "assistant" | "system";

interface ChatMessageProps {
  message: Message;
  isSelected: boolean;
  onSelect: (messageId: string) => void;
  selectionMode: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  isSelected, 
  onSelect,
  selectionMode 
}) => {
  const isUser = message.role === "user";
  const { content } = useContentStore();
  const isComment = message.messageType === "comment";

  // 메시지에 연결된 blockId가 있는지 확인
  const hasBlockReference = !!message.blockId;

  // blockId로 콘텐츠 찾기
  const linkedContent = useMemo((): Content | null => {
    if (!message.blockId || !content) return null;

    // 헬퍼 함수로 콘텐츠 트리를 재귀적으로 탐색
    const findContentByBlockId = (node: any): Content | null => {
      if (node && node["block-id"] === message.blockId) {
        return node;
      }

      if (node && node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          const result = findContentByBlockId(child);
          if (result) return result;
        }
      }

      return null;
    };

    return findContentByBlockId(content);
  }, [message.blockId, content]);

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

  const MessageContent = () => (
    <>
      {hasBlockReference && linkedContent && (
        <div className="mb-1">
          <ContentInfo
            content={linkedContent}
            lightText={false}
            isClickable={true}
          />
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
          <span>{message.userName || (isUser ? "You" : "Assistant")}</span>
          <div className="flex items-center gap-2">
            {isComment ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                <FiMessageSquare size={12} />
                <span className="text-xs">Comment</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                <FiMessageCircle size={12} />
                <span className="text-xs">Chat</span>
              </div>
            )}
            {!selectionMode && message.viewAccess === "public" && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                <FiShare2 size={12} />
                <span className="text-xs">Shared</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div className="text-xs mt-1 opacity-70 text-right">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
        </div>
      </div>
    </>
  );

  // 사용자 메시지 - 회색 배경으로 오른쪽 정렬
  if (isUser) {
    return (
      <div className="flex w-full mb-4 items-start space-x-3 min-w-0">
        {selectionMode && <div className="pt-2"><SelectionCircle /></div>}
        <div className="flex flex-grow justify-end min-w-0">
          <div className={`max-w-[85%] p-3 rounded-lg transition-all
            ${isComment 
              ? 'bg-yellow-50 text-yellow-900' 
              : 'bg-gray-100 text-gray-800'}
            ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
            ${!selectionMode && message.viewAccess === "public" ? 'ring-1 ring-green-500 ring-opacity-30' : ''}`}>
            <MessageContent />
          </div>
        </div>
      </div>
    );
  }

  // 에이전트 메시지 - 배경 없이 전체 폭을 채움
  return (
    <div className="flex w-full mb-4 items-start space-x-3 min-w-0">
      {selectionMode && <div className="pt-2"><SelectionCircle /></div>}
      <div className="flex-grow min-w-0">
        <div className={`max-w-[85%] p-3 rounded-lg transition-all
          ${isComment 
            ? 'bg-yellow-50 text-yellow-900' 
            : 'bg-white text-gray-800'}
          ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${!selectionMode && message.viewAccess === "public" ? 'ring-1 ring-green-500 ring-opacity-30' : ''}`}>
          <MessageContent />
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
