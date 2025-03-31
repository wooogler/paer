import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { ChatMessage } from "../types/chat";
import { v4 as uuidv4 } from "uuid";
import { useContentStore } from "./useContentStore";
import * as chatApi from "../api/chatApi";

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (content: string, role: ChatMessage["role"]) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  isLoading: boolean;
  filterBlockId: string | null;
  setFilterBlockId: (blockId: string | null) => void;
  isFilteringEnabled: boolean;
  toggleFiltering: (enabled: boolean) => void;
  fetchMessages: () => Promise<void>;
  fetchMessagesByBlockId: (blockId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      messages: [],
      isLoading: false,
      filterBlockId: null,
      isFilteringEnabled: false,

      // 서버에서 메시지 가져오기
      fetchMessages: async () => {
        try {
          const messages = await chatApi.getMessages();
          set({ messages });
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      },

      // 특정 블록 ID의 메시지 가져오기
      fetchMessagesByBlockId: async (blockId: string) => {
        try {
          const messages = await chatApi.getMessagesByBlockId(blockId);
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
        // 필터링을 해제할 때는 필터 BlockId도 함께 초기화
        if (!enabled) {
          set({ filterBlockId: null });
        }
      },

      // 필터 blockId 설정 함수
      setFilterBlockId: (blockId) => {
        set({
          filterBlockId: blockId,
          // blockId가 설정되면 필터링 모드도 자동으로 활성화
          isFilteringEnabled: blockId !== null,
        });
      },

      // 메시지 배열을 직접 설정하는 함수
      setMessages: async (messages) => {
        set({ messages });
        // 서버에 저장
        await chatApi.saveMessages(messages);
      },

      addMessage: async (content, role) => {
        // Get the current selected content to save its blockId
        const { selectedContent } = useContentStore.getState();

        const newMessage: ChatMessage = {
          id: uuidv4(),
          role,
          content,
          timestamp: Date.now(),
          blockId: selectedContent?.["block-id"], // 선택된 콘텐츠의 blockId를 저장
        };

        set((state) => {
          const updatedMessages = [...state.messages, newMessage];
          return { messages: updatedMessages };
        });

        // 서버에 새 메시지 저장
        await chatApi.addMessage(newMessage);

        // Auto-respond to user messages
        if (role === "user") {
          set({ isLoading: true });
          try {
            // Get the rendered content from the editor
            const { selectedContent, parentContents } =
              useContentStore.getState();
            let renderedContent = "";

            // Build the rendered content from parent hierarchy and selected content
            if (parentContents.length > 0) {
              renderedContent = parentContents
                .map((content) => content.title)
                .join(" > ");
              renderedContent += "\n\n";
            }

            if (selectedContent) {
              if (selectedContent.title) {
                renderedContent += `${selectedContent.title}\n\n`;
              }
              if (selectedContent.content) {
                if (Array.isArray(selectedContent.content)) {
                  renderedContent += selectedContent.content
                    .filter((item) => item && item.type === "sentence")
                    .map((item) => item.content)
                    .join(" ");
                } else if (typeof selectedContent.content === "string") {
                  renderedContent += selectedContent.content;
                }
              }
            }

            const response = await fetch("/api/chat/ask", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: content,
                renderedContent: renderedContent.trim(),
              }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
              throw new Error(data.error || "Failed to get response from LLM");
            }

            if (!data.result?.choices?.[0]?.message?.content) {
              throw new Error("Invalid response format from LLM");
            }

            const systemResponse: ChatMessage = {
              id: uuidv4(),
              role: "system",
              content: data.result.choices[0].message.content,
              timestamp: Date.now(),
              blockId: selectedContent?.["block-id"], // 시스템 응답에도 동일한 blockId 저장
            };

            set((state) => {
              const updatedMessages = [...state.messages, systemResponse];
              return { messages: updatedMessages };
            });

            // 시스템 응답도 서버에 저장
            await chatApi.addMessage(systemResponse);
          } catch (error) {
            console.error("Error getting LLM response:", error);
            const errorMessage: ChatMessage = {
              id: uuidv4(),
              role: "system",
              content:
                error instanceof Error
                  ? error.message
                  : "I apologize, but I encountered an error while processing your request. Please try again.",
              timestamp: Date.now(),
              blockId: selectedContent?.["block-id"], // 에러 메시지에도 동일한 blockId 저장
            };

            set((state) => {
              const updatedMessages = [...state.messages, errorMessage];
              return { messages: updatedMessages };
            });

            // 에러 메시지도 서버에 저장
            await chatApi.addMessage(errorMessage);
          } finally {
            set({ isLoading: false });
          }
        }
      },

      clearMessages: async () => {
        set({ messages: [] });
        // 서버에서도 메시지 삭제
        await chatApi.clearMessages();
      },
    }),
    { name: "Chat Store" }
  )
);
