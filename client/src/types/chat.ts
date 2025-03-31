export type MessageRole = "user" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  blockId?: string;
}
