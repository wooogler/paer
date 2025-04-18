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
export const getMessages = async (userName: string): Promise<Message[]> => {
  const response = await api.get(`/chat/default/messages?userName=${userName}`);
  const { messages } = response.data;
  if (!Array.isArray(messages)) {
    console.error("Server response messages is not an array:", messages);
    return [];
  }
  return messages;
};

/**
 * 특정 블록 ID에 연결된 메시지들을 가져옵니다
 */
export const getMessagesByBlockId = async (
  userName: string,
  blockId: string
): Promise<Message[]> => {
  const response = await api.get(
    `/chat/default/messages/${blockId}?userName=${userName}`
  );
  const { messages } = response.data;
  if (!Array.isArray(messages)) {
    console.error("Server response messages is not an array:", messages);
    return [];
  }
  return messages;
};

/**
 * 새로운 메시지를 서버에 추가합니다
 */
export const addMessage = async (
  userName: string,
  content: string,
  role: "user" | "assistant" | "system" = "user",
  blockId?: string
): Promise<Message> => {
  const response = await api.post(`/chat/default/messages?userName=${userName}`, {
    content,
    role,
    blockId,
  });
  return response.data;
};

/**
 * 여러 메시지들을 한번에 저장합니다
 */
export const saveMessages = async (
  userName: string,
  messages: Message[]
): Promise<void> => {
  await api.post(`/chat/default/messages/save?userName=${userName}`, { messages });
};

/**
 * 모든 메시지를 삭제합니다
 */
export const clearMessages = async (userName: string): Promise<void> => {
  await api.delete(`/chat/default/messages?userName=${userName}`);
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
