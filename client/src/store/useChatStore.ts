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
  // 챗 UI의 가시성 상태
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
      // 기본적으로 챗 UI는 보이는 상태로 설정
      isChatVisible: true,

      // 챗 UI 가시성 토글 함수
      toggleChatVisibility: () => {
        set((state) => ({ isChatVisible: !state.isChatVisible }));
      },

      // 서버에서 메시지 가져오기
      fetchMessages: async () => {
        const userId = useAppStore.getState().userId;
        const selectedPaperId = useContentStore.getState().selectedPaperId;
        if (!userId || !selectedPaperId) return;

        set({ isLoading: true });
        try {
          const messages = await getMessages(userId, selectedPaperId);
          // 메시지가 배열인지 확인
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

      // 특정 블록 ID의 메시지 가져오기
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

      // 필터링 모드 토글 함수
      toggleFiltering: (enabled) => {
        set({ isFilteringEnabled: enabled });
      },

      // 필터 blockId 설정 함수
      setFilterBlockId: (blockId) => {
        set({ filterBlockId: blockId });
      },

      // 메시지 배열을 직접 설정하는 함수
      setMessages: (messages: Message[]) => {
        set({ messages });
      },

      addMessage: async (message: Message) => {
        try {
          // Add user message immediately to show it in the UI
          set((state) => ({
            messages: [...state.messages, message],
            isLoading: true // 로딩 상태 켜기
          }));

          // Send to server and update with response
          const userId = useAppStore.getState().userId;
          if (!userId) {
            throw new Error("User ID is required");
          }
          
          // 사용자 메시지 전송
          await chatApi.addMessage(message.paperId, { ...message, userId });
          
          // 메시지 전송 성공 후 모든 메시지 다시 불러오기
          await get().fetchMessages();
          
          // 로딩 상태 종료
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
