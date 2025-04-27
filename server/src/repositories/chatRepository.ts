import { ChatMessage } from "../types/chat";
import { Chat, IChat } from "../models/Chat";
import mongoose, { isValidObjectId } from "mongoose";

export class ChatRepository {
  /**
   * Get all messages for a specific user and paper
   */
  async getMessages(userId: string, paperId: string): Promise<ChatMessage[]> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${userId}) or paperId (${paperId})`);
        return [];
      }

      const chat = await Chat.findOne({
        userId,
        paperId
      });

      if (!chat) {
        return [];
      }

      return chat.messages;
    } catch (error) {
      console.error("Failed to read chat data:", error);
      return [];
    }
  }

  /**
   * Save messages for a specific user and paper
   */
  async saveMessages(userId: string, paperId: string, messages: ChatMessage[]): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${userId}) or paperId (${paperId})`);
        return;
      }

      await Chat.findOneAndUpdate(
        { userId, paperId },
        { messages },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error("Error saving chat messages:", error);
    }
  }

  /**
   * Add a new message for a specific user and paper
   */
  async addMessage(userId: string, paperId: string, message: ChatMessage): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${userId}) or paperId (${paperId})`);
        return;
      }

      await Chat.findOneAndUpdate(
        { userId, paperId },
        { $push: { messages: message } },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error("Error adding chat message:", error);
    }
  }

  /**
   * Clear all messages for a specific user and paper
   */
  async clearMessages(userId: string, paperId: string): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${userId}) or paperId (${paperId})`);
        return;
      }

      await Chat.findOneAndUpdate(
        { userId, paperId },
        { messages: [] },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error("Error clearing chat messages:", error);
    }
  }

  /**
   * Get messages by block ID for a specific user and paper
   */
  async getMessagesByBlockId(userId: string, paperId: string, blockId: string): Promise<ChatMessage[]> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${userId}) or paperId (${paperId})`);
        return [];
      }

      const chat = await Chat.findOne({
        userId,
        paperId
      });

      if (!chat) {
        return [];
      }

      return chat.messages.filter(message => message.blockId === blockId);
    } catch (error) {
      console.error("Error getting messages by blockId:", error);
      return [];
    }
  }

  /**
   * Delete a message by ID for a specific user and paper
   */
  async deleteMessageById(userId: string, paperId: string, messageId: string): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${userId}) or paperId (${paperId})`);
        return;
      }

      await Chat.findOneAndUpdate(
        { userId, paperId },
        { $pull: { messages: { id: messageId } } }
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  }
}
