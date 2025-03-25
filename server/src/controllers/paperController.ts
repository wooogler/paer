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
}
