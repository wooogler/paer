import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import dotenv from "dotenv";
import apiRoutes from "./routes/api";
import paperRoutes from "./routes/papers";
import chatRoutes from "./routes/chat";
import userRoutes from "./routes/users";
import OpenAI from "openai";
import fs from "fs";
import { connectDB, closeDB } from "./config/database";

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../.env") });
} else {
  console.log("Running in production mode");
}

// Railway 배포 환경이면 NODE_ENV를 production으로 강제 설정
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

// MongoDB 연결
connectDB().catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// Register API routes
fastify.register(apiRoutes, { prefix: "/api" });
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

// 프로덕션 환경에서만 정적 파일 제공 (개발 환경에서는 Vite 개발 서버가 처리)
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
      } catch (err) {
        console.error("Error serving index.html:", err);
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
      } catch (err) {
        console.error(`Error serving index.html for ${request.url}:`, err);
        reply.status(500).send({ error: "Failed to serve index.html" });
      }
      return reply;
    });
  }
} else {
  console.log("Skipping static file serving setup - not in production mode");
  // 개발 모드에서도 루트 경로에 대한 응답 제공
  fastify.get("/", async (request, reply) => {
    return {
      status: "development",
      message:
        "Server running in development mode. Static files are not served.",
    };
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  await closeDB();
  await fastify.close();
  process.exit(0);
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server is running on port ${port}`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
};

start();
