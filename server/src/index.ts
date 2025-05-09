import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import dotenv from "dotenv";
import paperRoutes from "./routes/papers";
import chatRoutes from "./routes/chat";
import userRoutes from "./routes/users";
import OpenAI from "openai";
import fs from "fs";
import connectDB from "./config/database";
import { closeDB } from "./config/database";

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../.env") });
} else {
  console.log("Running in production mode");
}

// Railway deployment environment, force NODE_ENV to production
if (process.env.RAILWAY_ENVIRONMENT === "true") {
  process.env.NODE_ENV = "production";
  console.log("Detected Railway environment, setting NODE_ENV to production");
}

// Create Fastify instance
const fastify = Fastify({ logger: true });
const port = Number(process.env.PORT || 3000);

// Middleware setup
fastify.register(cors, {
  origin:
    process.env.NODE_ENV === "production"
      ? [process.env.CLIENT_URL || "https://paer-production.railway.app"]
      : true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Register API routes
fastify.register(paperRoutes, { prefix: "/api/papers" });
fastify.register(chatRoutes, { prefix: "/api/chat" });
fastify.register(userRoutes, { prefix: "/api/users" });

// Add health check endpoint
fastify.get("/api/health", async (request, reply) => {
  return { status: "ok", message: "Server is running" };
});

// Handle static files (production environment)
console.log(`Current NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Server __dirname: ${__dirname}`);
console.log(`Railway environment: ${process.env.RAILWAY_ENVIRONMENT}`);

// Serve static files only in production (Vite dev server handles in development)
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.join(process.cwd(), "client/dist");
  
  if (fs.existsSync(clientDistPath)) {
    fastify.register(import("@fastify/static"), {
      root: clientDistPath,
      prefix: "/",
      decorateReply: true,
      index: false,
    });

    fastify.get("/", async (request, reply) => {
      try {
        const indexContent = fs.readFileSync(path.join(clientDistPath, "index.html"));
        reply.type("text/html").send(indexContent);
      } catch (error: unknown) {
        console.error("Error serving index.html:", error);
        reply.status(500).send({ error: "Failed to serve index.html" });
      }
      return reply;
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith("/api")) {
        return reply.status(404).send({ error: "API endpoint not found" });
      }

      if (path.extname(request.url) !== "") {
        return reply.status(404).send({ error: "Static file not found" });
      }

      try {
        const indexContent = fs.readFileSync(path.join(clientDistPath, "index.html"));
        reply.type("text/html").send(indexContent);
      } catch (error: unknown) {
        console.error(`Error serving index.html for ${request.url}:`, error);
        reply.status(500).send({ error: "Failed to serve index.html" });
      }
    });
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await closeDB();
  fastify.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

const start = async () => {
  try {
    await connectDB();
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server is running on port ${port}`);
  } catch (error: unknown) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
