import { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "../services/chatService";
import { ChatMessage, MessageAccessList } from "../types/chat";
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
   * Get chat history for a specific paper
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
   * Get messages connected to a specific block ID
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
   * Add a new message and save OpenAI response
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

      // Before saving the message, validate messageType and senderId
      // if messageType is not specified, set it to "chat"
      if (!message.messageType) {
        message.messageType = "chat";
      }
      // // if senderId is not specified, set it to userId
      // if (!message.senderId) {
      //   message.senderId = userId;
      // }

      // Save user message
      await this.chatService.addMessage(userId, paperId, message);

      // Get paper content
      const paper = await this.paperService.getPaperById(userId, paperId);
      if (!paper) {
        return reply.code(404).send({ error: "Paper not found" });
      }

      console.log('ChatController - Retrieved paper:', {
        paperId,
        content: paper.content
      });

      // if messageType is "chat", proceed with OpenAI API
      // otherwise, return success
      if (message.messageType == "comment") {
        return { success: true };
      }
      
      // Initialize conversation (if needed)
      await this.llmService.initializeConversation(JSON.stringify(paper.content));

      // Call OpenAI API
      const response = await this.llmService.askLLM(
        message.content,
        message.blockId ? JSON.stringify(paper.content) : undefined,
        message.blockId
      );

      console.log('ChatController - OpenAI response:', response);

      // Save OpenAI response as message
      if (response.choices[0].message?.content) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.choices[0].message.content,
          timestamp: Date.now(),
          blockId: message.blockId,
          userName: "Assistant"
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
   * Save multiple messages at once
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
   * Delete all messages
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
   * Delete a specific message
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

  /**
   * Update message access
   */
  async updateMessageAccess(
    request: FastifyRequest<{
      Params: { paperId: string };
      Body: { userId: string; messageAccessList: MessageAccessList};
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId } = request.params;
      const { userId, messageAccessList } = request.body;

      if (!paperId || !userId) {
        return reply.code(400).send({ error: "paperId and userId are required" });
      }

      await this.chatService.updateMessageAccess(userId, paperId, messageAccessList);
      return { success: true };
    } catch (error) {
      console.error("Error updating message access:", error);
      return reply.code(500).send({ error: "Failed to update message access" });
    }
  }
}
