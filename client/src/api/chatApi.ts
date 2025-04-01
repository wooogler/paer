import { ChatMessage } from "../types/chat";
import api from "../services/api";

/**
 * 모든 채팅 메시지를 가져옵니다
 */
export const getMessages = async (): Promise<ChatMessage[]> => {
  try {
    const response = await api.get(`/chat/messages`);
    return response.data.messages;
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return [];
  }
};

/**
 * 특정 블록 ID에 연결된 메시지들을 가져옵니다
 */
export const getMessagesByBlockId = async (
  blockId: string
): Promise<ChatMessage[]> => {
  try {
    const response = await api.get(`/chat/messages/${blockId}`);
    return response.data.messages;
  } catch (error) {
    console.error(`Error fetching messages for blockId ${blockId}:`, error);
    return [];
  }
};

/**
 * 새로운 메시지를 서버에 추가합니다
 */
export const addMessage = async (message: ChatMessage): Promise<boolean> => {
  try {
    await api.post(`/chat/messages`, message);
    return true;
  } catch (error) {
    console.error("Error adding message:", error);
    return false;
  }
};

/**
 * 여러 메시지들을 한번에 저장합니다
 */
export const saveMessages = async (
  messages: ChatMessage[]
): Promise<boolean> => {
  try {
    await api.put(`/chat/messages`, { messages });
    return true;
  } catch (error) {
    console.error("Error saving messages:", error);
    return false;
  }
};

/**
 * 모든 메시지를 삭제합니다
 */
export const clearMessages = async (): Promise<boolean> => {
  try {
    await api.delete(`/chat/messages`);
    return true;
  } catch (error) {
    console.error("Error clearing messages:", error);
    return false;
  }
};

/**
 * 특정 ID의 메시지를 삭제합니다
 */
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  try {
    await api.delete(`/chat/messages/${messageId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting message ${messageId}:`, error);
    return false;
  }
};
