import { ChatMessage, MessageAccessList } from "../types/chat";
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

  /**
   * Update message access
   */
  async updateMessageAccess(userId: string, paperId: string, messageAccessList: MessageAccessList): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${userId}) or paperId (${paperId})`);
        return;
      }

      // validate all messageIds exist in the database
      const messageIds = [...messageAccessList["public"], ...messageAccessList["private"]];
      const chat = await Chat.findOne({ userId, paperId });
      if (!chat) {
        console.error(`Chat not found for userId (${userId}) and paperId (${paperId})`);
        return;
      }
      const messages = chat.messages.filter(message => messageIds.includes(message.id));
      if (messages.length !== messageIds.length) {
        console.error(`Not all messageIds exist in the database for userId (${userId}) and paperId (${paperId})`);
        return;
      }

      // update access
      await Chat.updateOne(
        { userId, paperId },
        { $set: { "messages.$[elem].viewAccess": "public" } },
        { arrayFilters: [{ "elem.id": { $in: messageAccessList["public"] } }] }
      );
      await Chat.updateOne(
        { userId, paperId },
        { $set: { "messages.$[elem].viewAccess": "private" } },
        { arrayFilters: [{ "elem.id": { $in: messageAccessList["private"] } }] }
      );

      console.log(`Updated message access for userId (${userId}) and paperId (${paperId})`);
      return;
 
    } catch (error) {
      console.error("Error updating message access:", error);
    }
  }

  /**
   * Get all public messages for a specific user and paper
   * getTeammateMessages(userId, paperId, teammateId);
   */
  async getUserMessages(requestorId: string, paperId: string, requesteeId: string): Promise<ChatMessage[]> {
    try {
      if (!isValidObjectId(requesteeId) || !isValidObjectId(paperId)) {
        console.error(`Invalid userId (${requesteeId}) or paperId (${paperId})`);
        return [];
      }

      const chat = await Chat.findOne({
        userId: requesteeId,
        paperId: paperId,
      });

      console.log(`Chat: ${chat}`);

      if (!chat) {
        return [];
      }
      console.log(`Chat messages: ${chat.messages.filter(message => message.viewAccess === "public")}`);
      return chat.messages.filter(message => message.viewAccess === "public");
    } catch (error) {
      console.error("Error getting teammate messages:", error);
      return [];
    }
  }
}
