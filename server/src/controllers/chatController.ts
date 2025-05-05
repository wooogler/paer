import { FastifyRequest, FastifyReply } from "fastify";
import { ChatService } from "../services/chatService";
import { ChatMessage, MessageAccessList } from "../types/chat";
import { PaperService } from "../services/paperService";
import { LLMService } from "../services/llmService";
import { UserService } from "../services/userService";

export class ChatController {
  private chatService: ChatService;
  private paperService: PaperService;
  private llmService: LLMService;
  private userService: UserService;

  constructor() {
    this.chatService = new ChatService();
    this.paperService = new PaperService();
    this.llmService = new LLMService();
    this.userService = new UserService();
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
      const { userId, ...messageData } = request.body;

      console.log('ChatController - Received message:', {
        paperId,
        userId,
        messageData
      });

      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }

      // Get user information
      const user = await this.userService.getUserById(userId);
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      // Before saving the message, validate messageType and senderId
      // if messageType is not specified, set it to "chat"
      if (!messageData.messageType) {
        messageData.messageType = "chat";
      }

      // Create message object with userId and username
      const message: ChatMessage = {
        ...messageData,
        userId: userId,
        userName: user.username
      };

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

      let renderedContent = "";

      // find the content of a block by blockId
      if (message.blockId) {
        const block = await this.paperService.findBlockById(userId, paperId, message.blockId);
        if (block && block.content) {
          if (Array.isArray(block.content)) {
            renderedContent = JSON.stringify(block.content);
          } else {
            renderedContent = block.content;
          }
        }
      }

      // Call OpenAI API
      const response = await this.llmService.askLLM(
        message.content,
        message.blockId ? renderedContent : undefined,
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
          userName: "Assistant",
          userId: userId,
          viewAccess: "private",
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

      // Get all messages from the chat
      const chat = await this.chatService.getMessages(userId, paperId);
      if (!chat) {
        return reply.code(404).send({ error: "Chat not found" });
      }

      // Verify that all messages in the access list belong to the requesting user
      const allMessageIds = [...messageAccessList.private, ...messageAccessList.public];
      const invalidMessages = allMessageIds.filter(messageId => {
        const message = chat.find(msg => msg.id === messageId);
        return !message || message.userId !== userId;
      });

      if (invalidMessages.length > 0) {
        return reply.code(403).send({ 
          error: "Cannot update access for messages that don't belong to you",
          invalidMessageIds: invalidMessages
        });
      }

      await this.chatService.updateMessageAccess(userId, paperId, messageAccessList);
      return { success: true };
    } catch (error) {
      console.error("Error updating message access:", error);
      return reply.code(500).send({ error: "Failed to update message access" });
    }
  }

  /**
   * Summarize messages related to a block
   */
  async summarizeMessages(
    request: FastifyRequest<{
      Body: { messages: ChatMessage[], blockId: string, paperId?: string, userId?: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { messages, blockId, paperId, userId } = request.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return reply.code(400).send({ error: "Valid messages array is required" });
      }

      if (!blockId) {
        return reply.code(400).send({ error: "blockId is required" });
      }

      // 메시지를 시간 순서대로 정렬 (오래된 메시지부터)
      const sortedMessages = [...messages].sort((a, b) => 
        (a.timestamp || 0) - (b.timestamp || 0)
      );

      // Format messages for OpenAI - "userName: [messageType] messageContent" 형식으로 변경
      const formattedMessages = sortedMessages.map(msg => {
        // role이 assistant나 system인 경우 무조건 'AI'로 설정
        const userName = (msg.role === 'system' || msg.role === 'assistant') 
          ? 'AI' 
          : (msg.userName || 'User');
        const messageType = msg.messageType || 'chat';
        
        // Edit 타입일 경우 previousSentence와 updatedSentence를 사용
        if (messageType === 'edit' && msg.previousSentence && msg.updatedSentence) {
          return `${userName}: [${messageType}] Changed "${msg.previousSentence}" to "${msg.updatedSentence}"`;
        }
        
        return `${userName}: [${messageType}] ${msg.content}`;
      }).join('\n');

      // Call OpenAI for summarization
      const summaryPrompt = `Below are a series of messages related to a specific block of text in a document.
        Please summarize the activity and key points discussed in 1-2 concise sentences.
        
<Messages>
${formattedMessages}
</Messages>
      `;

      const response = await this.llmService.summarize(summaryPrompt);
      
      if (!response || !response.choices || !response.choices[0].message) {
        throw new Error("Invalid response from OpenAI");
      }

      const summary = response.choices[0].message.content.trim();

      // 블록의 summary 필드에 요약 결과 저장 (paperId와 userId가 제공된 경우)
      if (paperId && userId && blockId) {
        try {
          await this.paperService.updateBlock(userId, paperId, blockId, "summary", summary);
        } catch (updateError) {
          console.error("Error updating block summary:", updateError);
          // 요약은 성공했지만 저장에 실패했다는 것을 클라이언트에 알림
          return { 
            success: true, 
            summary, 
            summaryUpdated: false, 
            error: "Failed to update block summary in database" 
          };
        }
      }

      return { success: true, summary, summaryUpdated: true };
    } catch (error) {
      console.error("Error summarizing messages:", error);
      return reply.code(500).send({ error: "Failed to summarize messages" });
    }
  }
}
