import fs from "fs";
import path from "path";
import { Paper, ContentTypeSchemaEnum } from "@paer/shared";
import e from "cors";

export class PaperRepository {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(__dirname, "../../data/paper.json");
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

  async addSentence(blockId: string | null): Promise<void> {
    try {
      // Read the current data
      const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

      // Create a new empty sentence
      const newSentence = {
        type: "sentence",
        summary: "",
        intent: "Provide additional information",
        content: "",
        "block-id": Date.now().toString(),
      };

      let added = false;

      if (blockId === null) {
        // Add at the beginning of the selected paragraph (assuming first paragraph)
        if (paperData.content && Array.isArray(paperData.content)) {
          // Find first paragraph in paper
          for (let i = 0; i < paperData.content.length; i++) {
            const section = paperData.content[i];
            if (section.content && Array.isArray(section.content)) {
              for (let j = 0; j < section.content.length; j++) {
                const subsection = section.content[j];
                if (
                  subsection.type === "paragraph" &&
                  subsection.content &&
                  Array.isArray(subsection.content)
                ) {
                  // Add to the beginning of the first paragraph found
                  subsection.content.unshift(newSentence);
                  added = true;
                  break;
                }
              }
            }
            if (added) break;
          }
        }
      } else {
        // Add after the specified sentence
        added = this.findAndAddSentence(paperData, blockId, newSentence);
      }

      if (!added) {
        throw new Error(
          `Could not add sentence${blockId ? ` after blockId ${blockId}` : ""}`
        );
      }

      // Write the updated data back to the file
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(paperData, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error adding new sentence:", error);
      throw new Error("Failed to add new sentence");
    }
  }

  // Adds a new block to the document
  // Assumption: The client knows the parent block ID
  async addBlock(parentBlockId: string | null, prevBlockId: string | null, blockType: ContentTypeSchemaEnum): Promise<string> {
    let newBlockId = "-1";
    
    try {
      // Reads the current paper file as JSON
      const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

      newBlockId = Date.now().toString();

      // Initializes a new block w/ specified block type and assigned block ID
      const newBlock = {
        type: blockType,
        summary: "",
        intent: "Provide additional information",
        content: "",
        "block-id": newBlockId,  // Assigns a unique block ID using timestamp
      };

      if (!parentBlockId) {
        throw new Error(
          `Could not add the new block because parent block is not provided.`);
      }

      // Finds the parent block; throws an error if not found
      const parentBlock = paperData.content.find((block: any) => block["block-id"] === parentBlockId);
      if (!parentBlock) {
        throw new Error(
          `Could not find the parent block with block ID ${parentBlockId}`);
      }

      // Finds the index of the previous block ID within the parent block; return -1 if not found
      const prevBlockIndex = -1 ? (!prevBlockId) : parentBlock.content.findIndex((block: any) => block["block-id"] === prevBlockId);
      parentBlock.content.splice(prevBlockIndex + 1, 0, newBlock);

      // Write the updated JSON back to the paper file
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(paperData, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error adding a new block:", error);
      throw new Error("Failed to add a new block");
    }

    return newBlockId;
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

  // Finds the block given the ID
  private getBlockById(root: Paper, blockId: string) {
    
  }

  private findAndAddSentence(
    obj: any,
    blockId: string,
    newSentence: any
  ): boolean {
    // Check if current object has the matching block-id
    if (obj["block-id"] === blockId) {
      // Find the parent object that contains this sentence
      return false; // Cannot add here directly, need parent's content array
    }

    // Look in the content array
    if (Array.isArray(obj.content)) {
      for (let i = 0; i < obj.content.length; i++) {
        const item = obj.content[i];

        // If this item has the matching blockId, insert after it
        if (item["block-id"] === blockId) {
          obj.content.splice(i + 1, 0, newSentence);
          return true;
        }

        // Otherwise, search deeper
        if (this.findAndAddSentence(item, blockId, newSentence)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 문장 삭제
   * @param blockId 삭제할 문장의 ID
   */
  async deleteSentence(blockId: string): Promise<void> {
    try {
      // 파일에서 데이터 읽기
      const fileContent = await fs.promises.readFile(this.filePath, "utf-8");
      const paperData: Paper = JSON.parse(fileContent);

      // 삭제 수행
      const deleted = this.findAndDeleteSentence(paperData, blockId);

      if (!deleted) {
        throw new Error(`Sentence with block-id ${blockId} not found`);
      }

      // 파일에 저장
      await fs.promises.writeFile(
        this.filePath,
        JSON.stringify(paperData, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error deleting sentence:", error);
      throw error;
    }
  }

  /**
   * 재귀적으로 문장을 찾아 삭제하는 헬퍼 메서드
   */
  private findAndDeleteSentence(obj: any, blockId: string): boolean {
    // 배열인 경우
    if (Array.isArray(obj)) {
      // 문장 블록을 직접 찾아서 삭제
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];

        // 이 항목이 blockId와 일치하는 문장이면 삭제
        if (item && item.type === "sentence" && item["block-id"] === blockId) {
          obj.splice(i, 1); // 배열에서 삭제
          return true;
        }

        // 재귀적으로 자식 항목 검색
        if (this.findAndDeleteSentence(item, blockId)) {
          return true;
        }
      }

      return false;
    }

    // 객체인 경우 각 속성을 검사
    if (obj && typeof obj === "object") {
      // 객체의 children이나 content 속성에서 검색
      for (const key of Object.keys(obj)) {
        if (key === "children" || key === "content") {
          if (this.findAndDeleteSentence(obj[key], blockId)) {
            // 문단에 문장이 없는 경우 빈 배열로 설정
            if (
              Array.isArray(obj[key]) &&
              obj.type === "paragraph" &&
              obj[key].length === 0
            ) {
              obj[key] = [];
            }
            return true;
          }
        }
      }
    }

    return false;
  }
}
