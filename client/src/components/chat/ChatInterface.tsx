import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatStore } from "../../store/useChatStore";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";
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
    fetchMessages,
  } = useChatStore();
  const { selectedContent, content: rootContent } = useContentStore();
  const { userId } = useAppStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageRef = useRef(false);
  const isComposing = useRef(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 메시지 로드하기
  useEffect(() => {
    const loadMessages = async () => {
      if (!userId) {
        setError("Please enter a User ID to use the chat feature");
        setIsLoadingMessages(false);
        return;
      }

      // 논문이 없으면 메시지를 불러오지 않음
      if (!rootContent) {
        setIsLoadingMessages(false);
        return;
      }

      setError(null);
      try {
        await fetchMessages();
      } catch (err) {
        setError("Failed to load messages. Please try again.");
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [fetchMessages, userId, rootContent]);

  // Display welcome message only after loading messages from server
  useEffect(() => {
    if (
      !isLoadingMessages &&
      messages.length === 0 &&
      !initialMessageRef.current &&
      rootContent // 논문이 있을 때만 환영 메시지 표시
    ) {
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
  }, [isLoadingMessages, messages.length, setMessages, rootContent]);

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
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 text-sm">
          {error}
        </div>
      )}

      {/* Message display area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {!userId ? (
          <div className="text-center text-gray-500 mt-4">
            Please enter a User ID to use the chat feature
          </div>
        ) : !rootContent ? (
          <div className="text-center text-gray-500 mt-4">
            <p>논문이 없습니다. 먼저 논문을 입력해주세요.</p>
            <p className="mt-2">파일 가져오기 버튼을 사용하여 논문을 업로드하거나 새 논문을 작성해보세요.</p>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {/* 선택된 콘텐츠 정보 표시 - textarea 위에 배치 */}
        {rootContent && <ContentInfo content={selectedContent} />}
        
        <form onSubmit={handleSubmit} className="flex items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={isLoading || !rootContent} // 로딩 중이거나 논문이 없을 때 비활성화
            placeholder={rootContent ? "Type a message... (Press Enter to send, Shift+Enter for line break)" : "논문을 먼저 입력해주세요..."}
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px] max-h-[160px] overflow-y-auto disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !rootContent} // 입력이 없거나 로딩 중이거나 논문이 없을 때 비활성화
            className="ml-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
