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
}
