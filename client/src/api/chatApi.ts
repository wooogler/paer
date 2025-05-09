import { api } from "./paperApi";

export type MessageType = "chat" | "comment" | "edit";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  blockId?: string;
  userId: string;
  paperId: string;
  userName: string;
  messageType?: MessageType;
  viewAccess: string;
  previousSentence?: string;
  updatedSentence?: string;
}

export interface MessageAccessList {
  "private": string[];
  "public": string[];
}

/**
 * Get all chat messages
 */
export const getMessages = async (userId: string, paperId: string): Promise<Message[]> => {
  try {
    const response = await api.get(`/chat/${paperId}/messages`, {
      params: { userId }
    });
    
    // Check response structure and return correct message array
    if (response.data && response.data.messages && Array.isArray(response.data.messages)) {
      return response.data.messages;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn("Unexpected response format:", response.data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

/**
 * Get messages connected to a specific block ID
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
 * Add a new message to the server
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
 * Save multiple messages at once
 */
export const saveMessages = async (paperId: string, messages: Message[], userId: string): Promise<void> => {
  try {
    await api.put(`/chat/${paperId}/messages`, { messages, userId });
  } catch (error) {
    console.error("Error saving messages:", error);
    throw error;
  }
};

/**
 * Delete all messages
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
 * Delete a message with a specific ID
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

/**
 * update message access
 */
export const updateMessageAccess = async (paperId: string, userId: string, messageAccessList: MessageAccessList): Promise<void> => {
  try {
    await api.patch(`/chat/${paperId}/messages/access`, { userId, messageAccessList });
  } catch (error) {
    console.error("Error updating message access:", error);
    throw error;
  }
}

/**
 * Summarize messages related to a specific block and store the result in the block's summary field
 */
export const summarizeMessages = async (messages: Message[], blockId: string, paperId?: string, userId?: string): Promise<{ summary: string; summaryUpdated: boolean }> => {
  try {
    const response = await api.post('/chat/summarize-messages', { messages, blockId, paperId, userId });
    
    if (response.data && response.data.success && response.data.summary) {
      return { 
        summary: response.data.summary,
        summaryUpdated: response.data.summaryUpdated || false
      };
    } else {
      throw new Error('Invalid summary response');
    }
  } catch (error) {
    console.error("Error summarizing messages:", error);
    throw error;
  }
};

export const chatApi = {
  fetchAllMessages: async (paperId: string) => {
    const response = await api.get(`/chat/${paperId}/messages`);
    return response.data;
  },

  fetchMessagesByBlockId: async (paperId: string, blockId: string) => {
    const response = await api.get(`/chat/${paperId}/messages/${blockId}`);
    return response.data;
  },

  addMessage: async (paperId: string, message: Message) => {
    const response = await api.post(`/chat/${paperId}/messages`, message);
    return response.data;
  },

  saveMessages: async (paperId: string, messages: Message[]) => {
    const response = await api.post(`/chat/${paperId}/messages/batch`, messages);
    return response.data;
  },

  clearMessages: async (paperId: string) => {
    const response = await api.delete(`/chat/${paperId}/messages`);
    return response.data;
  },

  deleteMessage: async (paperId: string, messageId: string) => {
    const response = await api.delete(`/chat/${paperId}/messages/${messageId}`);
    return response.data;
  },
};
