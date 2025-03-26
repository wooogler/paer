import fs from "fs";
import path from "path";
import { Paper, ContentType } from "@paer/shared";

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

  // Adds a new block to the document
  // Assumption: The client knows the parent block ID
  async addBlock(
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    let newBlockId = "-1";

    try {
      // Reads the current paper file as JSON
      const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

      newBlockId = Date.now().toString();

      // Create empty sentence object (to add to paragraph)
      const emptySentence = {
        type: "sentence" as const,
        summary: "",
        intent: "Provide additional information",
        content: "",
        "block-id": (Date.now() + 1).toString(), // Add +1 to ensure block ID is not duplicated
      };

      // Initializes a new block w/ specified block type and assigned block ID
      const newBlock = {
        type: blockType,
        // For paragraph type, set summary to "Empty Summary"
        summary: blockType === "paragraph" ? "Empty Summary" : "",
        intent: "Empty Intent",
        // For paragraph type, initialize with an array containing an empty sentence
        content:
          blockType === "sentence"
            ? ""
            : blockType === "paragraph"
            ? [emptySentence]
            : [],
        "block-id": newBlockId, // Assigns a unique block ID using timestamp
        ...(blockType !== "sentence" && {
          title:
            blockType === "section"
              ? "New Section"
              : blockType === "subsection"
              ? "New Subsection"
              : "",
        }),
      };
      if (!parentBlockId) {
        throw new Error(
          `Could not add the new block because parent block is not provided.`
        );
      }

      // Finds the parent block; throws an error if not found
      const parentBlock = this.getBlockById(
        paperData,
        parentBlockId,
        blockType
      );
      if (!parentBlock) {
        throw new Error(
          `Could not find the parent block with block ID ${parentBlockId}`
        );
      }

      // Finds the index of the previous block ID within the parent block; return -1 if not found
      const prevBlockIndex = !prevBlockId
        ? -1
        : parentBlock.content.findIndex(
            (block: any) => block["block-id"] === prevBlockId
          );
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

  // Updates a block with the specified key-value pair
  async updateBlock(
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: string
  ): Promise<void> {
    try {
      // Reads the current paper file as JSON
      const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

      // Find the block
      const targetBlock = this.findBlockById(paperData, targetBlockId);

      if (!targetBlock) {
        throw new Error(`Block with ID ${targetBlockId} not found`);
      }

      // Updates the target block with the specified key-value pair
      targetBlock[keyToUpdate] = updatedValue;

      // Write the updated JSON back to the paper file
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(paperData, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error updating a block:", error);
      throw new Error(`Failed to update block ${targetBlockId}`);
    }
  }

  // Find block by ID function (search recursively)
  private findBlockById(obj: any, blockId: string): any {
    // Check if the current object's block-id matches the target ID
    if (obj && obj["block-id"] === blockId) {
      return obj;
    }

    // If the object has a content array, search recursively
    if (obj && obj.content && Array.isArray(obj.content)) {
      for (const child of obj.content) {
        const found = this.findBlockById(child, blockId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  // Finds the block given the ID
  private getBlockById(root: any, blockId: string, blockType: ContentType) {
    const matchingId = (block: any) => block["block-id"] === blockId;
    switch (blockType) {
      case "section":
        return root;

      case "subsection":
        return root.content.find(matchingId);

      case "paragraph":
        for (const section of root.content) {
          if (section.content) {
            const match = section.content?.find(matchingId);
            if (match) return match;
          }
        }
        return undefined;

      case "sentence":
        for (const section of root.content) {
          for (const subsection of section.content) {
            const match = subsection.content.find(matchingId);
            if (match) return match;
          }
        }
        return undefined;

      default:
        return undefined;
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

  /**
   * Delete a sentence
   * @param blockId ID of the sentence to delete
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

  /**
   * 블록 삭제
   * @param blockId 삭제할 블록의 ID
   */
  async deleteBlock(blockId: string): Promise<void> {
    try {
      // 파일에서 데이터 읽기
      const fileContent = await fs.promises.readFile(this.filePath, "utf-8");
      const paperData: Paper = JSON.parse(fileContent);

      // 삭제 수행
      const deleted = this.findAndDeleteBlock(paperData, blockId);

      if (!deleted) {
        throw new Error(`Block with block-id ${blockId} not found`);
      }

      // 파일에 저장
      await fs.promises.writeFile(
        this.filePath,
        JSON.stringify(paperData, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error deleting block:", error);
      throw error;
    }
  }

  /**
   * 재귀적으로 블록을 찾아 삭제하는 헬퍼 메서드
   */
  private findAndDeleteBlock(obj: any, blockId: string): boolean {
    // 배열인 경우
    if (Array.isArray(obj)) {
      // 블록을 직접 찾아서 삭제
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];

        // 이 항목이 blockId와 일치하는 블록이면 삭제
        if (item && item["block-id"] === blockId) {
          obj.splice(i, 1); // 배열에서 삭제
          return true;
        }

        // 재귀적으로 자식 항목 검색
        if (this.findAndDeleteBlock(item, blockId)) {
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
          if (this.findAndDeleteBlock(obj[key], blockId)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
