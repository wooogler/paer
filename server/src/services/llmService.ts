import OpenAI from "openai";
import { Content } from "@paer/shared";

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

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.summaryCache = new Map();
    this.intentCache = new Map();
    this.conversationHistory = [];
  }

  async initializeConversation(paperContent: string): Promise<void> {
    try {
      // JSON 문자열을 파싱
      const content = JSON.parse(paperContent);
      
      // 콘텐츠에서 텍스트만 추출하는 재귀 함수
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
      // 에러가 발생해도 기본 시스템 메시지로 초기화
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

  async updateRenderedSummaries(block: Content): Promise<any> {
    try {
      // Recursive function to order properties in nested objects
      const orderProperties = (obj: any): any => {
        if (typeof obj !== "object" || obj === null) return obj;

        if (Array.isArray(obj)) {
          return obj.map((item) => orderProperties(item));
        }

        const orderedObj: any = {};
        // Define the order of properties
        const propertyOrder = [
          "type",
          "block-id",
          "title",
          "content",
          "summary",
          "intent",
        ];

        // Add properties in the specified order
        propertyOrder.forEach((prop) => {
          if (prop === "block-id") {
            if (obj["block-id"] !== undefined) {
              orderedObj["block-id"] = orderProperties(obj["block-id"]);
            }
          } else if (obj[prop] !== undefined) {
            orderedObj[prop] = orderProperties(obj[prop]);
          }
        });

        return orderedObj;
      };

      const orderedBlock = orderProperties(block);

      const prompt = `You are a helpful peer reader for academic writing. Analyze the following content block from paper.json and fill in all empty summary and intent fields.
Here is the block from paper.json:
${JSON.stringify(orderedBlock, null, 2)}

Please provide your response as a raw JSON object (without any markdown formatting or code blocks) with the same structure as the input, but with all empty summary and intent fields filled in. For each block:
- Summary should be 20 words or less, capturing the main content
- Intent should reflect the writer's purpose and rhetorical strategy
- For content with LaTeX commands or references, focus on the actual text content
- For chat messages or system messages, provide appropriate summaries and intents
- For sentence blocks, provide short 5-10 word summaries and clear intent statements
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
}
