import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import apiRouter from "./routes/api";
import OpenAI from "openai";
import fs from "fs";

// Basic express server setup
const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(express.json());

// Set path to .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API routes
app.use("/api", apiRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Serve static files for frontend (production environment)
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

// Start the server with better error handling
const server = app
  .listen(port, () => {
    console.log(`Server is running on port ${port}`);
  })
  .on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Please use a different port.`
      );
      process.exit(1);
    } else {
      console.error("Server error:", err);
    }
  });

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// Operates on block contents
function getBlockValue(blockId: string, key: string) {
  const [secId, subsecId = 0, parId = 0, senId = 0] = blockId
    .split(".")
    .map(Number);

  const data = fs.readFileSync(
    path.join(__dirname, "../data/testContent.json")
  );
  const obj = JSON.parse(data.toString());

  let toGet = returnTargetBlock(obj, secId, subsecId, parId, senId);
  return toGet[key];
}

function updateBlockValue(blockId: string, key: string, valueToUpdate: string) {
  const [secId, subsecId = 0, parId = 0, senId = 0] = blockId
    .split(".")
    .map(Number);

  const dataPath = path.join(__dirname, "../data/testContent.json");
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
