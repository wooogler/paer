import { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "../services/chatService";
import { ChatMessage } from "../types/chat";

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  /**
   * 사용자의 특정 문서에 대한 모든 채팅 메시지를 가져옵니다.
   */
  async getMessages(
    request: FastifyRequest<{
      Params: { paperId: string };
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId } = request.params;
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const messages = await this.chatService.getMessages(userId, paperId);
      return { success: true, messages };
    } catch (error) {
      console.error("Error getting chat messages:", error);
      return reply.code(500).send({ error: "Failed to get chat messages" });
    }
  }

  /**
   * 특정 블록 ID에 연결된 메시지들을 가져옵니다.
   */
  async getMessagesByBlockId(
    request: FastifyRequest<{
      Params: { paperId: string, blockId: string };
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId, blockId } = request.params;
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      const messages = await this.chatService.getMessagesByBlockId(userId, paperId, blockId);
      return { success: true, messages };
    } catch (error) {
      console.error("Error getting messages by blockId:", error);
      return reply
        .code(500)
        .send({ error: "Failed to get messages by blockId" });
    }
  }

  /**
   * 새로운 메시지를 추가합니다.
   */
  async addMessage(
    request: FastifyRequest<{
      Params: { paperId: string };
      Body: ChatMessage & { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId } = request.params;
      const { userId, ...message } = request.body;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      await this.chatService.addMessage(userId, paperId, message);
      return { success: true };
    } catch (error) {
      console.error("Error adding message:", error);
      return reply.code(500).send({ error: "Failed to add message" });
    }
  }

  /**
   * 여러 메시지를 한 번에 저장합니다.
   */
  async saveMessages(
    request: FastifyRequest<{
      Params: { paperId: string };
      Body: { userId: string, messages: ChatMessage[] };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId } = request.params;
      const { userId, messages } = request.body;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      await this.chatService.saveMessages(userId, paperId, messages);
      return { success: true };
    } catch (error) {
      console.error("Error saving messages:", error);
      return reply.code(500).send({ error: "Failed to save messages" });
    }
  }

  /**
   * 모든 메시지를 삭제합니다.
   */
  async clearMessages(
    request: FastifyRequest<{
      Params: { paperId: string };
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId } = request.params;
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      await this.chatService.clearMessages(userId, paperId);
      return { success: true };
    } catch (error) {
      console.error("Error clearing messages:", error);
      return reply.code(500).send({ error: "Failed to clear messages" });
    }
  }

  /**
   * 특정 ID의 메시지를 삭제합니다.
   */
  async deleteMessage(
    request: FastifyRequest<{
      Params: { paperId: string, messageId: string };
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId, messageId } = request.params;
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      await this.chatService.deleteMessage(userId, paperId, messageId);
      return { success: true };
    } catch (error) {
      console.error("Error deleting message:", error);
      return reply.code(500).send({ error: "Failed to delete message" });
    }
  }
}
