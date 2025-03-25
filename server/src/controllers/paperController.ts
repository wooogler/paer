import { FastifyRequest, FastifyReply } from "fastify";
import { PaperService } from "../services/paperService";
import { PaperSchema } from "@paer/shared";

export class PaperController {
  private paperService: PaperService;

  constructor() {
    this.paperService = new PaperService();
  }

  async getPaper(request: FastifyRequest, reply: FastifyReply): Promise<any> {
    try {
      const paper = await this.paperService.getPaper();

      // Validate data
      const validatedPaper = PaperSchema.parse(paper);

      return validatedPaper;
    } catch (error) {
      console.error("Error in getPaper:", error);
      return reply.code(500).send({ error: "Failed to get paper data" });
    }
  }

  async updateSentence(
    request: FastifyRequest<{ Body: { blockId: string; content: string } }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { blockId, content } = request.body;

      if (!blockId || !content) {
        return reply.code(400).send({ error: "Missing blockId or content" });
      }

      await this.paperService.updateSentenceContent(blockId, content);

      return { success: true };
    } catch (error) {
      console.error("Error in updateSentence:", error);
      return reply
        .code(500)
        .send({ error: "Failed to update sentence content" });
    }
  }

  async addSentence(
    request: FastifyRequest<{ Body: { blockId: string | null } }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { blockId } = request.body;

      // blockId can be null (to add at the beginning of a paragraph)
      await this.paperService.addSentence(blockId);

      return { success: true };
    } catch (error) {
      console.error("Error in addSentence:", error);
      return reply.code(500).send({ error: "Failed to add new sentence" });
    }
  }

  /**
   * 문장 삭제
   */
  async deleteSentence(
    request: FastifyRequest<{ Params: { blockId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { blockId } = request.params;

      if (!blockId) {
        return reply.code(400).send({ error: "Missing blockId" });
      }

      await this.paperService.deleteSentence(blockId);
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error("Error deleting sentence:", error);
      return reply.code(500).send({ error: "Failed to delete sentence" });
    }
  }
}
