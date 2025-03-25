import fs from "fs";
import path from "path";
import { Paper } from "@paer/shared";

export class PaperRepository {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(__dirname, "../../data/testContent.json");
  }

  async getPaper(): Promise<Paper> {
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      return data;
    } catch (error) {
      throw new Error("Failed to read paper data");
    }
  }

  async updateSentenceContent(blockId: string, content: string): Promise<void> {
    try {
      // Read the current data
      const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

      // Find and update the sentence with matching block-id
      const updated = this.findAndUpdateSentence(paperData, blockId, content);

      if (!updated) {
        throw new Error(`Sentence with block-id ${blockId} not found`);
      }

      // Write the updated data back to the file
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(paperData, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error updating sentence content:", error);
      throw new Error("Failed to update sentence content");
    }
  }

  private findAndUpdateSentence(
    obj: any,
    blockId: string,
    content: string
  ): boolean {
    // Check if current object has the matching block-id
    if (obj["block-id"] === blockId) {
      if (obj.type === "sentence") {
        obj.content = content;
        return true;
      }
    }

    // If not found at this level, recursively search in the content array
    if (Array.isArray(obj.content)) {
      for (const item of obj.content) {
        if (this.findAndUpdateSentence(item, blockId, content)) {
          return true;
        }
      }
    }

    return false;
  }
}
