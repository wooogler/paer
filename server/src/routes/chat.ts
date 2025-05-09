import { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { ChatController } from "../controllers/chatController";
import { ChatMessage, MessageAccessList } from "../types/chat";
import { PaperController } from "../controllers/paperController";

// Define chat routes as Fastify plugin
const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const chatController = new ChatController();
  const paperController = new PaperController();

  // GET /api/chat/messages - Get all messages (without paperId)
  fastify.get<{ Querystring: { userId: string } }>(
    "/messages",
    async (request, reply) => {
      try {
        const { userId } = request.query;
        
        if (!userId) {
          return reply.code(400).send({ error: "userId is required" });
        }
        
        // Return error message with response code instead of using default paperId
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

  // GET /api/chat/:paperId/messages - Get all messages for specific document
  fastify.get<{ Params: { paperId: string }; Querystring: { userId: string } }>(
    "/:paperId/messages",
    async (request, reply) => {
      return chatController.getMessages(request, reply);
    }
  );

  // GET /api/chat/:paperId/messages/:blockId - Get messages for specific block ID in document
  fastify.get<{
    Params: { paperId: string; blockId: string };
    Querystring: { userId: string };
  }>("/:paperId/messages/:blockId", async (request, reply) => {
    return chatController.getMessagesByBlockId(request, reply);
  });

  // POST /api/chat/:paperId/messages - Add new message to specific document
  fastify.post<{
    Params: { paperId: string };
    Body: ChatMessage & { userId: string };
  }>("/:paperId/messages", async (request, reply) => {
    return chatController.addMessage(request, reply);
  });

  // PUT /api/chat/:paperId/messages - Save multiple messages for specific document
  fastify.put<{
    Params: { paperId: string };
    Body: { userId: string; messages: ChatMessage[] };
  }>("/:paperId/messages", async (request, reply) => {
    return chatController.saveMessages(request, reply);
  });

  // DELETE /api/chat/:paperId/messages - Delete all messages for specific document
  fastify.delete<{
    Params: { paperId: string };
    Querystring: { userId: string };
  }>("/:paperId/messages", async (request, reply) => {
    return chatController.clearMessages(request, reply);
  });

  // DELETE /api/chat/:paperId/messages/:messageId - Delete specific message from document
  fastify.delete<{
    Params: { paperId: string; messageId: string };
    Querystring: { userId: string };
  }>("/:paperId/messages/:messageId", async (request, reply) => {
    return chatController.deleteMessage(request, reply);
  });

  // POST /api/chat/ask - Ask question to LLM
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

  // POST /api/chat/summarize-messages - Summarize messages
  fastify.post<{
    Body: { messages: ChatMessage[], blockId: string };
  }>(
    "/summarize-messages",
    async (request, reply) => {
      try {
        const result = await chatController.summarizeMessages(request, reply);
        return reply.send(result);
      } catch (error) {
        console.error("Error in /chat/summarize-messages:", error);
        return reply
          .status(500)
          .send({ success: false, error: "Failed to summarize messages" });
      }
    }
  );

};

export default chatRoutes;
