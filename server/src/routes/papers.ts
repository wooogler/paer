import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { PaperController } from "../controllers/paperController";
import { ContentType } from "@paer/shared";

const paperRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const paperController = new PaperController();

  // GET /api/papers/:id - Get specific document
  fastify.get<{ 
    Params: { id: string };
    Querystring: { authorId: string }
  }>(
    "/:id",
    async (request, reply) => {
      return paperController.getPaperById(request, reply);
    }
  );

  // GET /api/papers - Get all documents for user
  fastify.get<{ Querystring: { authorId: string } }>(
    "/",
    async (request, reply) => {
      return paperController.getUserPapers(request, reply);
    }
  );

  // POST /api/papers - Create new document or process and save content
  fastify.post<{
    Body: { authorId: string; title?: string; content?: string };
  }>(
    "/",
    async (request, reply) => {
      return paperController.createPaper(request, reply);
    }
  );

  // POST /api/papers/save - Save document
  fastify.post<{
    Body: any;
  }>(
    "/save",
    async (request, reply) => {
      return paperController.savePaper(request, reply);
    }
  );

  // PATCH /api/papers/sentence - Update sentence
  fastify.patch<{
    Params: { paperId: string };
    Body: {
      authorId: string;
      blockId: string;
      content: string;
      summary?: string;
      intent?: string;
      lastModifiedBy?: string;
      previousContent?: string;
    };
  }>(
    "/:paperId/sentence",
    async (request, reply) => {
      return paperController.updateSentence(request, reply);
    }
  );

  // POST /api/papers/block - Add block
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

  // PATCH /api/papers/block/intent - Update block intent
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

  // PATCH /api/papers/block/summary - Update block summary
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

  // PATCH /api/papers/block/title - Update block title
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
  // // DELETE /api/papers/sentence - Delete sentence
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

  // DELETE /api/papers/block - Delete block
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

  // POST /api/papers/:id/collaborators - Add collaborator
  fastify.post<{
    Params: { id: string };
    Body: { authorId: string; collaboratorId: string };
  }>(
    "/:id/collaborators",
    async (request, reply) => {
      return paperController.addCollaborator(request, reply);
    }
  );

  // POST /api/papers/update-rendered-summaries - Update rendered content summaries
  fastify.post<{
    Body: { authorId: string; paperId: string; renderedContent: string; blockId: string };
  }>(
    "/update-rendered-summaries",
    async (request, reply) => {
      return paperController.updateRenderedSummaries(request, reply);
    }
  );

  // DELETE /api/papers/:id - Delete paper
  fastify.delete<{
    Params: { id: string };
    Querystring: { authorId: string };
  }>(
    "/:id",
    async (request, reply) => {
      return paperController.deletePaper(request, reply);
    }
  );

  // GET /api/papers/:id/collaborators - Get paper collaborators
  fastify.get<{
    Params: { id: string };
    Querystring: { authorId: string };
  }>(
    "/:id/collaborators",
    async (request, reply) => {
      return paperController.getCollaborators(request, reply);
    }
  );

  // DELETE /api/papers/:id/collaborator - Remove collaborator
  fastify.delete<{
    Params: { id: string };
    Body: { authorId: string; collaboratorId: string };
  }>(
    "/:id/collaborators",
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

  // get members
  fastify.get<{
    Params: { paperId: string };
    Querystring: { authorId: string }
  }>(
    "/:paperId/members",
    async (request, reply) => {
      return paperController.getMembers(request, reply);
    }
  );

  // get edit history
  // (`/papers/${paperId}/blocks/${blockId}/edit-history`);
  fastify.get<{
    Params: { paperId: string; blockId: string };
    Querystring: { userId: string }
  }>(
    "/:paperId/blocks/:blockId/edit-history",
    async (request, reply) => {
      return paperController.getEditHistory(request, reply);
    }
  );
};

export default paperRoutes;
