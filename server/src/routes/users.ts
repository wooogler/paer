import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { UserController } from "../controllers/userController";

// Define user routes as Fastify plugin
const userRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userController = new UserController();

  // POST /api/users - 사용자 생성
  fastify.post<{ Body: { username: string } }>(
    "/",
    async (request, reply) => {
      return userController.createUser(request, reply);
    }
  );

  // GET /api/users/:id - ID로 사용자 조회
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      return userController.getUserById(request, reply);
    }
  );

  // GET /api/users/username/:username - 사용자명으로 사용자 조회
  fastify.get<{ Params: { username: string } }>(
    "/username/:username",
    async (request, reply) => {
      return userController.getUserByUsername(request, reply);
    }
  );

  // GET /api/users/id/:username - 사용자명으로 userId 조회
  fastify.get<{ Params: { username: string } }>(
    "/id/:username",
    async (request, reply) => {
      return userController.getUserIdByUsername(request, reply);
    }
  );
};

export default userRoutes; 