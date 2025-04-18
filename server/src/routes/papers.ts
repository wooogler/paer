import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { PaperController } from "../controllers/paperController";

const paperRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const paperController = new PaperController();

  // GET /api/papers - 사용자의 모든 문서 목록 조회
  fastify.get<{ Querystring: { userId: string } }>(
    "/",
    async (request, reply) => {
      return paperController.getUserPapers(request, reply);
    }
  );

  // POST /api/papers - 새 문서 생성
  fastify.post<{
    Body: { userId: string; title: string; content?: string };
  }>(
    "/",
    async (request, reply) => {
      return paperController.createPaper(request, reply);
    }
  );

  // POST /api/papers/save - 문서 저장
  fastify.post<{
    Body: any;
  }>(
    "/save",
    async (request, reply) => {
      return paperController.savePaper(request, reply);
    }
  );
};

export default paperRoutes;
