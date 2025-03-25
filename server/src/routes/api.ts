import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { PaperController } from "../controllers/paperController";

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

  // POST /api/paper/sentence - 새 문장 추가
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

  // 문장 삭제 API
  fastify.delete<{ Params: { blockId: string } }>(
    "/paper/sentence/:blockId",
    async (request, reply) => {
      return paperController.deleteSentence(request, reply);
    }
  );
};

export default apiRoutes;
