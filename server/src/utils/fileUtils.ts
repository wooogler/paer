import fs from "fs";
import path from "path";
import { Paper } from "@paer/shared";

/**
 * Ensures that the data directory exists and is writable
 * @returns Path to the data directory, or null if it couldn't be created/accessed
 */
export function ensureDataDirectoryExists(): string | null {
  try {
    // Possible data directory paths
    const possibleDataDirs = [
      path.join(__dirname, "../../data"),
      path.join(process.cwd(), "data"),
      path.join(process.cwd(), "server/data"),
      path.join(process.cwd(), "server/dist/data"),
    ];

    // Select actual data path to use
    let dataDir = null;
    for (const dir of possibleDataDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created data directory at: ${dir}`);
        }

        // Test write permissions
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
      return null;
    }

    return dataDir;
  } catch (error) {
    const err = error as Error;
    console.error("Error setting up data directory:", err);
    return null;
  }
}

/**
 * Initializes a paper.json file with default content
 * @param dataDir Directory where the file should be created
 * @param customPaper Optional custom paper data to use instead of the default
 * @returns Path to the created file or null if an error occurred
 */
export function initializePaperJson(
  dataDir: string,
  customPaper?: Paper
): string | null {
  try {
    const paperJsonPath = path.join(dataDir, "paper.json");

    // Default paper content
    const defaultPaper: Paper = customPaper || {
      title: "New Paper",
      "block-id": Date.now().toString(),
      summary: "",
      intent: "",
      type: "paper",
      content: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    // Write the file
    fs.writeFileSync(
      paperJsonPath,
      JSON.stringify(defaultPaper, null, 2),
      "utf-8"
    );
    console.log(`Created paper.json at: ${paperJsonPath}`);

    return paperJsonPath;
  } catch (error) {
    const err = error as Error;
    console.error("Error initializing paper.json:", err);
    return null;
  }
}

/**
 * Initializes a chat.json file with default content
 * @param dataDir Directory where the file should be created
 * @returns Path to the created file or null if an error occurred
 */
export function initializeChatJson(dataDir: string): string | null {
  try {
    const chatJsonPath = path.join(dataDir, "chat.json");

    // Initial chat data with welcome message
    const initialChats = {
      messages: [
        {
          id: "system-welcome-" + Date.now(),
          role: "system",
          content:
            "Hello! Do you need help with writing your document? How can I assist you?",
          timestamp: Date.now(),
        },
      ],
    };

    // Write the file
    fs.writeFileSync(
      chatJsonPath,
      JSON.stringify(initialChats, null, 2),
      "utf-8"
    );
    console.log(`Created chat.json at: ${chatJsonPath}`);

    return chatJsonPath;
  } catch (error) {
    const err = error as Error;
    console.error("Error initializing chat.json:", err);
    return null;
  }
}
