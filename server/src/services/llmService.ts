import OpenAI from "openai";
import { Content } from "@paer/shared";
import { PaperModel } from '../models/Paper';
import { PaperRepository } from '../repositories/paperRepository';

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

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.summaryCache = new Map();
    this.intentCache = new Map();
    this.conversationHistory = [];
    this.paperRepository = new PaperRepository();
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
          content: `You are a helpful peer reader for academic writing. Here is the context of the paper you are helping with:\n\n${paperText}\n\nPlease provide your response based on this context.`,
        },
      ];
    } catch (error) {
      console.error("Error initializing conversation:", error);
      // Initialize with default system message even if error occurs
      this.conversationHistory = [
        {
          role: "system",
          content: "You are a helpful peer reader for academic writing. Please provide your response based on the user's question.",
        },
      ];
    }
  }

  async askLLM(
    text: string,
    renderedContent?: string,
    blockId?: string
  ): Promise<any> {
    try {
      console.log('OpenAI Input:', {
        text,
        renderedContent,
        blockId,
        conversationHistory: this.conversationHistory
      });

      this.conversationHistory.push({
        role: "user",
        content: text,
        blockId,
      });

      if (renderedContent) {
        this.conversationHistory.push({
          role: "system",
          content: `Here is the currently visible content in the editor:\n\n${renderedContent}\n\nPlease consider this content when providing your response.`,
          blockId,
        });
      }

      console.log('OpenAI Request:', {
        model: "gpt-4o",
        messages: this.conversationHistory
      });

      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: this.conversationHistory,
      });
      
      console.log('OpenAI Response:', response);
      
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
      const prompt = `You are a helpful peer reader for academic writing. Analyze the following content and provide an intent. The intent should be a single sentence that captures the main idea of the content.
Content: ${renderedContent}

Please provide your response as a JSON object with the following structure:
{
  "intent": "The writer's purpose and rhetorical strategy"
}

IMPORTANT: Return ONLY the JSON object, without any markdown formatting or additional text.`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });

      // Clean the response by removing any markdown formatting
      const rawResponse = response.choices[0].message?.content?.trim() ?? "{}";
      const cleanedResponse = rawResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      let result;
      try {
        result = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Error parsing LLM response:", parseError);
        console.error("Raw response:", rawResponse);
        console.error("Cleaned response:", cleanedResponse);
        throw new Error("Failed to parse LLM response");
      }
      console.log("result:::", result.intent);

      return this.paperRepository.updateBlock(authorId, paperId, blockId, "intent", result.intent);
    } catch (error) {
      console.error("Error in updateRenderedSummaries:", error);
      throw error;
    }
  }
}
