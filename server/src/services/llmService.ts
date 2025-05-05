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
        // Limit to top 3 most relevant chunks to avoid token limit
        const similarChunks = await this.ragService.findSimilarChunks(paperId, text, 3);
        if (similarChunks.length > 0) {
          // Only include chunks with high similarity scores
          const highSimilarityChunks = similarChunks.filter(chunk => (chunk.similarity ?? 0) > 0.7);
          if (highSimilarityChunks.length > 0) {
            relevantContext = `Relevant information from the paper:\n${highSimilarityChunks.map(chunk => chunk.content).join('\n\n')}\n\n`;
          }
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

      // Add block-specific context if available and not too long
      if (renderedContent && renderedContent.length < 1000) {
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

      // Keep conversation history manageable
      if (this.conversationHistory.length > 15) {
        // Keep the first system message and last 9 messages
        this.conversationHistory = [
          this.conversationHistory[0],
          ...this.conversationHistory.slice(-14)
        ];
      }

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
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
    block: Content
  ): Promise<any> {
    try {
      // Recursive function to order properties in nested objects
      const orderProperties = (obj: any): any => {
        if (typeof obj !== "object" || obj === null) return obj;

        if (Array.isArray(obj)) {
          return obj.map((item) => orderProperties(item));
        }

        const orderedObj: any = {};
        // Define the order of properties (summary 속성 제거)
        const propertyOrder = [
          "type",
          "block-id",
          "title",
          "content",
          "intent",
        ];

        // Add properties in the specified order
        propertyOrder.forEach((prop) => {
          // sentence 타입인 경우 intent 제외, 모든 타입에서 summary 제외
          if (prop === "block-id") {
            if (obj["block-id"] !== undefined) {
              orderedObj["block-id"] = orderProperties(obj["block-id"]);
            }
          } else if (prop === "summary") {
            // summary 속성 처리하지 않음 (완전히 제거)
          } else if (prop === "intent" && obj.type === "sentence") {
            // sentence 타입인 경우 intent 처리하지 않음
          } else if (obj[prop] !== undefined) {
            orderedObj[prop] = orderProperties(obj[prop]);
          }
        });

        return orderedObj;
      };

      const orderedBlock = orderProperties(block);

      const prompt = `You are a helpful peer reader for academic writing. Analyze the following content block from paper.json and fill in all empty intent fields (ignore summary fields completely).
Here is the block from paper.json:
${JSON.stringify(orderedBlock, null, 2)}

Please provide your response as a raw JSON object (without any markdown formatting or code blocks) with the same structure as the input, but with all empty intent fields filled in. For each block:
- Intent should reflect the writer's purpose and rhetorical strategy
- For content with LaTeX commands or references, focus on the actual text content
- Skip intent for sentence blocks completely
- For blocks with nested content, consider the combined text of all child blocks`;

      console.log("OpenAI API에 보내는 프롬프트:", prompt);

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });

      const result = JSON.parse(
        response.choices[0].message?.content?.trim() ?? "{}"
      );
      console.log("OpenAI API 응답: ", JSON.stringify(result, null, 2));

      return {
        prompt,
        apiResponse: {
          model: response.model,
          usage: response.usage,
          content: response.choices[0].message?.content,
          parsedResult: result,
        },
      };
    } catch (error) {
      console.error("Error in updateRenderedSummaries:", error);
      throw error;
    }
  }

  async updateBlockIntent(
    authorId: string,
    paperId: string,
    blockId: string,
    renderedContent: string
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
      console.error("Error in updateBlockIntent:", error);
      throw error;
    }
  }
}
