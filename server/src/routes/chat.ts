import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ChatController } from "../controllers/chatController";
import { ChatMessage } from "../types/chat";

// Define chat routes as Fastify plugin
const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const chatController = new ChatController();

  // GET /api/chat/messages - 모든 메시지 가져오기
  fastify.get("/messages", async (request, reply) => {
    return chatController.getMessages(request, reply);
  });

  // GET /api/chat/messages/:blockId - 특정 블록 ID의 메시지 가져오기
  fastify.get<{ Params: { blockId: string } }>(
    "/messages/:blockId",
    async (request, reply) => {
      return chatController.getMessagesByBlockId(request, reply);
    }
  );

  // POST /api/chat/messages - 새 메시지 추가
  fastify.post<{ Body: ChatMessage }>("/messages", async (request, reply) => {
    return chatController.addMessage(request, reply);
  });

  // PUT /api/chat/messages - 여러 메시지 저장
  fastify.put<{ Body: { messages: ChatMessage[] } }>(
    "/messages",
    async (request, reply) => {
      return chatController.saveMessages(request, reply);
    }
  );

  // DELETE /api/chat/messages - 모든 메시지 삭제
  fastify.delete("/messages", async (request, reply) => {
    return chatController.clearMessages(request, reply);
  });

  // DELETE /api/chat/messages/:messageId - 특정 메시지 삭제
  fastify.delete<{ Params: { messageId: string } }>(
    "/messages/:messageId",
    async (request, reply) => {
      return chatController.deleteMessage(request, reply);
    }
  );
};

export default chatRoutes;
