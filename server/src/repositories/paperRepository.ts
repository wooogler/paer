import fs from "fs";
import path from "path";
import { Paper, ContentType } from "@paer/shared";
import { object } from "zod";

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

  // async updateSentenceContent(blockId: string, content: string): Promise<void> {
  //   try {
  //     // Read the current data
  //     const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

  //     // Find and update the sentence with matching block-id
  //     const updated = this.findAndUpdateSentence(paperData, blockId, content);

  //     if (!updated) {
  //       throw new Error(`Sentence with block-id ${blockId} not found`);
  //     }

  //     // Write the updated data back to the file
  //     fs.writeFileSync(
  //       this.filePath,
  //       JSON.stringify(paperData, null, 2),
  //       "utf-8"
  //     );
  //   } catch (error) {
  //     console.error("Error updating sentence content:", error);
  //     throw new Error("Failed to update sentence content");
  //   }
  // }

  async updateSentence(blockId: string, content: string, summary: string, intent: string): Promise<void> {
    try {
      // Read the current data
      const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));

      // Find and update the sentence with matching block-id
      const updated = this.findAndUpdateSentence(paperData, blockId, content, summary, intent);

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

  getChildrenValues(blockId: string, targetKey: string): string {
    const paperData = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
    const targetBlock = this.findBlockById(paperData, blockId);
    // Assumes target block exists and is not a sentence
    let result = '';
    for (const child of targetBlock.content) {
      result += child[targetKey];
      if (child[targetKey].endsWith('.')) { result += '.'}
      result += '';
    }
    return result;
  }

  findParentBlockByChildId(obj: any, blockId: string): any {
    if (!obj) {
      obj = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
    }

    // If the object has a content array, search recursively
    if (obj && obj.content && Array.isArray(obj.content)) {
      for (const child of obj.content) {
        // If the child matches the blockId, return the current object as the parent
        if (child["block-id"] === blockId) {
          return obj;
        }
        // Recursively search in the child's content
        const found = this.findParentBlockByChildId(child, blockId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  findParentBlockIdByChildId(obj: any, blockId: string): any {
    if (!obj) {
      obj = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
    }

    // If the object has a content array, search recursively
    if (obj && obj.content && Array.isArray(obj.content)) {
      for (const child of obj.content) {
        // If the child matches the blockId, return the current object as the parent
        if (child["block-id"] === blockId) {
          return obj["block-id"];
        }
        // Recursively search in the child's content
        const found = this.findParentBlockByChildId(child, blockId);
        if (found) {
          return found["block-id"];
        }
      }
    }
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

  // private findAndUpdateSentence(
  //   obj: any,
  //   blockId: string,
  //   content: string
  // ): boolean {
  //   // Check if current object has the matching block-id
  //   if (obj["block-id"] === blockId) {
  //     if (obj.type === "sentence") {
  //       obj.content = content;
  //       return true;
  //     }
  //   }

  //   private findAndUpdateSentence(
  //     obj: any,
  //     blockId: string,
  //     content: string,
  //     summary: string,
  //     intent: string
  //   ): boolean {
  //     // Check if current object has the matching block-id
  //     if (obj["block-id"] === blockId) {
  //       if (obj.type === "sentence") {
  //         obj.content = content;
  //         obj.summary = summary;
  //         obj.intent = intent;
  //         return true;
  //       }
  //     }

  //   // If not found at this level, recursively search in the content array
  //   if (Array.isArray(obj.content)) {
  //     for (const item of obj.content) {
  //       if (this.findAndUpdateSentence(item, blockId, content)) {
  //         return true;
  //       }
  //     }
  //   }

  //   return false;
  // }

  private findAndUpdateSentence(
    obj: any,
    blockId: string,
    content: string,
    summary: string,
    intent: string
  ): boolean {
    // Check if current object has the matching block-id
    if (obj["block-id"] === blockId) {
      if (obj.type === "sentence") {
        obj.content = content;
        obj.summary = summary;
        obj.intent = intent;
        return true;
      }
    }

    // If not found at this level, recursively search in the content array
    if (Array.isArray(obj.content)) {
      for (const item of obj.content) {
        if (this.findAndUpdateSentence(item, blockId, content, summary, intent)) {
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
      // Read data from file
      const fileContent = await fs.promises.readFile(this.filePath, "utf-8");
      const paperData: Paper = JSON.parse(fileContent);

      // Perform deletion
      const deleted = this.findAndDeleteSentence(paperData, blockId);

      if (!deleted) {
        throw new Error(`Sentence with block-id ${blockId} not found`);
      }

      // Save to file
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
   * Helper method to recursively find and delete a sentence
   */
  private findAndDeleteSentence(obj: any, blockId: string): boolean {
    // If it's an array
    if (Array.isArray(obj)) {
      // Find and delete the sentence block directly
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];

        // If this item is a sentence matching the blockId, delete it
        if (item && item.type === "sentence" && item["block-id"] === blockId) {
          obj.splice(i, 1); // Remove from array
          return true;
        }

        // Recursively search child items
        if (this.findAndDeleteSentence(item, blockId)) {
          return true;
        }
      }

      return false;
    }

    // If it's an object, check each property
    if (obj && typeof obj === "object") {
      // Search in the children or content properties of the object
      for (const key of Object.keys(obj)) {
        if (key === "children" || key === "content") {
          if (this.findAndDeleteSentence(obj[key], blockId)) {
            // If a paragraph has no sentences, set to empty array
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
   * Delete a block
   * @param blockId ID of the block to delete
   */
  async deleteBlock(blockId: string): Promise<void> {
    try {
      // Read data from file
      const fileContent = await fs.promises.readFile(this.filePath, "utf-8");
      const paperData: Paper = JSON.parse(fileContent);

      // Perform deletion
      const deleted = this.findAndDeleteBlock(paperData, blockId);

      if (!deleted) {
        throw new Error(`Block with block-id ${blockId} not found`);
      }

      // Save to file
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
   * Helper method to recursively find and delete a block
   */
  private findAndDeleteBlock(obj: any, blockId: string): boolean {
    // If it's an array
    if (Array.isArray(obj)) {
      // Find and delete the block directly
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];

        // If this item matches the blockId, delete it
        if (item && item["block-id"] === blockId) {
          obj.splice(i, 1); // Remove from array
          return true;
        }

        // Recursively search child items
        if (this.findAndDeleteBlock(item, blockId)) {
          return true;
        }
      }

      return false;
    }

    // If it's an object, check each property
    if (obj && typeof obj === "object") {
      // Search in the children or content properties of the object
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
