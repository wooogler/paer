import mongoose, { Document, Schema } from 'mongoose';
import { MessageRole, MessageType } from '../types/chat';

export interface IMessage {
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

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;
  paperId: mongoose.Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  id: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'system', 'assistant']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Number,
    required: true,
    default: () => Date.now()
  },
  blockId: {
    type: String
  },
  messageType: {
    type: String,
    enum: ['chat', 'comment', 'edit'],
    default: 'chat'
  },
  userName: {
    type: String,
    required: true
  },
  viewAccess: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },
  userId: {
    type: String,
    required: true
  },
  previousSentence: {
    type: String
  },
  updatedSentence: {
    type: String
  }
}, { _id: false });

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    paperId: {
      type: Schema.Types.ObjectId,
      ref: 'Paper',
      required: true
    },
    messages: [MessageSchema]
  },
  {
    timestamps: true
  }
);

// 복합 인덱스 생성: 사용자별 문서별 채팅 조회를 빠르게 하기 위함
ChatSchema.index({ userId: 1, paperId: 1 });

export const Chat = mongoose.model<IChat>('Chat', ChatSchema); 