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
            // Validate each content item recursively
            const validateContent = (content: any) => {
              if (!content || typeof content !== 'object') return false;
              
              // Check required fields
              if (!content.type || !content['block-id']) return false;
              
              // If content has nested content array, validate each item
              if (Array.isArray(content.content)) {
                return content.content.every(validateContent);
              }
              
              return true;
            };
            
            // Validate the entire content array
            return Array.isArray(value) && value.every(validateContent);
          } catch (error) {
            console.error('Content validation error:', error);
            return false;
          }
        },
        message: (props: any) => `Invalid content structure: ${JSON.stringify(props.value)}`
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