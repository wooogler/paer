import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "path";
import dotenv from "dotenv";
import apiRoutes from "./routes/api";
import OpenAI from "openai";
import fs from "fs";

// Create Fastify instance
const fastify = Fastify({ logger: true });
const port = Number(process.env.PORT || 3000);

// Middleware setup
fastify.register(cors, {
  origin: true, // Allow all origins (for development)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
});

// Set path to .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Register API routes
fastify.register(apiRoutes, { prefix: "/api" });

// Add health check endpoint
fastify.get("/api/health", async (request, reply) => {
  return { status: "ok", message: "Server is running" };
});

// Handle static files (production environment)
if (process.env.NODE_ENV === "production") {
  fastify.register(import("@fastify/static"), {
    root: path.join(__dirname, "../../client/dist"),
    prefix: "/",
  });

  fastify.get("*", async (request, reply) => {
    await reply.sendFile("index.html");
    return reply;
  });
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
