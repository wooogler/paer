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
import { FiUsers } from "react-icons/fi";
import CollaboratorModal from "./CollaboratorModal";

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
  const { selectedContent, content: rootContent, selectedPaperId } = useContentStore();
  const { userId } = useAppStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageRef = useRef(false);
  const isComposing = useRef(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollaboratorModalOpen, setIsCollaboratorModalOpen] = useState(false);

  // Load messages when component mounts or selectedPaperId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!userId) {
        setError("Please enter a User ID to use the chat feature");
        setIsLoadingMessages(false);
        return;
      }

      // Don't load messages if there's no paper
      if (!rootContent || !selectedPaperId) {
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
  }, [fetchMessages, userId, rootContent, selectedPaperId]);

  // Display welcome message only after loading messages from server
  useEffect(() => {
    if (
      !isLoadingMessages &&
      messages.length === 0 &&
      !initialMessageRef.current &&
      rootContent // Only show welcome message when there is a paper
    ) {
      initialMessageRef.current = true;
      // Create welcome message without blockId
      const welcomeMessage = {
        id: uuidv4(),
        role: "system" as const,
        content:
          "Hello! Do you need help with writing your document? How can I assist you?",
        timestamp: Date.now(),
        userId: userId || "",
        paperId: "",
        userName: "System"
      };

      // Add directly through setMessages function
      setMessages([welcomeMessage]);
    }
  }, [isLoadingMessages, messages.length, setMessages, rootContent, userId]);

  // Calculate filtered messages list
  const filteredMessages = useMemo(() => {
    if (!isFilteringEnabled || !filterBlockId) return messages;

    // Get only messages matching the filtered blockId
    // Include child content blockIds recursively
    const blockIds = new Set<string | undefined>([filterBlockId]);

    // Recursive function to collect child content blockIds
    const collectChildBlockIds = (content: any) => {
      if (!content) return;

      // Add current content's blockId
      if (content["block-id"]) {
        blockIds.add(content["block-id"]);
      }

      // Process child content recursively if it's an array
      if (content.content && Array.isArray(content.content)) {
        content.content.forEach((child: any) => {
          collectChildBlockIds(child);
        });
      }
    };

    // Find content by blockId
    const findContentByBlockId = (content: any, blockId: string): any => {
      if (!content) return null;

      // Check if current content matches the blockId
      if (content["block-id"] === blockId) {
        return content;
      }

      // Search child content
      if (content.content && Array.isArray(content.content)) {
        for (const child of content.content) {
          const found = findContentByBlockId(child, blockId);
          if (found) return found;
        }
      }

      return null;
    };

    // Find filtered blockId content in root content
    const filteredContent = findContentByBlockId(rootContent, filterBlockId);

    // Collect all child blockIds of found content
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
        const message = {
          id: uuidv4(),
          role: "user" as const,
          content: input,
          timestamp: Date.now(),
          userId: userId || "",
          paperId: rootContent?._id || "",
          userName: "User",
          blockId: selectedContent?.["block-id"]
        };
        await addMessage(message);
        setInput("");

        // Keep focus on input field
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    },
    [input, addMessage, userId, rootContent, selectedContent]
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
            <p>No paper available. Please input a paper first.</p>
            <p className="mt-2">Use the import button to upload a paper or create a new one.</p>
          </div>
        ) : (
          <>
            {filteredMessages.map((message, index) => (
              <ChatMessage key={`${message.id}-${index}`} message={message} />
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
            disabled={isLoading || !rootContent}
            placeholder={rootContent ? "Type a message... (Press Enter to send, Shift+Enter for line break)" : "Please input a paper first..."}
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px] max-h-[160px] overflow-y-auto disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !rootContent}
            className="ml-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>

      <CollaboratorModal
        isOpen={isCollaboratorModalOpen}
        onClose={() => setIsCollaboratorModalOpen(false)}
      />
    </div>
  );
};

export default ChatInterface;
