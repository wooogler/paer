export type MessageRole = "user" | "system" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  blockId?: string;
}
