import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { PaperController } from "../controllers/paperController";
import { ContentType } from "@paer/shared";

const paperRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const paperController = new PaperController();

  // GET /api/papers/:id - 특정 문서 조회
  fastify.get<{ 
    Params: { id: string };
    Querystring: { authorId: string }
  }>(
    "/:id",
    async (request, reply) => {
      return paperController.getPaperById(request, reply);
    }
  );

  // GET /api/papers - 사용자의 모든 문서 목록 조회
  fastify.get<{ Querystring: { authorId: string } }>(
    "/",
    async (request, reply) => {
      return paperController.getUserPapers(request, reply);
    }
  );

  // POST /api/papers - 새 문서 생성 또는 콘텐츠 처리 및 저장
  fastify.post<{
    Body: { authorId: string; title?: string; content?: string };
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

  // PATCH /api/papers/sentence - 문장 업데이트
  fastify.patch<{
    Body: {
      authorId: string;
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
      authorId: string;
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
      authorId: string;
      paperId: string;
      targetBlockId: string;
      updatedValue: string;
    };
  }>(
    "/block/intent",
    async (request, reply) => {
      const { authorId, paperId, targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          authorId,
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
      authorId: string;
      paperId: string;
      targetBlockId: string;
      updatedValue: string;
    };
  }>(
    "/block/summary",
    async (request, reply) => {
      const { authorId, paperId, targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          authorId,
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
      authorId: string;
      paperId: string;
      targetBlockId: string;
      updatedValue: string;
    };
  }>(
    "/block/title",
    async (request, reply) => {
      const { authorId, paperId, targetBlockId, updatedValue } = request.body;
      const modifiedRequest = {
        ...request,
        body: {
          authorId,
          paperId,
          targetBlockId,
          keyToUpdate: "title",
          updatedValue,
        },
      };
      return paperController.updateBlock(modifiedRequest, reply);
    }
  );

  // deprecated
  // // DELETE /api/papers/sentence - 문장 삭제
  // fastify.delete<{
  //   Body: {
  //     authorId: string;
  //     paperId: string;
  //     blockId: string;
  //   };
  // }>(
  //   "/sentence",
  //   async (request, reply) => {
  //     return paperController.deleteSentence(request, reply);
  //   }
  // );

  // DELETE /api/papers/block - 블록 삭제
  fastify.delete<{
    Body: {
      authorId: string;
      paperId: string;
      blockId: string;
    };
  }>(
    "/block",
    async (request, reply) => {
      return paperController.deleteBlock(request, reply);
    }
  );

  // POST /api/papers/:id/collaborators - 협업자 추가
  fastify.post<{
    Params: { id: string };
    Body: { authorId: string; collaboratorId: string };
  }>(
    "/:id/collaborators",
    async (request, reply) => {
      return paperController.addCollaborator(request, reply);
    }
  );

  // POST /api/papers/update-rendered-summaries - 렌더링된 컨텐츠의 요약 및 의도 업데이트
  fastify.post<{
    Body: { authorId: string; paperId: string; renderedContent: string; blockId: string };
  }>(
    "/update-rendered-summaries",
    async (request, reply) => {
      return paperController.updateRenderedSummaries(request, reply);
    }
  );

  // DELETE /api/papers/:id - 논문 삭제
  fastify.delete<{
    Params: { id: string };
    Querystring: { authorId: string };
  }>(
    "/:id",
    async (request, reply) => {
      return paperController.deletePaper(request, reply);
    }
  );

  // GET /api/papers/:id/collaborators - 논문의 협업자 목록 조회
  fastify.get<{
    Params: { id: string };
    Querystring: { authorId: string };
  }>(
    "/:id/collaborators",
    async (request, reply) => {
      return paperController.getCollaborators(request, reply);
    }
  );

  // DELETE /api/papers/:id/collaborator - 협업자 제거
  fastify.delete<{
    Params: { id: string };
    Body: { authorId: string; collaboratorId: string };
  }>(
    "/:id/collaborator",
    async (request, reply) => {
      return paperController.removeCollaborator(request, reply);
    }
  );

  // Export to LaTeX
  fastify.get<{
    Querystring: { authorId: string; paperId: string }
  }>("/:id/export", async (request, reply) => {
    return paperController.exportPaper(request, reply);
  });

  // Update rendered summaries
  fastify.post<{
    Body: { authorId: string; paperId: string; renderedContent: string; blockId: string }
  }>("/:id/summaries", async (request, reply) => {
    return paperController.updateRenderedSummaries(request, reply);
  });
};

export default paperRoutes;
