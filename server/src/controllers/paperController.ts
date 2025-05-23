import { FastifyRequest, FastifyReply } from "fastify";
import { LLMService } from "../services/llmService";
import { ContentType, PaperSchema, Paper } from "@paer/shared";
import { PaperService } from "../services/paperService";

export class PaperController {
  private paperService: PaperService;
  private llmService: LLMService;

  constructor() {
    this.paperService = new PaperService("./data/paper.json");
    this.llmService = new LLMService();
  }

  /**
   * Retrieves the current paper data from the service layer and validates it against the schema.
   * This endpoint serves as the main data source for the paper's content structure.
   *
   * @param request - Fastify request object (unused in this function)
   * @param reply - Fastify reply object for sending responses
   * @returns The validated paper data structure
   * @throws {Error} If paper data cannot be retrieved or fails validation
   *
   * @example
   * // Response structure
   * {
   *   title: string,
   *   content: Array<{
   *     type: "section" | "subsection" | "paragraph" | "sentence",
   *     "block-id": string,
   *     content: string | Array<...>,
   *     summary?: string,
   *     intent?: string,
   *     title?: string
   *   }>
   * }
   */
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
    request: FastifyRequest<{
      Body: {
        blockId: string;
        content: string;
        summary: string;
        intent: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { blockId, content, summary, intent } = request.body;

      if (!blockId || !content) {
        return reply.code(400).send({ error: "Missing blockId or content" });
      }

      // Get current paper content
      const paper = await this.paperService.getPaper();

      // Helper function to find and update sentence
      const findAndUpdateSentence = (obj: any): boolean => {
        if (obj["block-id"] === blockId && obj.type === "sentence") {
          obj.content = content; // Update with the new content from request
          obj.summary = summary; // Update with the new summary from request
          obj.intent = intent; // Update with the new intent from request
          return true;
        }

        if (Array.isArray(obj.content)) {
          for (const child of obj.content) {
            if (findAndUpdateSentence(child)) return true;
          }
        }

        return false;
      };

      // Try to find and update the sentence
      const found = findAndUpdateSentence(paper);
      await this.paperService.savePaper(paper);
      // Update the parent block
      await this.paperService.updateSentenceMetadata(blockId);

      if (!found) {
        return reply.code(404).send({ error: "Sentence not found" });
      }

      return reply.send({ success: true });
    } catch (error) {
      console.error("Error in updateSentence:", error);
      return reply
        .code(500)
        .send({ error: "Failed to update sentence content" });
    }
  }

  async addBlock(
    request: FastifyRequest<{
      Body: {
        parentBlockId: string | null;
        prevBlockId: string | null;
        blockType: ContentType;
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
      console.error("Error in addBlock:", error);
      return reply.code(500).send({ error: "Failed to add new block" });
    }
  }

  async updateBlock(
    request: FastifyRequest<{
      Body: {
        targetBlockId: string;
        blockType?: ContentType;
        keyToUpdate: string;
        updatedValue: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { targetBlockId, keyToUpdate, updatedValue } = request.body;
      // blockType is no longer needed, so using findBlockById
      await this.paperService.updateBlock(
        targetBlockId,
        keyToUpdate,
        updatedValue
      );
      return { success: true };
    } catch (error) {
      console.error("Error in updateBlock:", error);
      return reply.code(500).send({ error: "Failed to update target block" });
    }
  }

  async updateWhole(
    request: FastifyRequest<{
      Body: {
        content: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { content } = request.body;
      // blockType is no longer needed, so using findBlockById
      // await this.paperService.updateSectionSummaries();
      console.log("you are in updateWhole controller");
      return { success: true };
    } catch (error) {
      console.error("Error in updateWhole:", error);
      return reply
        .code(500)
        .send({ error: "Failed to process imported document" });
    }
  }

  /**
   * Delete a sentence
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

  /**
   * Delete a block
   */
  async deleteBlock(
    request: FastifyRequest<{ Params: { blockId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { blockId } = request.params;

      if (!blockId) {
        return reply.code(400).send({ error: "Missing blockId" });
      }

      await this.paperService.deleteBlock(blockId);
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error("Error deleting block:", error);
      return reply.code(500).send({ error: "Failed to delete block" });
    }
  }

  /**
   * ask LLM a question
   */
  async askLLM(
    request: FastifyRequest<{
      Body: { text: string; renderedContent?: string; blockId?: string };
    }>,
    reply: FastifyReply
  ) {
    const { text, renderedContent, blockId } = request.body;

    try {
      const response = await this.llmService.askLLM(
        text,
        renderedContent,
        blockId
      );
      return reply.send({
        success: true,
        result: response,
      });
    } catch (error) {
      console.error("Error in askLLM:", error);
      const errorMessage = (error as Error).message;
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
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

  /**
   * Export paper to LaTeX format
   */
  async exportPaper(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get the latest paper data
      const paper = await this.paperService.getPaper();

      // Export to LaTeX
      const latexContent = await this.paperService.exportToLatex(paper);

      return {
        success: true,
        content: latexContent,
      };
    } catch (error) {
      console.error("Error exporting paper:", error);
      const errorMessage = (error as Error).message;
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * Initialize data by resetting paper.json and chat.json
   */
  async initializeData(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Import the file utilities
      const {
        ensureDataDirectoryExists,
        initializePaperJson,
        initializeChatJson,
      } = await import("../utils/fileUtils");

      // Ensure the data directory exists and is writable
      const dataDir = ensureDataDirectoryExists();
      if (!dataDir) {
        throw new Error("Could not access data directory for initialization");
      }

      // Create the initial paper template
      const initialPaper: Paper = {
        title: "New Paper",
        "block-id": Date.now().toString(),
        summary: "",
        intent: "",
        type: "paper",
        content: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      // Initialize paper both in file system and in-memory repository
      const paperJsonPath = initializePaperJson(dataDir, initialPaper);
      if (!paperJsonPath) {
        throw new Error("Failed to initialize paper.json");
      }

      // Also update paper in the service repository
      await this.paperService.savePaper(initialPaper);

      // Initialize chat.json
      const chatJsonPath = initializeChatJson(dataDir);
      if (!chatJsonPath) {
        throw new Error("Failed to initialize chat.json");
      }

      return {
        success: true,
        message: "Paper and chat data initialized successfully",
      };
    } catch (error) {
      console.error("Error initializing data:", error);
      const errorMessage = (error as Error).message;
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  }

  async updateRenderedSummaries(
    request: FastifyRequest<{
      Body: { renderedContent: string; blockId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { renderedContent, blockId } = request.body;
      const result = await this.paperService.updateRenderedSummaries(
        renderedContent,
        blockId
      );
      return reply.send({ success: true, apiResponse: result });
    } catch (error) {
      console.error("Error updating rendered summaries:", error);
      return reply
        .status(500)
        .send({ success: false, error: "Failed to update summaries" });
    }
  }
}
