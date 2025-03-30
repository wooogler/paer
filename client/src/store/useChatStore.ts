import { create } from "zustand";
import { ChatMessage } from "../types/chat";
import { v4 as uuidv4 } from "uuid";
import { writeChatHistory } from "../utils/chatStorage";
import { useContentStore } from "./useContentStore";

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (content: string, role: ChatMessage["role"]) => void;
  clearMessages: () => void;
  isLoading: boolean;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: async (content, role) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
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
        const { selectedContent, parentContents } = useContentStore.getState();
        let renderedContent = '';

        // Build the rendered content from parent hierarchy and selected content
        if (parentContents.length > 0) {
          renderedContent = parentContents
            .map(content => content.title)
            .join(' > ');
          renderedContent += '\n\n';
        }

        if (selectedContent) {
          if (selectedContent.title) {
            renderedContent += `${selectedContent.title}\n\n`;
          }
          if (selectedContent.content) {
            if (Array.isArray(selectedContent.content)) {
              renderedContent += selectedContent.content
                .filter(item => item && item.type === 'sentence')
                .map(item => item.content)
                .join(' ');
            } else if (typeof selectedContent.content === 'string') {
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
            renderedContent: renderedContent.trim()
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
          content: error instanceof Error ? error.message : "I apologize, but I encountered an error while processing your request. Please try again.",
          timestamp: Date.now(),
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
}));
