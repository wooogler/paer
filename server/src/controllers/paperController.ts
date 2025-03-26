import { FastifyRequest, FastifyReply } from "fastify";
import { PaperService } from "../services/paperService";
import { PaperSchema, ContentTypeSchema } from "@paer/shared";
import { OpenAI } from "openai";

export class PaperController {
  private paperService: PaperService;
  private client: OpenAI;

  constructor() {
    this.paperService = new PaperService("./data/paper.json");
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
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

  async addBlock(
    request: FastifyRequest<{
      Body: {
        parentBlockId: string | null;
        prevBlockId: string | null;
        blockType: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { parentBlockId, prevBlockId, blockType } = request.body;
      // blockId can be null (to add at the beginning of a paragraph)
      const newBlockId = await this.paperService.addBlock(
        parentBlockId,
        prevBlockId,
        blockType
      );
      return { success: true, blockId: newBlockId };
    } catch (error) {
      console.error("Error in addSentence:", error);
      return reply.code(500).send({ error: "Failed to add new block" });
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

  async askLLM(
    request: FastifyRequest<{ Body: { text: string } }>,
    reply: FastifyReply
  ) {
    const { text } = request.body;

    try {
      const response = await this.client.completions.create({
        model: "text-davinci-003",
        prompt: text,
        max_tokens: 100,
      });

      return reply.send(response);
    } catch (error) {
      const errorMessage = (error as Error).message;
      return reply.status(500).send({ error: errorMessage });
    }
  }

  async updateSentenceIntent(
    request: FastifyRequest<{
      Body: { blockId: string; intent: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { blockId, intent } = request.body;

      // Validate input
      if (!blockId || !intent) {
        return reply
          .code(400)
          .send({ error: "blockId and intent are required" });
      }

      // Get current paper content
      const paper = await this.paperService.getPaper();

      // Helper function to find and update sentence
      const findAndUpdateSentence = (content: any): boolean => {
        if (content["block-id"] === blockId && content.type === "sentence") {
          content.intent = intent;
          return true;
        }

        if (Array.isArray(content.content)) {
          for (const child of content.content) {
            if (findAndUpdateSentence(child)) return true;
          }
        }

        return false;
      };

      // Try to find and update the sentence
      const found = findAndUpdateSentence(paper);
      if (!found) {
        return reply.code(404).send({ error: "Sentence not found" });
      }

      // Save updated paper
      await this.paperService.savePaper(paper);

      return reply.send({ success: true });
    } catch (error) {
      console.error("Error updating sentence intent:", error);
      return reply
        .code(500)
        .send({ error: "Failed to update sentence intent" });
    }
  }

  async updateSentenceSummary(
    request: FastifyRequest<{
      Body: { blockId: string; summary: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { blockId, summary } = request.body;

      // Validate input
      if (!blockId || !summary) {
        return reply
          .code(400)
          .send({ error: "blockId and summary are required" });
      }

      // Get current paper content
      const paper = await this.paperService.getPaper();

      // Helper function to find and update sentence
      const findAndUpdateSentence = (content: any): boolean => {
        if (content["block-id"] === blockId && content.type === "sentence") {
          content.summary = summary;
          return true;
        }

        if (Array.isArray(content.content)) {
          for (const child of content.content) {
            if (findAndUpdateSentence(child)) return true;
          }
        }

        return false;
      };

      // Try to find and update the sentence
      const found = findAndUpdateSentence(paper);
      if (!found) {
        return reply.code(404).send({ error: "Sentence not found" });
      }

      // Save updated paper
      await this.paperService.savePaper(paper);

      return reply.send({ success: true });
    } catch (error) {
      console.error("Error updating sentence summary:", error);
      return reply
        .code(500)
        .send({ error: "Failed to update sentence summary" });
    }
  }
}
