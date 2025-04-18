import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { PaperController } from "../controllers/paperController";
import { ContentType } from "@paer/shared";

const paperRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const paperController = new PaperController();

  // GET /api/papers/:id - 특정 문서 조회
  fastify.get<{ Querystring: { userId: string; paperId: string } }>(
    "/:id",
    async (request, reply) => {
      return paperController.getPaperById(request, reply);
    }
  );

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

  // POST /api/papers/process - 문서 내용 처리
  fastify.post<{
    Body: { content: string; userId: string };
  }>(
    "/process",
    async (request, reply) => {
      return paperController.processPaper(request, reply);
    }
  );

  // PATCH /api/papers/sentence - 문장 업데이트
  fastify.patch<{
    Body: {
      userId: string;
      paperId: string;
      blockId: string;
      content: string;
      summary: string;
      intent: string;
    };
  }>(
    "/sentence",
    async (request, reply) => {
      return paperController.updateSentence(request, reply);
    }
  );

  // POST /api/papers/block - 블록 추가
  fastify.post<{
    Body: {
      userId: string;
      paperId: string;
      parentBlockId: string | null;
      prevBlockId: string | null;
      blockType: ContentType;
    };
  }>(
    "/block",
    async (request, reply) => {
      return paperController.addBlock(request, reply);
    }
  );

  // PATCH /api/papers/block/intent - 블록 의도 업데이트
  fastify.patch<{
    Body: {
      userId: string;
      paperId: string;
      targetBlockId: string;
      updatedValue: string;
    };
  }>(
    "/block/intent",
    async (request, reply) => {
      const { userId, paperId, targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          userId,
          paperId,
          targetBlockId,
          keyToUpdate: "intent",
          updatedValue,
        },
      };
      return paperController.updateBlock(modifiedRequest, reply);
    }
  );

  // PATCH /api/papers/block/summary - 블록 요약 업데이트
  fastify.patch<{
    Body: {
      userId: string;
      paperId: string;
      targetBlockId: string;
      updatedValue: string;
    };
  }>(
    "/block/summary",
    async (request, reply) => {
      const { userId, paperId, targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          userId,
          paperId,
          targetBlockId,
          keyToUpdate: "summary",
          updatedValue,
        },
      };
      return paperController.updateBlock(modifiedRequest, reply);
    }
  );

  // PATCH /api/papers/block/title - 블록 제목 업데이트
  fastify.patch<{
    Body: {
      userId: string;
      paperId: string;
      targetBlockId: string;
      updatedValue: string;
    };
  }>(
    "/block/title",
    async (request, reply) => {
      const { userId, paperId, targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          userId,
          paperId,
          targetBlockId,
          keyToUpdate: "title",
          updatedValue,
        },
      };
      return paperController.updateBlock(modifiedRequest, reply);
    }
  );

  // DELETE /api/papers/sentence - 문장 삭제
  fastify.delete<{
    Body: {
      userId: string;
      paperId: string;
      blockId: string;
    };
  }>(
    "/sentence",
    async (request, reply) => {
      return paperController.deleteSentence(request, reply);
    }
  );

  // DELETE /api/papers/block - 블록 삭제
  fastify.delete<{
    Body: {
      userId: string;
      paperId: string;
      blockId: string;
    };
  }>(
    "/block",
    async (request, reply) => {
      return paperController.deleteBlock(request, reply);
    }
  );

  // POST /api/papers/collaborator - 협업자 추가
  fastify.post<{
    Params: { id: string };
    Body: { userId: string; collaboratorUsername: string };
  }>(
    "/collaborator/:id",
    async (request, reply) => {
      return paperController.addCollaborator(request, reply);
    }
  );
};

export default paperRoutes;
