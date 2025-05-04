import OpenAI from "openai";
import { Content } from "@paer/shared";
import { PaperModel } from '../models/Paper';
import { PaperRepository } from '../repositories/paperRepository';
import { RAGService } from './ragService';

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  blockId?: string;
};

export class LLMService {
  private client: OpenAI;
  private summaryCache: Map<string, string>;
  private intentCache: Map<string, string>;
  private conversationHistory: Message[];
  private paperRepository: PaperRepository;
  private ragService: RAGService;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.summaryCache = new Map();
    this.intentCache = new Map();
    this.conversationHistory = [];
    this.paperRepository = new PaperRepository();
    this.ragService = new RAGService();
  }

  async initializeConversation(paperContent: string): Promise<void> {
    try {
      // Parse JSON string
      const content = JSON.parse(paperContent);
      
      // Recursive function to extract text from content
      const extractText = (node: any): string => {
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(extractText).join(' ');
        if (node && typeof node === 'object') {
          if (node.content) return extractText(node.content);
          return Object.values(node).map(extractText).join(' ');
        }
        return '';
      };

      const paperText = extractText(content);
      
      this.conversationHistory = [
        {
          role: "system",
          content: `You are a helpful peer reader for academic writing. The paper reads:\n\n${paperText}\n\n.Please respond to user questions based on local context. Refer to the paper if needed.`,
        },
      ];
    } catch (error) {
      console.error("Error initializing conversation:", error);
      // Initialize with default system message even if error occurs
      this.conversationHistory = [
        {
          role: "system",
          content: "You are a helpful peer reader for academic writing. Please respond to user questions based on local context. Refer to the paper if needed.",
        },
      ];
    }
  }

  async askLLM(
    text: string,
    renderedContent?: string,
    blockId?: string,
    paperId?: string,
    userId?: string
  ): Promise<any> {
    try {
      // If we have a paperId, use RAG to retrieve relevant information
      let relevantContext = '';
      if (paperId) {
        const similarChunks = await this.ragService.findSimilarChunks(paperId, text);
        if (similarChunks.length > 0) {
          relevantContext = `Relevant information from the paper:\n${similarChunks.map(chunk => chunk.content).join('\n\n')}\n\n`;
        }
      }

      // Add relevant context from RAG if available
      if (relevantContext) {
        this.conversationHistory.push({
          role: "system",
          content: relevantContext,
          blockId,
        });
      }

      // Add block-specific context if available
      if (renderedContent) {
        this.conversationHistory.push({
          role: "system",
          content: `Context from the current block:\n${renderedContent}`,
          blockId,
        });
      }

      // Add user's question
      this.conversationHistory.push({
        role: "user",
        content: text,
        blockId,
      });

      const response = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant. Use the provided context to answer questions accurately. If the context doesn't contain relevant information, say so. Always cite specific parts of the text when possible."
          },
          ...this.conversationHistory
        ],
        temperature: 0.7,
      });
      
      if (response.choices[0].message?.content) {
        this.conversationHistory.push({
          role: "assistant",
          content: response.choices[0].message.content,
          blockId,
        });
      }

      return response;
    } catch (error) {
      console.error("Error in askLLM:", error);
      throw error;
    }
  }

  clearConversation(): void {
    this.conversationHistory = [];
  }

  async updateRenderedSummaries(
    authorId: string,
    paperId: string,
    renderedContent: string,
    blockId: string
  ): Promise<any> {
    try {

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful peer reader for academic writing. Describe the intent of the text in less than 10 words.`,
          },
          { role: "user", content: `Text:\n${renderedContent}` },
          { role: "system", content: "Intent:\n"}
        ],
        temperature: 0,
      });

      return this.paperRepository.updateBlock(authorId, paperId, blockId, "intent", response.choices[0].message.content || "");
    } catch (error) {
      console.error("Error in updateRenderedSummaries:", error);
      throw error;
    }
  }
}
