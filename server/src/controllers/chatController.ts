import { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "../services/chatService";
import { ChatMessage } from "../types/chat";

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  /**
   * 모든 채팅 메시지를 가져옵니다.
   */
  async getMessages(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const messages = await this.chatService.getMessages();
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
    request: FastifyRequest<{ Params: { blockId: string } }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { blockId } = request.params;
      const messages = await this.chatService.getMessagesByBlockId(blockId);
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
    request: FastifyRequest<{ Body: ChatMessage }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const message = request.body;
      await this.chatService.addMessage(message);
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
    request: FastifyRequest<{ Body: { messages: ChatMessage[] } }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { messages } = request.body;
      await this.chatService.saveMessages(messages);
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
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> {
    try {
      await this.chatService.clearMessages();
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
    request: FastifyRequest<{ Params: { messageId: string } }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { messageId } = request.params;
      await this.chatService.deleteMessage(messageId);
      return { success: true };
    } catch (error) {
      console.error("Error deleting message:", error);
      return reply.code(500).send({ error: "Failed to delete message" });
    }
  }
}
