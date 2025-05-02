import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { ChatController } from "../controllers/chatController";
import { ChatMessage, MessageAccessList } from "../types/chat";
import { PaperController } from "../controllers/paperController";

// Define chat routes as Fastify plugin
const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const chatController = new ChatController();
  const paperController = new PaperController();

  // GET /api/chat/messages - 모든 메시지 가져오기 (paperId 없이)
  fastify.get<{ Querystring: { userId: string } }>(
    "/messages",
    async (request, reply) => {
      try {
        const { userId } = request.query;
        
        if (!userId) {
          return reply.code(400).send({ error: "userId is required" });
        }
        
        // 기본 paperId를 사용하는 대신, 응답 코드와 함께 오류 메시지 반환
        return reply.code(400).send({ 
          error: "paperId is required", 
          message: "Please specify a paper ID to get messages" 
        });
      } catch (error) {
        console.error("Error in GET /messages:", error);
        return reply.code(500).send({ error: "Failed to process request" });
      }
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

  // This API endpoint edits (view) acess of blocks
  // PATCH /api/chat/:paperId/access
  // design consideration:
  // message ID must exist
  // paperID, authorID must match

  fastify.patch<{
    Params: { paperId: string };
    Body: { userId: string, messageAccessList: MessageAccessList};
  }>(
    "/:paperId/messages/access",
    async (request, reply) => {

      return chatController.updateMessageAccess(request, reply);
    }
  );

  // This API endpoints request a specific user's public message history
  // GET /api/chat/:paperId/teammate/:teammateId
  fastify.get<{
    Params: { paperId: string; teammateId: string };
    Querystring: { userId: string };
  }>(
    "/:paperId/teammate/:teammateId",
    async (request, reply) => {
      return chatController.getUserMessages(request, reply);
    }
  );
};

export default chatRoutes;
