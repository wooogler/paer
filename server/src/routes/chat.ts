import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { ChatController } from "../controllers/chatController";
import { ChatMessage } from "../types/chat";
import { PaperController } from "../controllers/paperController";

// Define chat routes as Fastify plugin
const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const chatController = new ChatController();
  const paperController = new PaperController();

  // GET /api/chat/messages - 모든 메시지 가져오기 (paperId 없이)
  fastify.get<{ Querystring: { userId: string } }>(
    "/messages",
    async (request, reply) => {
      // 기본 paperId를 사용하거나 null로 설정
      const paperId = "default";
      return chatController.getMessages(
        { ...request, params: { paperId } } as any,
        reply
      );
    }
  );

  // GET /api/chat/:paperId/messages - 특정 문서의 모든 메시지 가져오기
  fastify.get<{ Params: { paperId: string }; Querystring: { userId: string } }>(
    "/:paperId/messages",
    async (request, reply) => {
      return chatController.getMessages(request, reply);
    }
  );

  // GET /api/chat/:paperId/messages/:blockId - 특정 문서의 특정 블록 ID 메시지 가져오기
  fastify.get<{
    Params: { paperId: string; blockId: string };
    Querystring: { userId: string };
  }>("/:paperId/messages/:blockId", async (request, reply) => {
    return chatController.getMessagesByBlockId(request, reply);
  });

  // POST /api/chat/:paperId/messages - 특정 문서에 새 메시지 추가
  fastify.post<{
    Params: { paperId: string };
    Body: ChatMessage & { userId: string };
  }>("/:paperId/messages", async (request, reply) => {
    return chatController.addMessage(request, reply);
  });

  // PUT /api/chat/:paperId/messages - 특정 문서의 여러 메시지 저장
  fastify.put<{
    Params: { paperId: string };
    Body: { userId: string; messages: ChatMessage[] };
  }>("/:paperId/messages", async (request, reply) => {
    return chatController.saveMessages(request, reply);
  });

  // DELETE /api/chat/:paperId/messages - 특정 문서의 모든 메시지 삭제
  fastify.delete<{
    Params: { paperId: string };
    Querystring: { userId: string };
  }>("/:paperId/messages", async (request, reply) => {
    return chatController.clearMessages(request, reply);
  });

  // DELETE /api/chat/:paperId/messages/:messageId - 특정 문서의 특정 메시지 삭제
  fastify.delete<{
    Params: { paperId: string; messageId: string };
    Querystring: { userId: string };
  }>("/:paperId/messages/:messageId", async (request, reply) => {
    return chatController.deleteMessage(request, reply);
  });

  // POST /api/chat/ask - LLM에 질문하기
  fastify.post<{
    Body: { text: string; renderedContent?: string; blockId?: string };
  }>(
    "/ask",
    async (request, reply) => {
      try {
        const result = await paperController.askLLM(request, reply);
        return reply.send({ success: true, result });
      } catch (error) {
        console.error("Error in /chat/ask:", error);
        return reply
          .status(500)
          .send({ success: false, error: "Failed to process the request" });
      }
    }
  );
};

export default chatRoutes;
