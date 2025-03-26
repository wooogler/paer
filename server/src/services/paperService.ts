import { ContentTypeSchemaEnum, Paper } from "@paer/shared";
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

  async addSentence(blockId: string | null): Promise<void> {
    return this.paperRepository.addSentence(blockId);
  }

  async addBlock(parentBlockId: string | null, prevBlockId: string | null, blockType: ContentTypeSchemaEnum): Promise<string> {
    return this.paperRepository.addBlock(parentBlockId, prevBlockId, blockType);
  }

  /**
   * 문장 삭제
   * @param blockId 삭제할 문장의 ID
   */
  async deleteSentence(blockId: string): Promise<void> {
    return this.paperRepository.deleteSentence(blockId);
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
