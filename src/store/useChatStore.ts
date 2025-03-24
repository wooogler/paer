import { create } from "zustand";
import { ChatMessage } from "../types/chat";
import { v4 as uuidv4 } from "uuid";
import { readChatHistory, writeChatHistory } from "../utils/chatStorage";

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (content: string, role: ChatMessage["role"]) => void;
  clearMessages: () => void;
}

// AI response generation function
const generateAIResponse = (userMessage: string): string => {
  // Simple keyword-based response logic
  const lowercaseMessage = userMessage.toLowerCase();

  if (lowercaseMessage.includes("hello") || lowercaseMessage.includes("hi")) {
    return "Hello! How can I help you today?";
  }

  if (lowercaseMessage.includes("help")) {
    return "Do you need assistance? Please let me know your questions or requests in detail, and I'll do my best to help.";
  }

  if (lowercaseMessage.includes("thank")) {
    return "You're welcome! Feel free to ask if you need anything else.";
  }

  if (
    lowercaseMessage.includes("paper") ||
    lowercaseMessage.includes("document")
  ) {
    return "Need help with your document? Let me know what aspect you need assistance with. I can help with structure, content, editing, and more.";
  }

  if (lowercaseMessage.includes("code")) {
    return "Do you have questions about code? Please provide more details about the specific language or framework, and I'll try to assist you.";
  }

  // Default responses
  const defaultResponses = [
    `I'll provide an answer about "${userMessage}". Let me know if you need more details.`,
    `Interesting question! Could you tell me more about "${userMessage}"?`,
    `Good question. What specific aspect of "${userMessage}" would you like to know more about?`,
    `I'm thinking about "${userMessage}". Please wait... More specific information would help me provide a more accurate answer.`,
    `I understand. I may need additional information to answer about "${userMessage}". Is there anything specific you'd like to know?`,
  ];

  // Randomly select a default response
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],

  addMessage: (content, role) => {
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
      // Delay for typing effect
      setTimeout(() => {
        const systemResponse: ChatMessage = {
          id: uuidv4(),
          role: "system",
          content: generateAIResponse(content),
          timestamp: Date.now(),
        };

        set((state) => {
          const updatedMessages = [...state.messages, systemResponse];
          writeChatHistory(updatedMessages);
          return { messages: updatedMessages };
        });
      }, 1000);
    }
  },

  clearMessages: () => {
    set({ messages: [] });
    writeChatHistory([]);
  },
}));
