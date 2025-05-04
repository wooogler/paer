import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentChunk extends Document {
  paperId: string;
  chunkId: string;
  content: string;
  embedding: number[];
  metadata: {
    startIndex: number;
    endIndex: number;
    blockId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DocumentChunkSchema = new Schema<IDocumentChunk>({
  paperId: { type: String, required: true, index: true },
  chunkId: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  embedding: { type: [Number], required: true },
  metadata: {
    startIndex: { type: Number, required: true },
    endIndex: { type: Number, required: true },
    blockId: { type: String }
  }
}, {
  timestamps: true
});

// Create index for vector similarity search
DocumentChunkSchema.index({ paperId: 1, embedding: 1 });

export const DocumentChunk = mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema); 