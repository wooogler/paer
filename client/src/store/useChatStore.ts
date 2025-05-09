import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Message } from "../api/chatApi";
import { getMessages, getMessagesByBlockId, clearMessages } from "../api/chatApi";
import { useAppStore } from "./useAppStore";
import { useContentStore } from "./useContentStore";
import { chatApi } from "../api/chatApi";

interface ChatState {
  messages: Message[]; // Chat messages
  isLoading: boolean; // Loading status
  filterBlockId: string | null; // Currently filtered block ID
  isFilteringEnabled: boolean;
  fetchMessages: () => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => Promise<void>;
  setFilterBlockId: (blockId: string | null) => void;
  toggleFiltering: (enabled: boolean) => void;
  // Chat UI visibility state
  isChatVisible: boolean;
  toggleChatVisibility: () => void;
  setLoading: (isLoading: boolean) => void;
  // updateMessage: (id: string, content: string) => void;
  // deleteMessage: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      messages: [],
      isLoading: false,
      filterBlockId: null,
      isFilteringEnabled: false,
      // Set chat UI to visible by default
      isChatVisible: true,

      // Chat UI visibility toggle function
      toggleChatVisibility: () => {
        set((state) => ({ isChatVisible: !state.isChatVisible }));
      },

      // Fetch messages from server
      fetchMessages: async () => {
        const userId = useAppStore.getState().userId;
        const selectedPaperId = useContentStore.getState().selectedPaperId;
        if (!userId || !selectedPaperId) return;

        set({ isLoading: true });
        try {
          const messages = await getMessages(userId, selectedPaperId);
          // Check if messages is an array
          if (Array.isArray(messages)) {
            set({ messages });
          } else {
            console.error("Received messages is not an array:", messages);
            set({ messages: [] });
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
          set({ messages: [] });
        } finally {
          set({ isLoading: false });
        }
      },

      // Get messages for specific block ID
      fetchMessagesByBlockId: async (blockId: string) => {
        const userId = useAppStore.getState().userId;
        const selectedPaperId = useContentStore.getState().selectedPaperId;
        if (!userId || !selectedPaperId) return;

        try {
          const messages = await getMessagesByBlockId(selectedPaperId, blockId, userId);
          set({ messages });
        } catch (error) {
          console.error(
            `Failed to fetch messages for blockId ${blockId}:`,
            error
          );
        }
      },

      // Filter mode toggle function
      toggleFiltering: (enabled) => {
        set({ isFilteringEnabled: enabled });
      },

      // Set filter blockId function
      setFilterBlockId: (blockId) => {
        set({ filterBlockId: blockId });
      },

      // Function to directly set message array
      setMessages: (messages: Message[]) => {
        set({ messages });
      },

      addMessage: async (message: Message) => {
        try {
          // Send user message
          set((state) => ({
            messages: [...state.messages, message],
            isLoading: true // Turn on loading state
          }));

          // Send to server and update with response
          const userId = useAppStore.getState().userId;
          if (!userId) {
            throw new Error("User ID is required");
          }
          
          // Send user message
          await chatApi.addMessage(message.paperId, { ...message, userId });
          
          // Reload all messages after successful message send
          await get().fetchMessages();
          
          // End loading state
          set({ isLoading: false });
          
        } catch (error) {
          console.error("Error adding message:", error);
          // Remove the message if server update failed
          set((state) => ({
            messages: state.messages.filter((msg) => msg.id !== message.id),
            isLoading: false
          }));
          throw error;
        }
      },

      clearMessages: async () => {
        const userId = useAppStore.getState().userId;
        const selectedPaperId = useContentStore.getState().selectedPaperId;
        if (!userId || !selectedPaperId) return;

        set({ isLoading: true });
        try {
          await clearMessages(selectedPaperId, userId);
          set({ messages: [] });
        } catch (error) {
          console.error("Error clearing messages:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      // updateMessage: (id: string, content: string) => {
      //   // Implementation of updateMessage function
      // },

      // deleteMessage: (id: string) => {
      //   // Implementation of deleteMessage function
      // },
    }),
    { name: "Chat Store" }
  )
);
