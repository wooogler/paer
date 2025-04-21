import { ChatMessage } from "../types/chat";
import { Chat, IChat } from "../models/Chat";
import mongoose, { isValidObjectId } from "mongoose";

export class ChatRepository {
  /**
   * 특정 사용자와 문서에 대한 모든 메시지 조회
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
   * 특정 사용자와 문서에 대한 메시지 저장
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
   * 특정 사용자와 문서에 새 메시지 추가
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
   * 특정 사용자와 문서의 모든 메시지 제거
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
   * 특정 블록 ID에 해당하는 메시지 조회
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
   * 특정 메시지 ID에 해당하는 메시지 삭제
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
