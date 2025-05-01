export type MessageRole = "user" | "system" | "assistant";

export type MessageType = "chat" | "comment";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  blockId?: string;
  messageType?: MessageType;
  userName?: string;
  userId?: string;
  viewAccess: string;
}

export interface MessageAccessList {
  "public": string[],
  "private": string[],
}
