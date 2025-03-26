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
        Body: { blockId: string; content: string };
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
