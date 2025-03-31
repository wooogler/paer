import { ChatMessage } from "../types/chat";

const CHAT_HISTORY_KEY = "chatHistory";

// 브라우저 localStorage에서 채팅 이력 읽기
export const readChatHistory = (): ChatMessage[] => {
  if (typeof window === "undefined") return [];

  try {
    const storedMessages = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!storedMessages) return [];

    const parsedMessages = JSON.parse(storedMessages) as ChatMessage[];

    // blockId가 없는 이전 메시지 형식과의 호환성 유지
    return parsedMessages.map((message) => ({
      ...message,
      blockId: message.blockId || undefined,
    }));
  } catch (error) {
    console.error("Error reading chat history from localStorage:", error);
    return [];
  }
};

// 브라우저 localStorage에 채팅 이력 저장
export const writeChatHistory = (messages: ChatMessage[]): void => {
  if (typeof window === "undefined") return;

  try {
    // 메시지 배열을 JSON 문자열로 변환하여 저장 (blockId 포함)
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error("Error saving chat history to localStorage:", error);
  }
};
