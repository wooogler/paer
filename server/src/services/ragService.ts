import OpenAI from 'openai';
import { DocumentChunk, IDocumentChunk } from '../models/DocumentChunk';
import { v4 as uuidv4 } from 'uuid';

export class RAGService {
  private openai: OpenAI;
  private chunkSize: number = 1000;
  private chunkOverlap: number = 200;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private extractText(content: any): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(item => this.extractText(item)).join(' ');
    }
    if (content && typeof content === 'object') {
      if (content.content) return this.extractText(content.content);
      return Object.values(content)
        .map(value => this.extractText(value))
        .join(' ');
    }
    return '';
  }

  private splitIntoChunks(text: string, blockId?: string): { content: string; startIndex: number; endIndex: number; blockId?: string }[] {
    const chunks: { content: string; startIndex: number; endIndex: number; blockId?: string }[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + this.chunkSize;
      if (end >= text.length) {
        chunks.push({
          content: text.slice(start),
          startIndex: start,
          endIndex: text.length,
          blockId
        });
        break;
      }

      // Try to find a good breaking point
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + this.chunkSize / 2) {
        end = breakPoint + 1;
      }

      chunks.push({
        content: text.slice(start, end),
        startIndex: start,
        endIndex: end,
        blockId
      });

      start = end - this.chunkOverlap;
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log("Generating embedding for text:", text);
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  public async processPaper(paperId: string, content: any): Promise<void> {
    try {
      // Extract text from content
      const paperText = this.extractText(content);

      // Split into chunks
      const chunks = this.splitIntoChunks(paperText);

      // Process chunks in parallel
      const chunkPromises = chunks.map(async (chunk) => {
        const embedding = await this.generateEmbedding(chunk.content);
        
        const documentChunk: Partial<IDocumentChunk> = {
          paperId,
          chunkId: uuidv4(),
          content: chunk.content,
          embedding,
          metadata: {
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            blockId: chunk.blockId
          }
        };
        
        return documentChunk;
      });

      const documentChunks = await Promise.all(chunkPromises);

      // Save chunks to database
      await DocumentChunk.insertMany(documentChunks);
    } catch (error) {
      console.error('Error processing paper:', error);
      throw error;
    }
  }

  public async findSimilarChunks(paperId: string, query: string, limit: number = 3): Promise<IDocumentChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Find similar chunks using vector similarity
      const similarChunks = await DocumentChunk.aggregate([
        {
          $match: { paperId }
        },
        {
          $addFields: {
            similarity: {
              $reduce: {
                input: { $range: [0, { $size: "$embedding" }] },
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $multiply: [
                        { $arrayElemAt: ["$embedding", "$$this"] },
                        { $arrayElemAt: [queryEmbedding, "$$this"] }
                      ]
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $sort: { similarity: -1 }
        },
        {
          $limit: limit
        }
      ]);

      return similarChunks;
    } catch (error) {
      console.error('Error finding similar chunks:', error);
      throw error;
    }
  }
} 