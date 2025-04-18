import api from "../services/api";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  blockId?: string;
}

/**
 * 모든 채팅 메시지를 가져옵니다
 */
export const getMessages = async (userId: string): Promise<Message[]> => {
  try {
    const response = await api.get(`/chat/messages`, {
      params: { userId }
    });
    if (!Array.isArray(response.data.messages)) {
      throw new Error("Invalid response format");
    }
    return response.data.messages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

/**
 * 특정 블록 ID에 연결된 메시지들을 가져옵니다
 */
export const getMessagesByBlockId = async (paperId: string, blockId: string, userId: string): Promise<Message[]> => {
  try {
    const response = await api.get(`/chat/${paperId}/messages/${blockId}`, {
      params: { userId }
    });
    return response.data.messages;
  } catch (error) {
    console.error("Error fetching messages by block ID:", error);
    throw error;
  }
};

/**
 * 새로운 메시지를 서버에 추가합니다
 */
export const addMessage = async (paperId: string, message: Message & { userId: string }): Promise<Message> => {
  try {
    const response = await api.post(`/chat/${paperId}/messages`, message);
    return response.data;
  } catch (error) {
    console.error("Error adding message:", error);
    throw error;
  }
};

/**
 * 여러 메시지들을 한번에 저장합니다
 */
export const saveMessages = async (paperId: string, messages: Message[], userId: string): Promise<void> => {
  try {
    await api.post(`/chat/${paperId}/messages/batch`, { messages, userId });
  } catch (error) {
    console.error("Error saving messages:", error);
    throw error;
  }
};

/**
 * 모든 메시지를 삭제합니다
 */
export const clearMessages = async (paperId: string, userId: string): Promise<void> => {
  try {
    await api.delete(`/chat/${paperId}/messages`, {
      params: { userId }
    });
  } catch (error) {
    console.error("Error clearing messages:", error);
    throw error;
  }
};

/**
 * 특정 ID의 메시지를 삭제합니다
 */
export const deleteMessage = async (paperId: string, messageId: string, userId: string): Promise<boolean> => {
  try {
    await api.delete(`/chat/${paperId}/messages/${messageId}`, {
      params: { userId }
    });
    return true;
  } catch (error) {
    console.error(`Error deleting message ${messageId}:`, error);
    return false;
  }
};
