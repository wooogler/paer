import { ChatRepository } from "../repositories/chatRepository";
import { ChatMessage, MessageAccessList } from "../types/chat";

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  /**
   * Get all messages for a specific user and document
   */
  async getMessages(userId: string, paperId: string): Promise<ChatMessage[]> {
    return this.chatRepository.getMessages(userId, paperId);
  }

  /**
   * Get messages linked to a specific block ID
   */
  async getMessagesByBlockId(userId: string, paperId: string, blockId: string): Promise<ChatMessage[]> {
    return this.chatRepository.getMessagesByBlockId(userId, paperId, blockId);
  }

  /**
   * Add a new message
   */
  async addMessage(userId: string, paperId: string, message: ChatMessage): Promise<void> {
    await this.chatRepository.addMessage(userId, paperId, message);
  }

  /**
   * Save all messages
   */
  async saveMessages(userId: string, paperId: string, messages: ChatMessage[]): Promise<void> {
    await this.chatRepository.saveMessages(userId, paperId, messages);
  }

  /**
   * Delete all messages
   */
  async clearMessages(userId: string, paperId: string): Promise<void> {
    await this.chatRepository.clearMessages(userId, paperId);
  }

  /**
   * Delete a specific message by ID
   */
  async deleteMessage(userId: string, paperId: string, messageId: string): Promise<void> {
    await this.chatRepository.deleteMessageById(userId, paperId, messageId);
  }

  /**
   * Update message access
   */
  async updateMessageAccess(userId: string, paperId: string, messageAccessList: MessageAccessList): Promise<void> {
    await this.chatRepository.updateMessageAccess(userId, paperId, messageAccessList);
  }
}

