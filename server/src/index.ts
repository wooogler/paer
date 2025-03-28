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

// Register API routes
fastify.register(apiRoutes, { prefix: "/api" });
fastify.register(paperRoutes, { prefix: "/api/papers" });

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
  try {
    // 가능한 여러 클라이언트 빌드 경로를 시도
    const possibleClientPaths = [
      // Railway 환경 변수로 지정된 경로
      process.env.RAILWAY_STATIC_URL,
      // Railway에서 일반적인 경로
      "/app/client/dist",
      // 상대 경로 (Railway 워크스페이스 기준)
      path.join(process.cwd(), "client/dist"),
      // 서버 내부 public 폴더 (새로 추가)
      path.join(process.cwd(), "server/dist/public"),
      // __dirname 상대 경로에서 서버 내부 public 폴더
      path.join(__dirname, "../public"),
      // __dirname 기준 상대 경로
      path.join(__dirname, "../../../../client/dist"),
      // 더 깊은 상대 경로
      path.join(__dirname, "../../../client/dist"),
      // 표준 상대 경로
      path.join(__dirname, "../../client/dist"),
    ].filter((p): p is string => !!p); // undefined 값 제거 및 타입 가드 추가

    console.log("Checking possible client build paths:");
    possibleClientPaths.forEach((p) => console.log(` - ${p}`));

    // 가능한 경로들 중 존재하는 첫 번째 경로 사용
    let clientDistPath = null;
    for (const path of possibleClientPaths) {
      if (fs.existsSync(path)) {
        clientDistPath = path;
        console.log(`Found valid client dist path: ${clientDistPath}`);
        break;
      }
    }

    // 디버깅을 위해 현재 디렉토리 내용 로깅
    console.log("Current directory contents:");
    try {
      const rootDirContents = fs.readdirSync(process.cwd());
      rootDirContents.forEach((item) => console.log(` - ${item}`));

      if (rootDirContents.includes("client")) {
        console.log("Client directory contents:");
        const clientDirContents = fs.readdirSync(
          path.join(process.cwd(), "client")
        );
        clientDirContents.forEach((item) => console.log(` - ${item}`));
      }
    } catch (err) {
      console.error("Error listing directory contents:", err);
    }

    // 디렉토리 존재 확인
    if (clientDistPath && fs.existsSync(clientDistPath)) {
      console.log(`Client dist path found: ${clientDistPath}`);

      // index.html 파일 확인
      const indexHtmlPath = path.join(clientDistPath, "index.html");
      if (fs.existsSync(indexHtmlPath)) {
        console.log(`index.html found at: ${indexHtmlPath}`);
      } else {
        console.warn(
          `index.html not found at expected location: ${indexHtmlPath}`
        );
      }

      // 정적 파일 서빙 설정
      console.log(`Setting up static file serving from: ${clientDistPath}`);

      // index.html을 제외한 정적 파일 서빙 (JS, CSS, 이미지 등)
      fastify.register(import("@fastify/static"), {
        root: clientDistPath,
        prefix: "/", // 루트 경로로 제공하여 모든 자산에 직접 접근 가능
        decorateReply: true,
        index: false, // index.html은 별도 처리
      });

      // 루트 경로에 대한 명시적 핸들러 추가
      fastify.get("/", async (request, reply) => {
        try {
          console.log("Serving index.html for root path");
          // 파일 경로를 직접 읽어서 응답으로 보냄
          const indexContent = fs.readFileSync(
            path.join(clientDistPath, "index.html")
          );
          reply.type("text/html").send(indexContent);
        } catch (err) {
          console.error("Error serving index.html:", err);
          reply.status(500).send({ error: "Failed to serve index.html" });
        }
        return reply;
      });

      // SPA를 위한 fallback 라우트 등록
      fastify.setNotFoundHandler(async (request, reply) => {
        // API 요청은 여기서 처리하지 않음
        if (request.url.startsWith("/api")) {
          console.log(`API not found: ${request.url}`);
          return reply.status(404).send({ error: "API endpoint not found" });
        }

        // 확장자가 있는 파일 요청은 처리하지 않음 (정적 파일이 존재하지 않는 경우)
        if (path.extname(request.url) !== "") {
          console.log(`Static file not found: ${request.url}`);
          return reply.status(404).send({ error: "Static file not found" });
        }

        try {
          console.log(`Serving index.html for SPA route: ${request.url}`);
          // 파일 경로를 직접 읽어서 응답으로 보냄
          const indexContent = fs.readFileSync(
            path.join(clientDistPath, "index.html")
          );
          reply.type("text/html").send(indexContent);
        } catch (err) {
          console.error(`Error serving index.html for ${request.url}:`, err);
          reply.status(500).send({ error: "Failed to serve index.html" });
        }
        return reply;
      });
    } else {
      console.warn(`No valid client dist path found among the checked paths.`);
      // 디렉토리가 존재하지 않는 경우 루트 경로에 대한 응답 추가
      fastify.get("/", async (request, reply) => {
        return {
          error: "Client build not found",
          message:
            "The client build directory was not found. Please check your deployment configuration.",
          checkedPaths: possibleClientPaths,
        };
      });
    }
  } catch (err) {
    console.error("Error setting up static file serving:", err);
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

// Start the server
const start = async () => {
  try {
    // 데이터 디렉토리 및 기본 파일 생성 확인
    ensureDataDirectoryExists();

    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server is running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// 데이터 디렉토리와 기본 파일 존재 확인
function ensureDataDirectoryExists() {
  try {
    // 가능한 데이터 디렉토리 경로들
    const possibleDataDirs = [
      path.join(__dirname, "../data"),
      path.join(process.cwd(), "data"),
      path.join(process.cwd(), "server/dist/data"),
    ];

    // 실제 사용할 데이터 경로 선택
    let dataDir = null;
    for (const dir of possibleDataDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created data directory at: ${dir}`);
        }

        // 쓰기 권한 테스트
        const testFile = path.join(dir, ".test");
        fs.writeFileSync(testFile, "test");
        fs.unlinkSync(testFile);

        dataDir = dir;
        console.log(`Using data directory: ${dataDir}`);
        break;
      } catch (error) {
        const err = error as Error;
        console.warn(`Cannot use directory ${dir}: ${err.message}`);
      }
    }

    if (!dataDir) {
      console.error("Could not find or create a writable data directory!");
      return;
    }

    // paper.json 파일 확인 및 생성
    const paperJsonPath = path.join(dataDir, "paper.json");
    if (!fs.existsSync(paperJsonPath)) {
      // 기본 paper.json 생성 - Zod 스키마와 완전히 일치하는 구조
      const defaultPaper = {
        title: "New Paper",
        summary: "This is a new paper created automatically",
        intent: "To provide a starting point for writing",
        type: "paper",
        content: [
          {
            title: "Introduction",
            summary: "Introduction to the topic",
            intent: "To introduce the main topic",
            type: "section",
            content: [
              {
                summary: "Background information",
                intent: "To provide context",
                type: "paragraph",
                content: [
                  {
                    summary: "Initial sentence",
                    intent: "To begin the document",
                    type: "sentence",
                    content: "This is the beginning of your new document.",
                  },
                ],
              },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authors: [],
        "block-id": "0",
      };

      fs.writeFileSync(paperJsonPath, JSON.stringify(defaultPaper, null, 2));
      console.log(`Created default paper.json at: ${paperJsonPath}`);
    } else {
      console.log(`Found existing paper.json at: ${paperJsonPath}`);

      // 파일이 존재하지만 필요한 필드가 없는지 확인하고 수정
      try {
        const paperData = JSON.parse(fs.readFileSync(paperJsonPath, "utf8"));
        let modified = false;

        // 필수 필드 확인 및 추가
        if (!paperData.type) {
          paperData.type = "paper";
          modified = true;
        }

        if (!paperData.intent) {
          paperData.intent = "To provide a starting point for writing";
          modified = true;
        }

        if (!paperData.summary) {
          paperData.summary = "This is a paper created automatically";
          modified = true;
        }

        // 변경사항이 있으면 파일 업데이트
        if (modified) {
          fs.writeFileSync(paperJsonPath, JSON.stringify(paperData, null, 2));
          console.log(
            `Updated existing paper.json with missing fields at: ${paperJsonPath}`
          );
        }
      } catch (error) {
        const err = error as Error;
        console.error(
          `Error checking/updating existing paper.json: ${err.message}`
        );
      }
    }
  } catch (error) {
    const err = error as Error;
    console.error("Error setting up data directory:", err);
  }
}

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
