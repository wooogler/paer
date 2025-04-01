import fs from "fs";
import path from "path";
import { ChatMessage } from "../types/chat";

export class ChatRepository {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(__dirname, "../../data/chat.json");
    this.ensureFileExists();
  }

  private ensureFileExists(): void {
    // 파일이 존재하지 않으면 기본 구조로 생성
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({ messages: [] }, null, 2),
        "utf-8"
      );
    }
  }

  async getMessages(): Promise<ChatMessage[]> {
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      return data.messages || [];
    } catch (error) {
      console.error("Failed to read chat data:", error);
      return [];
    }
  }

  async saveMessages(messages: ChatMessage[]): Promise<void> {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify({ messages }, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error saving chat messages:", error);
      throw new Error("Failed to save chat messages");
    }
  }

  async addMessage(message: ChatMessage): Promise<void> {
    try {
      const messages = await this.getMessages();
      messages.push(message);
      await this.saveMessages(messages);
    } catch (error) {
      console.error("Error adding chat message:", error);
      throw new Error("Failed to add chat message");
    }
  }

  async clearMessages(): Promise<void> {
    try {
      await this.saveMessages([]);
    } catch (error) {
      console.error("Error clearing chat messages:", error);
      throw new Error("Failed to clear chat messages");
    }
  }

  async getMessagesByBlockId(blockId: string): Promise<ChatMessage[]> {
    try {
      const messages = await this.getMessages();
      return messages.filter((message) => message.blockId === blockId);
    } catch (error) {
      console.error("Error getting messages by blockId:", error);
      throw new Error("Failed to get messages by blockId");
    }
  }

  async deleteMessageById(messageId: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const updatedMessages = messages.filter(
        (message) => message.id !== messageId
      );
      await this.saveMessages(updatedMessages);
    } catch (error) {
      console.error("Error deleting message:", error);
      throw new Error("Failed to delete message");
    }
  }
}
