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
import { FiShare2, FiCheck, FiChevronDown, FiFilter } from "react-icons/fi";
import { getMembers } from "../../api/paperApi";
import { getAllUsers } from "../../api/userApi";
import { toast } from "react-hot-toast";
import { updateMessageAccess } from "../../api/chatApi";
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react";
import { MessageType } from "../../api/chatApi";

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
  const { selectedContent, content: rootContent, selectedPaperId, selectedPath } = useContentStore();
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
  const [selectedViews, setSelectedViews] = useState<ViewingMode[]>([{ userId, userName }]);
  const [selectedMessageTypes, setSelectedMessageTypes] = useState<MessageType[]>(['chat', 'comment']);

  const isOnlyMyChatSelected = useMemo(() => 
    selectedViews.length === 1 && selectedViews[0].userId === userId,
    [selectedViews, userId]
  );

  // Load collaborators
  useEffect(() => {
    const loadCollaborators = async () => {
      if (!selectedPaperId || !userId) return;
      
      try {
        const userResponse = await getAllUsers();
        const membersResponse = await getMembers(selectedPaperId, userId);
        
        // Filter out the current user and map collaborators to include usernames
        const collaboratorsWithUsernames = membersResponse
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
      // Only select own messages
      const myMessages = messages.filter(msg => msg.userId === userId);
      setSelectedMessageIds(myMessages.map(msg => msg.id));
    }
  }, [messages, selectedMessageIds.length, userId]);

  const isViewingOwnChat = selectedViews.some(view => view.userId === userId);

  // Calculate filtered messages list
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    // First filter by blockId if filtering is enabled
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

    // Filter based on selected views
    if (selectedViews.length > 0) {
      filtered = filtered.filter(msg => 
        selectedViews.some(view => {
          if (view.userId === userId) {
            // For own messages, show all
            return msg.userId === userId;
          } else {
            // For collaborators, only show public messages
            return msg.userId === view.userId && msg.viewAccess === "public";
          }
        })
      );
    }

    // Filter by message types
    filtered = filtered.filter(msg => 
      selectedMessageTypes.includes(msg.messageType || 'chat')
    );

    return filtered;
  }, [messages, filterBlockId, rootContent, isFilteringEnabled, selectedViews, userId, selectedMessageTypes]);

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
    // Only select own messages
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

  const handleShare = useCallback(async () => {
    if (!selectedPaperId || !userId) {
      toast.error("Cannot update permissions: No paper selected");
      return;
    }

    try {
      setIsSharing(true);

      // Only filter own messages
      const myMessages = messages.filter(msg => msg.userId === userId);
      
      // Current publicly shared messages that are not selected to be unshared
      const messagesToUnshare = myMessages
        .filter(msg => msg.viewAccess === "public" && !selectedMessageIds.includes(msg.id))
        .map(msg => msg.id);

      // Selected messages to be shared
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

  const handleViewChange = (newViews: ViewingMode[]) => {
    // Selection mode should not be allowed if no views are selected
    if (newViews.length === 0) {
      setIsSelectionMode(false);
    }
    setSelectedViews(newViews);
  };

  const handleMessageTypeChange = (newTypes: MessageType[]) => {
    setSelectedMessageTypes(newTypes);
  };

  return (
    <div className={`flex flex-col bg-white ${isFilteringEnabled && filterBlockId ? 'max-h-[calc(100vh-96px)] h-[calc(100vh-96px)]' : 'max-h-[calc(100vh-56px)] h-[calc(100vh-56px)]'} overflow-hidden`}>
      {/* Persistent header with dropdown */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Listbox 
              value={selectedViews} 
              onChange={handleViewChange} 
              multiple
              by={(a, b) => a.userId === b.userId}
            >
              <div className="relative">
                <ListboxButton className="flex items-center space-x-2 text-lg font-medium text-gray-800 hover:text-gray-600">
                  <span>
                    {selectedViews.length === 1 && selectedViews[0].userId === userId
                      ? "My Chat"
                      : selectedViews.length === 1
                      ? `${selectedViews[0].userName}'s Messages`
                      : `${selectedViews.length} Users Selected`}
                  </span>
                  <FiChevronDown className="transition-transform ui-open:rotate-180" />
                </ListboxButton>
                <ListboxOptions anchor="bottom" className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <ListboxOption
                    value={{ userId, userName }}
                    className="relative cursor-pointer select-none py-2 pl-4 pr-10 data-focus:bg-blue-50 data-focus:text-blue-600 data-selected:bg-blue-50 data-selected:text-blue-600"
                  >
                    {({ selected }) => (
                      <>
                        <span className="block truncate">{userName} (Me)</span>
                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiCheck className="h-5 w-5" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                  <div className="border-t border-gray-200 my-1"></div>
                  {collaborators.map((collaborator) => (
                    <ListboxOption
                      key={collaborator.userId}
                      value={collaborator}
                      className="relative cursor-pointer select-none py-2 pl-4 pr-10 data-focus:bg-blue-50 data-focus:text-blue-600 data-selected:bg-blue-50 data-selected:text-blue-600"
                    >
                      {({ selected }) => (
                        <>
                          <span className="block truncate">{collaborator.userName}</span>
                          {selected && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <FiCheck className="h-5 w-5" />
                            </span>
                          )}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          </div>

          <div className="relative">
            <Listbox 
              value={selectedMessageTypes} 
              onChange={handleMessageTypeChange} 
              multiple
            >
              <div className="relative">
                <ListboxButton className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                  <FiFilter className="text-gray-500" />
                  <span>
                    {selectedMessageTypes.length === 3 
                      ? "All Types" 
                      : selectedMessageTypes.length === 2 && selectedMessageTypes.includes('chat') && selectedMessageTypes.includes('comment')
                      ? "Chats & Comments"
                      : selectedMessageTypes.length === 1
                      ? selectedMessageTypes[0] === 'chat' ? "Chats" : 
                        selectedMessageTypes[0] === 'comment' ? "Comments" : "Edits"
                      : `${selectedMessageTypes.length} Types`}
                  </span>
                  <FiChevronDown className="transition-transform ui-open:rotate-180" size={14} />
                </ListboxButton>
                <ListboxOptions anchor="bottom" className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <ListboxOption
                    value="chat"
                    className="relative cursor-pointer select-none py-2 pl-4 pr-10 data-focus:bg-blue-50 data-focus:text-blue-600 data-selected:bg-blue-50 data-selected:text-blue-600"
                  >
                    {({ selected }) => (
                      <>
                        <span className="block truncate">Chats</span>
                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiCheck className="h-5 w-5" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                  <ListboxOption
                    value="comment"
                    className="relative cursor-pointer select-none py-2 pl-4 pr-10 data-focus:bg-blue-50 data-focus:text-blue-600 data-selected:bg-blue-50 data-selected:text-blue-600"
                  >
                    {({ selected }) => (
                      <>
                        <span className="block truncate">Comments</span>
                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiCheck className="h-5 w-5" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                  <ListboxOption
                    value="edit"
                    className="relative cursor-pointer select-none py-2 pl-4 pr-10 data-focus:bg-blue-50 data-focus:text-blue-600 data-selected:bg-blue-50 data-selected:text-blue-600"
                  >
                    {({ selected }) => (
                      <>
                        <span className="block truncate">Edits</span>
                        {selected && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <FiCheck className="h-5 w-5" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                </ListboxOptions>
              </div>
            </Listbox>
          </div>
        </div>
        
        {isOnlyMyChatSelected && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`px-4 py-1.5 text-sm rounded-full transition-colors flex items-center justify-center whitespace-nowrap
                ${!isSelectionMode 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {isSelectionMode ? 'Cancel' : <><FiShare2 className="mr-1.5" size={14} /> Messages</>}
            </button>
            {!isSelectionMode && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all chat messages?")) {
                    useChatStore.getState().clearMessages();
                  }
                }}
                className="p-1.5 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors"
                title="Clear chat messages"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selection mode header - only show in own chat */}
      {isOnlyMyChatSelected && isSelectionMode && (
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
              className="px-4 py-1.5 text-sm bg-green-500 text-white rounded-full hover:bg-green-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
          ) : selectedViews.length === 0 ? (
            <div className="text-center text-gray-500 mt-4">
              <p>Please select a user to view their messages.</p>
              <p className="mt-2">Use the dropdown menu above to select users.</p>
            </div>
          ) : (
            <>
              {/* Show different message if viewing collaborator's empty shared messages */}
              {!isViewingOwnChat && messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-4">
                  <p>
                    {selectedViews.length === 1 
                      ? `${selectedViews[0].userName} hasn't shared any messages yet.`
                      : 'No messages available in selected views.'}
                  </p>
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
            {rootContent && <ContentInfo content={selectedContent} path={selectedPath || undefined} />}

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
