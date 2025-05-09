import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { UserController } from "../controllers/userController";

// Define user routes as Fastify plugin
const userRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userController = new UserController();

  // POST /api/users - Create user
  fastify.post<{ Body: { username: string } }>(
    "/",
    async (request, reply) => {
      return userController.createUser(request, reply);
    }
  );

  // GET /api/users/:id - Get user by ID
  fastify.get<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      return userController.getUserById(request, reply);
    }
  );

  // GET /api/users/username/:username - Get user by username
  fastify.get<{ Params: { username: string } }>(
    "/username/:username",
    async (request, reply) => {
      return userController.getUserByUsername(request, reply);
    }
  );

  // GET /api/users/id/:username - Get userId by username
  fastify.get<{ Params: { username: string } }>(
    "/id/:username",
    async (request, reply) => {
      return userController.getUserIdByUsername(request, reply);
    }
  );

  // GET /api/users - Get all users list
  fastify.get(
    "/",
    async (request, reply) => {
      return userController.getAllUsers(request, reply);
    }
  );
};

export default userRoutes; 