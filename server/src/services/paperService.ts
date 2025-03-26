import { ContentTypeSchema, Paper, ContentType } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import fs from "fs/promises";

export class PaperService {
  private paperRepository: PaperRepository;
  private paperPath: string;

  constructor(paperPath: string) {
    this.paperRepository = new PaperRepository();
    this.paperPath = paperPath;
  }

  async getPaper(): Promise<Paper> {
    return this.paperRepository.getPaper();
  }

  async updateSentenceContent(blockId: string, content: string): Promise<void> {
    return this.paperRepository.updateSentenceContent(blockId, content);
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
}
