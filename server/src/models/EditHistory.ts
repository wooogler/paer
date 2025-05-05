import mongoose, { Document, Schema } from 'mongoose';

export interface IEditHistory extends Document {
  paperId: mongoose.Types.ObjectId;
  blockId: string;
  authorId?: string;
  key: string;
  value: string;
}

// User model schema
const EditHistorySchema = new Schema<IEditHistory>(
    {
        paperId: { type: Schema.Types.ObjectId, required: true, ref: 'Paper' },
        blockId: { type: String, required: true },
        authorId: { type: String, required: false, ref: 'User' },
        key: { type: String, required: true },
        value: { type: String, required: true },
    }
);

EditHistorySchema.index({ paperId: 1, blockId: 1, _id: -1 });

export const EditHistory = mongoose.model<IEditHistory>('EditHistory', EditHistorySchema);