import { Paper } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";

export class PaperService {
  private paperRepository: PaperRepository;

  constructor() {
    this.paperRepository = new PaperRepository();
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

  /**
   * 문장 삭제
   * @param blockId 삭제할 문장의 ID
   */
  async deleteSentence(blockId: string): Promise<void> {
    return this.paperRepository.deleteSentence(blockId);
  }
}
