import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatStore } from "../../store/useChatStore";
import { useContentStore } from "../../store/useContentStore";
import ChatMessage from "./ChatMessage";
import ContentInfo from "../ui/ContentInfo";
import { v4 as uuidv4 } from "uuid";

const ChatInterface: React.FC = () => {
  const {
    messages,
    addMessage,
    isLoading,
    setMessages,
    filterBlockId,
    isFilteringEnabled,
  } = useChatStore();
  const { selectedContent, content: rootContent } = useContentStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageRef = useRef(false);
  const isComposing = useRef(false);

  // Display welcome message on first load (only once)
  useEffect(() => {
    if (messages.length === 0 && !initialMessageRef.current) {
      initialMessageRef.current = true;
      // 환영 메시지를 blockId 없이 직접 생성
      const welcomeMessage = {
        id: uuidv4(),
        role: "system" as const,
        content:
          "Hello! Do you need help with writing your document? How can I assist you?",
        timestamp: Date.now(),
        // blockId 없음
      };

      // setMessages 함수를 통해 직접 추가
      setMessages([welcomeMessage]);
    }
  }, [messages.length, setMessages]);

  // 필터링된 메시지 목록 계산
  const filteredMessages = useMemo(() => {
    if (!isFilteringEnabled || !filterBlockId) return messages;

    // 필터링된 blockId에 해당하는 메시지만 가져오기
    // 재귀적으로 하위 콘텐츠 blockId도 포함
    const blockIds = new Set<string | undefined>([filterBlockId]);

    // 재귀 함수로 하위 콘텐츠의 blockId 수집
    const collectChildBlockIds = (content: any) => {
      if (!content) return;

      // 현재 콘텐츠의 blockId 추가
      if (content["block-id"]) {
        blockIds.add(content["block-id"]);
      }

      // 하위 콘텐츠가 배열인 경우 재귀적으로 처리
      if (content.content && Array.isArray(content.content)) {
        content.content.forEach((child: any) => {
          collectChildBlockIds(child);
        });
      }
    };

    // 필터링된 blockId의 콘텐츠 찾기
    const findContentByBlockId = (content: any, blockId: string): any => {
      if (!content) return null;

      // 현재 콘텐츠가 찾는 blockId인지 확인
      if (content["block-id"] === blockId) {
        return content;
      }

      // 하위 콘텐츠 검색
      if (content.content && Array.isArray(content.content)) {
        for (const child of content.content) {
          const found = findContentByBlockId(child, blockId);
          if (found) return found;
        }
      }

      return null;
    };

    // 루트 콘텐츠에서 필터 blockId 콘텐츠 찾기
    const filteredContent = findContentByBlockId(rootContent, filterBlockId);

    // 찾은 콘텐츠의 하위 blockId 모두 수집
    collectChildBlockIds(filteredContent);

    return messages.filter((msg) => !msg.blockId || blockIds.has(msg.blockId));
  }, [messages, filterBlockId, rootContent, isFilteringEnabled]);

  // Scroll to bottom when messages are added
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages, scrollToBottom]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (input.trim()) {
        await addMessage(input, "user");
        setInput("");

        // Keep focus on input field
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    },
    [input, addMessage]
  );

  // Submit with Enter, line break with Shift+Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing.current) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
  }, []);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setInput(target.value);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Message display area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {filteredMessages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 text-gray-800 rounded-lg rounded-tl-none p-3">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-4 bg-white"
      >
        {/* 선택된 콘텐츠 정보 표시 - textarea 위에 배치 */}
        <ContentInfo content={selectedContent} />

        <textarea
          ref={inputRef}
          value={input}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send, Shift+Enter for line break)"
          rows={3}
          disabled={isLoading}
          className="w-full mt-2 resize-none border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </form>
    </div>
  );
};

export default ChatInterface;
