import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import dotenv from "dotenv";
import apiRoutes from "./routes/api";
import paperRoutes from "./routes/papers";
import OpenAI from "openai";
import fs from "fs";

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../.env") });
}

// Create Fastify instance
const fastify = Fastify({ logger: true });
const port = Number(process.env.PORT || 3000);

// Middleware setup
fastify.register(cors, {
  origin:
    process.env.NODE_ENV === "production"
      ? [process.env.CLIENT_URL || "https://your-frontend-url.railway.app"]
      : true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Register API routes
fastify.register(apiRoutes, { prefix: "/api" });
fastify.register(paperRoutes, { prefix: "/api/papers" });

// Add health check endpoint
fastify.get("/api/health", async (request, reply) => {
  return { status: "ok", message: "Server is running" };
});

// Handle static files (production environment)
if (process.env.NODE_ENV === "production") {
  try {
    // 올바른 클라이언트 빌드 경로 설정
    const clientDistPath = path.resolve("/app/client/dist");

    // 디렉토리 존재 확인
    if (fs.existsSync(clientDistPath)) {
      console.log(`Client dist path found: ${clientDistPath}`);

      fastify.register(import("@fastify/static"), {
        root: clientDistPath,
        prefix: "/",
      });

      // 중복 라우트 등록 방지를 위해 라우트 등록 전 확인
      if (!fastify.hasRoute({ method: "GET", url: "*" })) {
        fastify.get("*", async (request, reply) => {
          await reply.sendFile("index.html");
          return reply;
        });
      }
    } else {
      console.warn(
        `Client dist path not found: ${clientDistPath}. Static file serving disabled.`
      );
    }
  } catch (err) {
    console.error("Error setting up static file serving:", err);
  }
}

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server is running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  fastify.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  fastify.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// Block data processing functions
function getBlockValue(blockId: string, key: string) {
  const [secId, subsecId = 0, parId = 0, senId = 0] = blockId
    .split(".")
    .map(Number);

  const data = fs.readFileSync(path.join(__dirname, "../data/paper.json"));
  const obj = JSON.parse(data.toString());

  let toGet = returnTargetBlock(obj, secId, subsecId, parId, senId);
  return toGet[key];
}

function updateBlockValue(blockId: string, key: string, valueToUpdate: string) {
  const [secId, subsecId = 0, parId = 0, senId = 0] = blockId
    .split(".")
    .map(Number);

  const dataPath = path.join(__dirname, "../data/paper.json");
  const data = fs.readFileSync(dataPath);
  const obj = JSON.parse(data.toString());

  let toUpdate = returnTargetBlock(obj, secId, subsecId, parId, senId);
  toUpdate[key] = valueToUpdate;

  let updatedData = JSON.stringify(obj);
  fs.writeFileSync(dataPath, updatedData);

  return;
}

function returnTargetBlock(
  obj: any,
  secId: number,
  subsecId: number,
  parId: number,
  senId: number
) {
  let toGet = obj;
  if (secId == 0) {
    return toGet;
  }
  toGet = toGet["content"][secId - 1];
  if (subsecId == 0) {
    return toGet;
  }
  toGet = toGet["content"][subsecId - 1];
  if (parId == 0) {
    return toGet;
  }
  toGet = toGet["content"][parId - 1];
  if (senId == 0) {
    return toGet;
  }
  toGet = toGet["content"][senId - 1];
  return toGet;
}
