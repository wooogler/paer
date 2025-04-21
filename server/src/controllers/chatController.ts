import { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "../services/chatService";
import { ChatMessage } from "../types/chat";
import { PaperService } from "../services/paperService";
import { LLMService } from "../services/llmService";

export class ChatController {
  private chatService: ChatService;
  private paperService: PaperService;
  private llmService: LLMService;

  constructor() {
    this.chatService = new ChatService();
    this.paperService = new PaperService();
    this.llmService = new LLMService();
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

      if (!paperId) {
        return reply.code(400).send({ error: "paperId is required" });
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
   * 새로운 메시지를 추가하고 OpenAI 응답을 저장합니다.
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

      console.log('ChatController - Received message:', {
        paperId,
        userId,
        message
      });

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      // 사용자 메시지 저장
      await this.chatService.addMessage(userId, paperId, message);

      // 논문 내용 가져오기
      const paper = await this.paperService.getPaperById(userId, paperId);
      if (!paper) {
        return reply.code(404).send({ error: "Paper not found" });
      }

      console.log('ChatController - Retrieved paper:', {
        paperId,
        content: paper.content
      });

      // 대화 초기화 (필요한 경우)
      await this.llmService.initializeConversation(JSON.stringify(paper.content));

      // OpenAI API 호출
      const response = await this.llmService.askLLM(
        message.content,
        message.blockId ? JSON.stringify(paper.content) : undefined,
        message.blockId
      );

      console.log('ChatController - OpenAI response:', response);

      // OpenAI 응답을 메시지로 저장
      if (response.choices[0].message?.content) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.choices[0].message.content,
          timestamp: Date.now(),
          blockId: message.blockId
        };

        await this.chatService.addMessage(userId, paperId, assistantMessage);
      }

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
