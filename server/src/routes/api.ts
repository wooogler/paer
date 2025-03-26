import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PaperController } from "../controllers/paperController";
import { request } from "http";
import { ContentTypeSchema } from "@paer/shared";

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
        Body: { blockId: string; content: string };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.updateSentence(request, reply);
    }
  );

  // POST /api/paper/sentence - Add new sentence
  fastify.post(
    "/paper/sentence",
    async (
      request: FastifyRequest<{
        Body: { blockId: string | null };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.addSentence(request, reply);
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
          blockType: typeof ContentTypeSchema;
        };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.addBlock(request, reply);
    }
  );

  // Delete sentence API
  fastify.delete<{ Params: { blockId: string } }>(
    "/paper/sentence/:blockId",
    async (request, reply) => {
      return paperController.deleteSentence(request, reply);
    }
  );

  // POST /api/openai/askllm
  fastify.post(
    "/openai/askllm",
    async (
      request: FastifyRequest<{
        Body: { text: string };
      }>,
      reply: FastifyReply
    ) => {
      return paperController.askLLM(request, reply);
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
};

export default apiRoutes;
