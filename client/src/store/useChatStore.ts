import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { ChatMessage } from "../types/chat";
import { v4 as uuidv4 } from "uuid";
import { writeChatHistory } from "../utils/chatStorage";
import { useContentStore } from "./useContentStore";

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
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      messages: [],
      isLoading: false,
      filterBlockId: null,
      isFilteringEnabled: false,

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
      setMessages: (messages) => {
        set({ messages });
        writeChatHistory(messages);
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
          writeChatHistory(updatedMessages);
          return { messages: updatedMessages };
        });

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
              writeChatHistory(updatedMessages);
              return { messages: updatedMessages };
            });
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
              writeChatHistory(updatedMessages);
              return { messages: updatedMessages };
            });
          } finally {
            set({ isLoading: false });
          }
        }
      },

      clearMessages: () => {
        set({ messages: [] });
        writeChatHistory([]);
      },
    }),
    { name: "Chat Store" }
  )
);
