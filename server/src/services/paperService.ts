import { ContentTypeSchema, Paper, ContentType } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import fs from "fs/promises";
import OpenAI from "openai";

export class PaperService {
  private paperRepository: PaperRepository;
  private paperPath: string;
  private client: OpenAI;

  constructor(paperPath: string) {
    this.paperRepository = new PaperRepository();
    this.paperPath = paperPath;
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getPaper(): Promise<Paper> {
    return this.paperRepository.getPaper();
  }

  async updateSentence(blockId: string, content: string): Promise<void> {
    return this.paperRepository.updateSentence(blockId, content, await this.summarizeSentence(content), await this.findIntent(content));
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

  async askLLM(text: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: text,
          }
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

  async findIntent(text: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: `You are a helpful peer reader for academic writing. Infer a less than 5 words intent from a following sentence. Is it an argument/evidence/reasoning/benefit/shortcoming/explanation/...? Sentence: ${text}. Intent: `,
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
}
