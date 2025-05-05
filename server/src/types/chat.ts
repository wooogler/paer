export type MessageRole = "user" | "system" | "assistant";

export type MessageType = "chat" | "comment" | "edit";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  blockId?: string;
  messageType?: MessageType;
  userName: string;
  userId: string;
  viewAccess: string;
  previousSentence?: string;
  updatedSentence?: string;
}

export interface MessageAccessList {
  "public": string[],
  "private": string[],
}
