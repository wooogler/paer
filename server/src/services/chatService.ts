import { ChatRepository } from "../repositories/chatRepository";
import { ChatMessage } from "../types/chat";

export class ChatService {
  private chatRepository: ChatRepository;

  constructor() {
    this.chatRepository = new ChatRepository();
  }

  /**
   * 모든 채팅 메시지를 가져옵니다.
   */
  async getMessages(): Promise<ChatMessage[]> {
    return this.chatRepository.getMessages();
  }

  /**
   * 특정 블록 ID에 연결된 메시지들을 가져옵니다.
   */
  async getMessagesByBlockId(blockId: string): Promise<ChatMessage[]> {
    return this.chatRepository.getMessagesByBlockId(blockId);
  }

  /**
   * 새로운 메시지를 추가합니다.
   */
  async addMessage(message: ChatMessage): Promise<void> {
    await this.chatRepository.addMessage(message);
  }

  /**
   * 모든 메시지를 저장합니다.
   */
  async saveMessages(messages: ChatMessage[]): Promise<void> {
    await this.chatRepository.saveMessages(messages);
  }

  /**
   * 모든 메시지를 삭제합니다.
   */
  async clearMessages(): Promise<void> {
    await this.chatRepository.clearMessages();
  }

  /**
   * 특정 ID의 메시지를 삭제합니다.
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.chatRepository.deleteMessageById(messageId);
  }
}
