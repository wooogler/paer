import React, { useMemo } from "react";
import { ChatMessage as ChatMessageType } from "../../types/chat";
import { useContentStore } from "../../store/useContentStore";
import ContentInfo from "../ui/ContentInfo";
import { Content } from "@paer/shared";

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  const { content } = useContentStore();

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

  // 사용자 메시지 - 회색 배경으로 오른쪽 정렬
  if (isUser) {
    return (
      <div className="flex w-full mb-4 justify-end">
        <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800">
          {linkedContent && (
            <div className="mb-1">
              <ContentInfo
                content={linkedContent}
                variant="block"
                showBg={true}
                lightText={false}
              />
            </div>
          )}

          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
          <div className="text-xs mt-1 opacity-70 text-right">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  }

  // 에이전트 메시지 - 배경 없이 전체 폭을 채움
  return (
    <div className="w-full mb-4 px-4">
      {linkedContent && (
        <div className="mb-1">
          <ContentInfo
            content={linkedContent}
            variant="block"
            showBg={true}
            lightText={false}
          />
        </div>
      )}

      <p className="text-sm whitespace-pre-wrap break-words text-gray-800">
        {message.content}
      </p>
      <div className="text-xs mt-1 opacity-70 text-right">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ChatMessage;
