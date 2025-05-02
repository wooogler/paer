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
import { FiUsers, FiShare2, FiCheck, FiX, FiChevronDown } from "react-icons/fi";
import { getCollaborators, getMembers } from "../../api/paperApi";
import { getAllUsers } from "../../api/userApi";
import { toast } from "react-hot-toast";
import { updateMessageAccess } from "../../api/chatApi";

interface ViewingMode {
  userId: string;
  userName: string;
}

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
  const { userId, userName } = useAppStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageRef = useRef(false);
  const isComposing = useRef(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [collaborators, setCollaborators] = useState<ViewingMode[]>([]);
  const [currentView, setCurrentView] = useState<ViewingMode>({ userId, userName });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load collaborators
  useEffect(() => {
    const loadCollaborators = async () => {
      if (!selectedPaperId || !userId) return;
      
      try {
        const collaboratorsData = await getCollaborators(selectedPaperId, userId);
        const userResponse = await getAllUsers();
        
        // Filter out the current user and map collaborators to include usernames
        const collaboratorsWithUsernames = collaboratorsData
          .filter((collaboratorId: string) => collaboratorId !== userId)
          .map((collaboratorId: string) => {
            const user = userResponse.users.find((u: any) => u._id === collaboratorId);
            return {
              userId: collaboratorId,
              userName: user ? user.username : 'Unknown User'
            };
          });
        
        setCollaborators(collaboratorsWithUsernames);
      } catch (err) {
        console.error("Failed to load collaborators:", err);
      }
    };

    loadCollaborators();
  }, [selectedPaperId, userId]);

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
        userName: "System",
        messageType: "chat" as const,
        viewAccess: "private",
      };

      // Add directly through setMessages function
      setMessages([welcomeMessage]);
    }
  }, [isLoadingMessages, messages.length, setMessages, rootContent, userId]);

  const handleSelectAll = useCallback(() => {
    if (selectedMessageIds.length === messages.filter(msg => msg.userId === userId).length) {
      setSelectedMessageIds([]);
    } else {
      // 자신의 메시지만 선택
      const myMessages = messages.filter(msg => msg.userId === userId);
      setSelectedMessageIds(myMessages.map(msg => msg.id));
    }
  }, [messages, selectedMessageIds.length, userId]);

  const isViewingOwnChat = currentView.userId === userId;

  // Calculate filtered messages list
  const filteredMessages = useMemo(() => {
    // First filter by blockId if filtering is enabled
    let filtered = messages;
    if (isFilteringEnabled && filterBlockId) {
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

      filtered = messages.filter((msg) => !msg.blockId || blockIds.has(msg.blockId));
    }

    // Then filter by viewing mode
    if (!isViewingOwnChat) {
      // When viewing collaborator's messages, only show messages shared by that specific collaborator
      filtered = filtered.filter(msg => 
        msg.userId === currentView.userId && msg.viewAccess === "public"
      );
    }

    return filtered;
  }, [messages, filterBlockId, rootContent, isFilteringEnabled, isViewingOwnChat, currentView.userId]);

  // Scroll to bottom when messages are added
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages, scrollToBottom]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Get the button that was clicked
      const submitter = (e as any).nativeEvent.submitter;
      const action = submitter?.value;

      const messageType = action === "sendAsComment" ? "comment" as const : "chat" as const;

      if (input.trim()) {
        const message = {
          id: uuidv4(),
          role: "user" as const,
          content: input,
          timestamp: Date.now(),
          userId: userId || "",
          paperId: rootContent?._id || "",
          userName: userName || "You",
          blockId: selectedContent?.["block-id"],
          messageType,
          viewAccess: "private"
        };
        await addMessage(message);
        setInput("");

        // Keep focus on input field
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    },
    [input, addMessage, userId, userName, rootContent, selectedContent]
  );

  // Submit with Enter, line break with Shift+Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing.current) {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true });
          form.dispatchEvent(submitEvent);
        }
      }
    },
    []
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

  const handleMessageSelect = useCallback((messageId: string) => {
    // 자신의 메시지만 선택 가능하도록 수정
    const message = messages.find(msg => msg.id === messageId);
    if (!message || message.userId !== userId) return;

    setSelectedMessageIds(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  }, [messages, userId]);

  const selectedMessages = useMemo(() => {
    return messages.filter(msg => selectedMessageIds.includes(msg.id));
  }, [messages, selectedMessageIds]);

  const handleShare = useCallback(async () => {
    if (!selectedPaperId || !userId) {
      toast.error("Cannot update permissions: No paper selected");
      return;
    }

    try {
      setIsSharing(true);
      const collaborators = await getCollaborators(selectedPaperId, userId);
      
      if (collaborators.length === 0) {
        toast.error("No collaborators found to share with");
        return;
      }

      // 자신의 메시지만 필터링
      const myMessages = messages.filter(msg => msg.userId === userId);
      
      // 현재 공개된 메시지 중 선택되지 않은 메시지들을 private로 변경
      const messagesToUnshare = myMessages
        .filter(msg => msg.viewAccess === "public" && !selectedMessageIds.includes(msg.id))
        .map(msg => msg.id);

      // 선택된 메시지들을 public으로 변경
      const messagesToShare = selectedMessageIds.filter(id => {
        const message = myMessages.find(msg => msg.id === id);
        return message && message.userId === userId;
      });

      // Update message access using the backend API
      await updateMessageAccess(selectedPaperId, userId, {
        private: messagesToUnshare,
        public: messagesToShare
      });
      
      // Refresh messages to get updated access permissions
      await fetchMessages();
      
      toast.success('Message permissions updated');
      
      // Close selection mode after updating permissions
      setIsSelectionMode(false);
      setSelectedMessageIds([]);
    } catch (error) {
      console.error("Error updating message permissions:", error);
      toast.error("Failed to update message permissions");
    } finally {
      setIsSharing(false);
    }
  }, [selectedPaperId, userId, selectedMessageIds, messages, fetchMessages]);

  // Load initial shared state when entering selection mode
  useEffect(() => {
    if (isSelectionMode) {
      // Pre-select messages that are currently shared (public) and owned by the user
      const sharedMessages = messages.filter(msg => 
        msg.viewAccess === "public" && msg.userId === userId
      );
      setSelectedMessageIds(sharedMessages.map(msg => msg.id));
    }
  }, [isSelectionMode, messages, userId]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white max-h-screen">
      {/* Persistent header with dropdown */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 text-lg font-medium text-gray-800 hover:text-gray-600"
          >
            <span>{currentView.userId === userId ? "My Chat" : `${currentView.userName}'s Shared Messages`}</span>
            <FiChevronDown className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => {
                  setCurrentView({ userId, userName });
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2
                  ${currentView.userId === userId ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                <span>My Chat</span>
                {currentView.userId === userId && <FiCheck className="ml-auto" />}
              </button>
              
              <div className="border-t border-gray-200 my-1"></div>
              
              {collaborators.map((collaborator) => (
                <button
                  key={collaborator.userId}
                  onClick={() => {
                    setCurrentView(collaborator);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2
                    ${currentView.userId === collaborator.userId ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  <span>{collaborator.userName}'s Shared Messages</span>
                  {currentView.userId === collaborator.userId && <FiCheck className="ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {isViewingOwnChat && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors flex items-center justify-center whitespace-nowrap
                ${isSelectionMode 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <FiShare2 className="mr-1.5" size={14} />
              Manage Shared Messages
            </button>
          </div>
        )}
      </div>

      {/* Selection mode header - only show in own chat */}
      {isViewingOwnChat && isSelectionMode && (
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between flex-shrink-0">
          <span className="font-medium text-gray-700">
            {selectedMessageIds.length === 0 
              ? "Select messages to share" 
              : `${selectedMessageIds.length} messages will be shared`}
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelectAll}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors
                ${selectedMessageIds.length > 0
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'text-blue-500 hover:bg-blue-50'}`}
            >
              {selectedMessageIds.length > 0 ? 'Unselect All' : 'Share All'}
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiShare2 className="mr-1.5" size={14} />
              {isSharing ? 'Updating...' : 'Update Permissions'}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Message display area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white min-h-0">
        <div className="max-w-3xl mx-auto">
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
              {/* Show different message if viewing collaborator's empty shared messages */}
              {!isViewingOwnChat && messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-4">
                  <p>{currentView.userName} hasn't shared any messages yet.</p>
                </div>
              ) : (
                <>
                  {filteredMessages.map((message, index) => (
                    <ChatMessage 
                      key={`${message.id}-${index}`} 
                      message={message}
                      isSelected={selectedMessageIds.includes(message.id)}
                      onSelect={handleMessageSelect}
                      selectionMode={isViewingOwnChat && isSelectionMode}
                    />
                  ))}
                </>
              )}
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
      </div>

      {/* Input area - only show in own chat */}
      {isViewingOwnChat && (
        <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            {rootContent && <ContentInfo content={selectedContent} />}

            <form onSubmit={handleSubmit} className="flex items-start space-x-3 mt-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                disabled={isLoading || !rootContent}
                placeholder={
                  rootContent
                    ? "Type a message... (Press Enter to send, Shift+Enter for line break)"
                    : "Please input a paper first..."
                }
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px] max-h-[160px] overflow-y-auto disabled:bg-gray-100 disabled:text-gray-400"
              />
              <div className="flex flex-col space-y-2">
                <button
                  type="submit"
                  name="action"
                  value="send"
                  disabled={!input.trim() || isLoading || !rootContent}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Ask AI
                </button>
                <button
                  type="submit"
                  name="action"
                  value="sendAsComment"
                  disabled={!input.trim() || isLoading || !rootContent}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-yellow-300 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
