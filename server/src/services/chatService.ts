import { ChatRepository } from "../repositories/chatRepository";
import { ChatMessage } from "../types/chat";

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  /**
   * 특정 사용자와 문서에 대한 모든 메시지를 가져옵니다.
   */
  async getMessages(userId: string, paperId: string): Promise<ChatMessage[]> {
    return this.chatRepository.getMessages(userId, paperId);
  }

  /**
   * 특정 블록 ID에 연결된 메시지들을 가져옵니다.
   */
  async getMessagesByBlockId(userId: string, paperId: string, blockId: string): Promise<ChatMessage[]> {
    return this.chatRepository.getMessagesByBlockId(userId, paperId, blockId);
  }

  /**
   * 새로운 메시지를 추가합니다.
   */
  async addMessage(userId: string, paperId: string, message: ChatMessage): Promise<void> {
    await this.chatRepository.addMessage(userId, paperId, message);
  }

  /**
   * 모든 메시지를 저장합니다.
   */
  async saveMessages(userId: string, paperId: string, messages: ChatMessage[]): Promise<void> {
    await this.chatRepository.saveMessages(userId, paperId, messages);
  }

  /**
   * 모든 메시지를 삭제합니다.
   */
  async clearMessages(userId: string, paperId: string): Promise<void> {
    await this.chatRepository.clearMessages(userId, paperId);
  }

  /**
   * 특정 ID의 메시지를 삭제합니다.
   */
  async deleteMessage(userId: string, paperId: string, messageId: string): Promise<void> {
    await this.chatRepository.deleteMessageById(userId, paperId, messageId);
  }
}
