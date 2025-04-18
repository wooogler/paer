import mongoose, { Document, Schema } from 'mongoose';
import { Paper as SharedPaper, ContentSchema } from '@paer/shared';

export interface IPaper extends Document {
  userId: string | mongoose.Types.ObjectId;
  title: string;
  content: SharedPaper;
  collaborators: (string | mongoose.Types.ObjectId)[];
  createdAt: Date;
  updatedAt: Date;
}

const PaperSchema = new Schema<IPaper>(
  {
    userId: {
      type: Schema.Types.Mixed,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      default: 'Untitled Paper'
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function(value: any) {
          try {
            ContentSchema.parse(value);
            return true;
          } catch (error) {
            return false;
          }
        },
        message: props => `${props.value} is not a valid paper content structure!`
      }
    },
    collaborators: [{
      type: Schema.Types.Mixed,
      ref: 'User'
    }]
  },
  {
    timestamps: true
  }
);

export const Paper = mongoose.model<IPaper>('Paper', PaperSchema, 'papers'); 