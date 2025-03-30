import { ContentTypeSchema, Paper, ContentType, Content } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import fs from "fs/promises";
import OpenAI from "openai";
import { string } from "zod";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class PaperService {
  private paperRepository: PaperRepository;
  private paperPath: string;
  private client: OpenAI;
  private summaryCache: Map<string, string>;
  private intentCache: Map<string, string>;
  private batchSize: number = 5; // Process 5 items at a time
  private conversationHistory: Message[];

  constructor(paperPath: string) {
    this.paperRepository = new PaperRepository();
    this.paperPath = paperPath;
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.summaryCache = new Map();
    this.intentCache = new Map();
    this.conversationHistory = [];
  }

  async getPaper(): Promise<Paper> {
    return this.paperRepository.getPaper();
  }

  async updateSentence(blockId: string): Promise<void> {
    const parentId: string = this.paperRepository.findParentBlockIdByChildId(null, blockId);
    const contextValue: string = this.paperRepository.getChildrenValues(parentId, "content");
    return this.autoUpdateParentBlock(parentId, contextValue);
  }

  async autoUpdateParentBlock(blockId: string, blockContent: string) {
    await this.updateBlock(blockId, "summary", await this.summarizeText(blockContent));
    await this.updateBlock(blockId, "intent", await this.findIntent(blockContent));
  }

  async updateWhole(): Promise<void> {
    try {
      // Fetch the current paper data
      const paper = await this.paperRepository.getPaper();
      // Recursive function to update all sentences
      const updateContentRecursively = async (contentArray: any[]): Promise<void> => {
        for (const item of contentArray) {
          if (item.type === "paragraph" && item.content) {
            // Get all sentence contents from the paragraph
            const content = this.paperRepository.getChildrenValues(item["block-id"], "content");
            // Update the paragraph's summary and intent
            await this.updateBlock(item["block-id"], "summary", await this.summarizeText(content));
            await this.updateBlock(item["block-id"], "intent", await this.findIntent(content));
          }
  
          // If the item has nested content, recurse into it
          if (Array.isArray(item.content)) {
            await updateContentRecursively(item.content);
          }
        }
      };
  
      // Start the recursive update
      await updateContentRecursively(paper.content);
  
      // Save the updated paper back to the repository
      await this.savePaper(paper);
    } catch (error) {
      console.error("Error updating the whole text:", error);
      throw new Error("Failed to update the whole text");
    }
  }

  async addBlock(
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    return this.paperRepository.addBlock(parentBlockId, prevBlockId, blockType);
  }

  async updateBlock(
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: string
  ): Promise<void> {
    return this.paperRepository.updateBlock(
      targetBlockId,
      keyToUpdate,
      updatedValue
    );
  }

  /**
   * Delete a sentence
   * @param blockId ID of the sentence to delete
   */
  async deleteSentence(blockId: string): Promise<void> {
    return this.paperRepository.deleteSentence(blockId);
  }

  /**
   * Delete a block
   * @param blockId ID of the block to delete
   */
  async deleteBlock(blockId: string): Promise<void> {
    return this.paperRepository.deleteBlock(blockId);
  }

  async savePaper(paper: Paper): Promise<void> {
    try {
      await fs.writeFile(
        this.paperPath,
        JSON.stringify(paper, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error saving paper:", error);
      throw new Error("Failed to save paper");
    }
  }

  /**
   * Initialize the conversation with the paper context
   */
  async initializeConversation(): Promise<void> {
    try {
      const paper = await this.paperRepository.getPaper();
      const paperContent = this.paperRepository.getChildrenValues(paper["block-id"] || "root", "content");
      
      // Set up the initial system message with paper context
      this.conversationHistory = [
        {
          role: "system",
          content: `You are a helpful peer reader for academic writing. Here is the context of the paper you are helping with:\n\n${paperContent}\n\nPlease provide your response based on this context.`
        }
      ];
    } catch (error) {
      console.error("Error initializing conversation:", error);
      throw new Error("Failed to initialize conversation");
    }
  }

  async askLLM(text: string, renderedContent?: string): Promise<any> {
    try {
      // If conversation hasn't been initialized, initialize it
      if (this.conversationHistory.length === 0) {
        await this.initializeConversation();
      }

      // Add the user's question to the conversation history
      this.conversationHistory.push({
        role: "user",
        content: text
      });

      // If rendered content is provided, add it as additional context
      if (renderedContent) {
        this.conversationHistory.push({
          role: "system",
          content: `Here is the currently visible content in the editor:\n\n${renderedContent}\n\nPlease consider this content when providing your response.`
        });
      }

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: this.conversationHistory,
      });

      // Add the assistant's response to the conversation history
      if (response.choices[0].message?.content) {
        this.conversationHistory.push({
          role: "assistant",
          content: response.choices[0].message.content
        });
      }

      return response;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Clear the conversation history
   */
  clearConversation(): void {
    this.conversationHistory = [];
  }

  async summarizeSentence(text: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: `You are a helpful peer reader for academic writing. Extract a summary from a following sentence. Sentence: ${text}. Summary: `,
          },
        ],
      });

      const generatedText = response.choices[0].message?.content?.trim() ?? "";
      return generatedText;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  async summarizeText(text: string): Promise<string> {
    // Check cache first
    if (this.summaryCache.has(text)) {
      return this.summaryCache.get(text)!;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: `You are a helpful peer reader for academic writing. Extract a three sentence summary from a following text. Text: ${text}. Summary: `,
          },
        ],
      });

      const generatedText = response.choices[0].message?.content?.trim() ?? "";
      this.summaryCache.set(text, generatedText);
      return generatedText;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  async findIntent(text: string): Promise<string> {
    // Check cache first
    if (this.intentCache.has(text)) {
      return this.intentCache.get(text)!;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: `You are a helpful peer reader for academic writing. Infer a less than 5 words intent from a following text. Is it an argument/evidence/reasoning/benefit/shortcoming/explanation/...? Text: ${text}. Intent: `,
          },
        ],
      });

      const generatedText = response.choices[0].message?.content?.trim() ?? "";
      this.intentCache.set(text, generatedText);
      return generatedText;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Convert paper JSON back to LaTeX format
   */
  async exportToLatex(paper: Paper): Promise<string> {
    let latexContent = "";

    // Add document class and packages
    latexContent += "\\documentclass{article}\n";
    latexContent += "\\usepackage{amsmath}\n";
    latexContent += "\\usepackage{amssymb}\n";
    latexContent += "\\usepackage{graphicx}\n\n";

    // Add title
    latexContent += `\\title{${paper.title}}\n\n`;

    // Add document begin
    latexContent += "\\begin{document}\n";
    latexContent += "\\maketitle\n\n";

    // Helper function to process paragraphs
    const processParagraph = (paragraph: any): string => {
      if (!paragraph || typeof paragraph === 'string' || !Array.isArray(paragraph.content)) {
        return '';
      }

      const sentences = paragraph.content
        .filter((s: any) => s && typeof s !== 'string' && s.type === "sentence")
        .map((s: any) => s.content)
        .join(" ");
      
      return sentences ? `${sentences}\n\n` : '';
    };

    // Process each section
    for (const section of paper.content) {
      if (typeof section === 'string') continue;
      
      // Add section title
      latexContent += `\\section{${section.title}}\n\n`;

      // Process content based on type
      if (section.type === "section" && Array.isArray(section.content)) {
        for (const item of section.content) {
          if (typeof item === 'string') continue;

          if (item.type === "subsection") {
            // Handle subsection
            latexContent += `\\subsection{${item.title}}\n\n`;
            
            // Process paragraphs in subsection
            if (Array.isArray(item.content)) {
              for (const paragraph of item.content) {
                latexContent += processParagraph(paragraph);
              }
            }
          } else if (item.type === "paragraph") {
            // Handle paragraphs directly in section
            latexContent += processParagraph(item);
          }
        }
      }
    }

    // Add document end
    latexContent += "\\end{document}";

    return latexContent;
  }

  /**
   * Updates summaries and intents for all sections and subsections in the paper.
   * This function recursively traverses the paper structure and updates the summary
   * and intent of each section and subsection based on their children's content.
   */
  async updateSectionSummaries(): Promise<void> {
    try {
      const paper = await this.paperRepository.getPaper();
      const sectionsToUpdate: Array<{ id: string; content: string }> = [];

      // First, collect all sections and their content
      const collectSections = (contentArray: any[]): void => {
        for (const item of contentArray) {
          if ((item.type === "section" || item.type === "subsection") && item.content) {
            const content = this.paperRepository.getChildrenValues(item["block-id"], "content");
            sectionsToUpdate.push({ id: item["block-id"], content });
          }

          if (Array.isArray(item.content)) {
            collectSections(item.content);
          }
        }
      };

      collectSections(paper.content);

      // Process sections in batches
      for (let i = 0; i < sectionsToUpdate.length; i += this.batchSize) {
        const batch = sectionsToUpdate.slice(i, i + this.batchSize);
        const batchPromises = batch.map(async ({ id, content }) => {
          // Check cache first
          if (this.summaryCache.has(content) && this.intentCache.has(content)) {
            await this.updateBlock(id, "summary", this.summaryCache.get(content)!);
            await this.updateBlock(id, "intent", this.intentCache.get(content)!);
            return;
          }

          // If not in cache, make API calls
          const [summary, intent] = await Promise.all([
            this.summarizeText(content),
            this.findIntent(content)
          ]);

          // Update cache
          this.summaryCache.set(content, summary);
          this.intentCache.set(content, intent);

          // Update the block
          await this.updateBlock(id, "summary", summary);
          await this.updateBlock(id, "intent", intent);
        });

        // Wait for all items in the batch to complete
        await Promise.all(batchPromises);
      }

      await this.savePaper(paper);
    } catch (error) {
      console.error("Error updating section summaries:", error);
      throw new Error("Failed to update section summaries");
    }
  }
}
