import { ChatMessage, MessageAccessList } from "../types/chat";
import { Chat, IChat } from "../models/Chat";
import mongoose, { isValidObjectId, Document } from "mongoose";
import { PaperModel } from "../models/Paper";
import { User, IUser } from "../models/User";

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

      // Get the paper to check collaboratorIds
      const paper = await PaperModel.findOne({ _id: paperId });
      if (!paper) {
        return [];
      }

      // Check if the user is the author or a collaborator
      const isAuthorOrCollaborator = 
        userId === paper.authorId.toString() || 
        paper.collaboratorIds.some(id => id.toString() === userId);

      if (!isAuthorOrCollaborator) {
        return [];
      }

      // Get all chats where:
      // 1. paperId matches
      // 2. userId is either the author or a collaborator
      const chats = await Chat.find({
        paperId,
        userId: { 
          $in: [paper.authorId, ...paper.collaboratorIds]
        }
      });

      // Get all unique user IDs from messages
      const userIds = new Set<string>();
      chats.forEach(chat => {
        chat.messages.forEach(message => {
          if (message.userId) {
            userIds.add(message.userId.toString());
          }
        });
      });

      // Get all users as lean objects (plain JavaScript objects)
      const users = await User.find({ _id: { $in: Array.from(userIds) } }).lean();
      
      // Create a map of userIds to usernames
      const userMap = new Map<string, string>();
      for (const user of users) {
        if (user && user._id) {
          userMap.set(user._id.toString(), user.username || "Unknown");
        }
      }

      // Combine all messages and filter based on viewAccess
      const allMessages: ChatMessage[] = [];
      
      chats.forEach(chat => {
        chat.messages.forEach(message => {
          // Check if message should be included based on viewAccess
          if (message.viewAccess === "public" || 
              (message.userId && message.userId.toString() === userId)) {
            
            // Create a plain object with all message properties
            const plainMessage: ChatMessage = {
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
              blockId: message.blockId,
              messageType: message.messageType,
              userId: message.userId,
              viewAccess: message.viewAccess,
              userName: message.userId ? 
                userMap.get(message.userId.toString()) || "Unknown" : 
                "Unknown",
              previousSentence: message.previousSentence,
              updatedSentence: message.updatedSentence
            };
            
            allMessages.push(plainMessage);
          }
        });
      });

      // Sort messages by timestamp
      return allMessages.sort((a, b) => a.timestamp - b.timestamp);
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

      // Get the paper to check collaboratorIds
      const paper = await PaperModel.findOne({ _id: paperId });
      if (!paper) {
        return [];
      }

      // Check if the user is the author or a collaborator
      const isAuthorOrCollaborator = 
        userId === paper.authorId.toString() || 
        paper.collaboratorIds.some(id => id.toString() === userId);

      if (!isAuthorOrCollaborator) {
        return [];
      }

      // Get all chats where:
      // 1. paperId matches
      // 2. userId is either the author or a collaborator
      const chats = await Chat.find({
        paperId,
        userId: { 
          $in: [paper.authorId, ...paper.collaboratorIds]
        }
      });

      // Get all unique user IDs from messages
      const userIds = new Set<string>();
      chats.forEach(chat => {
        chat.messages.forEach(message => {
          if (message.userId) {
            userIds.add(message.userId.toString());
          }
        });
      });

      // Get all users as lean objects (plain JavaScript objects)
      const users = await User.find({ _id: { $in: Array.from(userIds) } }).lean();
      
      // Create a map of userIds to usernames
      const userMap = new Map<string, string>();
      for (const user of users) {
        if (user && user._id) {
          userMap.set(user._id.toString(), user.username || "Unknown");
        }
      }

      // Combine all messages and filter based on viewAccess and blockId
      const allMessages: ChatMessage[] = [];
      
      chats.forEach(chat => {
        chat.messages.forEach(message => {
          // Check if message should be included
          if (message.blockId === blockId &&
              (message.viewAccess === "public" || 
              (message.userId && message.userId.toString() === userId))) {
            
            // Create a plain object with all message properties
            const plainMessage: ChatMessage = {
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: message.timestamp,
              blockId: message.blockId,
              messageType: message.messageType,
              userId: message.userId,
              viewAccess: message.viewAccess,
              userName: message.userId ? 
                userMap.get(message.userId.toString()) || "Unknown" : 
                "Unknown",
              previousSentence: message.previousSentence,
              updatedSentence: message.updatedSentence
            };
            
            allMessages.push(plainMessage);
          }
        });
      });

      // Sort messages by timestamp
      return allMessages.sort((a, b) => a.timestamp - b.timestamp);
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
}
