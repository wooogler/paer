import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PaperController } from "../controllers/paperController";
import { request } from "http";
import { ContentType, ContentTypeSchema } from "@paer/shared";

// Define routes as Fastify plugin
const apiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const paperController = new PaperController();

  // GET /api/paper
  fastify.get(
    "/paper",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return paperController.getPaper(request, reply);
    }
  );

  // PATCH /api/paper/sentence
  fastify.patch(
    "/paper/sentence",
    async (
      request: FastifyRequest<{
        Body: {
          blockId: string;
          content: string;
          summary: string;
          intent: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.updateSentence(request, reply);
    }
  );

  // POST /api/paper/block - Add new block
  fastify.post(
    "/paper/block",
    async (
      request: FastifyRequest<{
        Body: {
          parentBlockId: string | null;
          prevBlockId: string | null;
          blockType: ContentType;
        };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.addBlock(request, reply);
    }
  );

  // POST /api/paper/block/intent - Update block intent
  fastify.patch(
    "/paper/block/intent",
    async (
      request: FastifyRequest<{
        Body: {
          targetBlockId: string;
          updatedValue: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          targetBlockId,
          keyToUpdate: "intent",
          updatedValue,
        },
      };
      return paperController.updateBlock(modifiedRequest, reply);
    }
  );

  // PATCH /api/paper/block/summary - Update block summary
  fastify.patch(
    "/paper/block/summary",
    async (
      request: FastifyRequest<{
        Body: {
          targetBlockId: string;
          updatedValue: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          targetBlockId,
          keyToUpdate: "summary",
          updatedValue,
        },
      };
      return paperController.updateBlock(modifiedRequest, reply);
    }
  );

  // PATCH /api/paper/block/title - Update block title
  fastify.patch(
    "/paper/block/title",
    async (
      request: FastifyRequest<{
        Body: {
          targetBlockId: string;
          updatedValue: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          targetBlockId,
          keyToUpdate: "title",
          updatedValue,
        },
      };
      return paperController.updateBlock(modifiedRequest, reply);
    }
  );

  // Delete sentence API
  fastify.delete<{ Params: { blockId: string } }>(
    "/paper/sentence/:blockId",
    async (request, reply) => {
      return paperController.deleteSentence(request, reply);
    }
  );

  // Delete block API
  fastify.delete<{ Params: { blockId: string } }>(
    "/paper/block/:blockId",
    async (request, reply) => {
      return paperController.deleteBlock(request, reply);
    }
  );

  // askLLM API
  fastify.post(
    "/chat/ask",
    async (
      request: FastifyRequest<{
        Body: { text: string; renderedContent?: string; blockId?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        // Call the askLLM function from paperController
        const result = await paperController.askLLM(request, reply);

        // Send the result back to the client
        return reply.send({ success: true, result });
      } catch (error) {
        console.error("Error in /chat/ask:", error);
        return reply
          .status(500)
          .send({ success: false, error: "Failed to process the request" });
      }
    }
  );

  // PATCH /api/paper/sentence/intent - Update sentence intent
  fastify.patch(
    "/paper/sentence/intent",
    async (
      request: FastifyRequest<{
        Body: { blockId: string; intent: string };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.updateSentenceIntent(request, reply);
    }
  );

  // PATCH /api/paper/sentence/summary - Update sentence summary
  fastify.patch(
    "/paper/sentence/summary",
    async (
      request: FastifyRequest<{
        Body: { blockId: string; summary: string };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.updateSentenceSummary(request, reply);
    }
  );

  // GET /api/paper/export - Export paper to LaTeX
  fastify.get("/paper/export", async (request, reply) => {
    return paperController.exportPaper(request, reply);
  });

  // POST /api/paper/initialize - Reset paper.json and chat.json to initial state
  fastify.post("/paper/initialize", async (request, reply) => {
    try {
      await paperController.initializeData(request, reply);
      return { success: true };
    } catch (error) {
      console.error("Error initializing data:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // POST /api/paper/update-rendered-summaries - Update summaries and intents for rendered content
  fastify.post(
    "/paper/update-rendered-summaries",
    async (
      request: FastifyRequest<{
        Body: { renderedContent: string; blockId: string };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.updateRenderedSummaries(request, reply);
    }
  );
};

export default apiRoutes;
