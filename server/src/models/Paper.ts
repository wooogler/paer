import mongoose, { Schema } from 'mongoose';
import { Paper, PaperSchema } from '@paer/shared/schemas/paperSchema';

// Mongoose 문서 타입 정의 (타입스크립트용)
export interface PaperDocument extends Omit<Paper, 'createdAt' | 'updatedAt' | '_id'>, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

const PaperMongooseSchema = new Schema(
  {
    authorId: {
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
            // Zod 스키마로 유효성 검증
            PaperSchema.parse(value);
            return true;
          } catch (error) {
            return false;
          }
        },
        message: (props: any) => `${props.value} is not a valid paper content structure!`
      }
    },
    collaboratorIds: [{
      type: Schema.Types.Mixed,
      ref: 'User'
    }],
    summary: {
      type: String,
      default: ''
    },
    intent: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'paper'
    },
    version: {
      type: Number,
      default: 1
    },
    'block-id': {
      type: String
    }
  },
  {
    timestamps: true
  }
);

export const PaperModel = mongoose.model<PaperDocument>('Paper', PaperMongooseSchema, 'papers'); 