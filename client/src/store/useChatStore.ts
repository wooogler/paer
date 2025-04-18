import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Message } from "../api/chatApi";
import { getMessages, getMessagesByBlockId, addMessage, clearMessages } from "../api/chatApi";
import { useAppStore } from "./useAppStore";

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  filterBlockId: string | null;
  isFilteringEnabled: boolean;
  fetchMessages: () => Promise<void>;
  addMessage: (content: string, role: "user" | "assistant" | "system", blockId?: string) => Promise<void>;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => Promise<void>;
  setFilterBlockId: (blockId: string | null) => void;
  toggleFiltering: (enabled: boolean) => void;
  // 챗 UI의 가시성 상태
  isChatVisible: boolean;
  toggleChatVisibility: () => void;
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
        const userName = useAppStore.getState().userName;
        if (!userName) return;

        set({ isLoading: true });
        try {
          const messages = await getMessages(userName);
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
        const userName = useAppStore.getState().userName;
        if (!userName) return;

        try {
          const messages = await getMessagesByBlockId(userName, blockId);
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

      addMessage: async (content: string, role: "user" | "assistant" | "system", blockId?: string) => {
        const userName = useAppStore.getState().userName;
        if (!userName) return;

        set({ isLoading: true });
        try {
          const newMessage = await addMessage(userName, content, role, blockId);
          set((state) => ({ messages: [...state.messages, newMessage] }));
        } catch (error) {
          console.error("Error adding message:", error);
        } finally {
          set({ isLoading: false });
        }
      },

      clearMessages: async () => {
        const userName = useAppStore.getState().userName;
        if (!userName) return;

        set({ isLoading: true });
        try {
          await clearMessages(userName);
          set({ messages: [] });
        } catch (error) {
          console.error("Error clearing messages:", error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    { name: "Chat Store" }
  )
);
