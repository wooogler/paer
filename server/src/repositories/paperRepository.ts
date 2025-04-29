import { Paper as SharedPaper, ContentType, Content } from "@paer/shared";
import { PaperModel, PaperDocument } from "../models/Paper";
import { User } from "../models/User";
import mongoose, { isValidObjectId, Types } from "mongoose";
import { UserService } from "../services/userService";
import { ObjectId } from "mongodb";

export class PaperRepository {
  private userService: UserService;
  private paperModel: mongoose.Model<PaperDocument>;

  constructor() {
    this.userService = new UserService();
    this.paperModel = PaperModel;
  }

  /**
   * Get paper by author ID and paper ID
   */
  async getPaper(authorId: string, paperId: string): Promise<SharedPaper | null> {
    try {
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid authorId or paperId");
      }

      const userObjectId = new mongoose.Types.ObjectId(authorId);
      const paperObjectId = new mongoose.Types.ObjectId(paperId);

      const paper = await PaperModel.findOne({
        _id: paperObjectId,
        // authorId: userObjectId
      });

      if (!paper) {
        return null;
      }

      // Compose paper data
      return {
        _id: paper._id?.toString() || "",
        title: paper.title,
        content: paper.content as unknown as Content[],
        type: "paper",
        summary: paper.summary || "",
        intent: paper.intent || "",
        createdAt: typeof paper.createdAt === 'string' ? paper.createdAt : paper.createdAt?.toISOString(),
        updatedAt: typeof paper.updatedAt === 'string' ? paper.updatedAt : paper.updatedAt?.toISOString(),
        "block-id": paper["block-id"] || "",
        authorId: (paper.authorId as any)?.toString() || "",
        collaboratorIds: (paper.collaboratorIds || []).map(id => (id as any)?.toString() || "")
      };
    } catch (error) {
      console.error("Failed to read paper data:", error);
      throw new Error("Failed to read paper data");
    }
  }

  /**
   * Get all papers for a specific user
   */
  async getUserPapers(authorId: Types.ObjectId): Promise<SharedPaper[]> {
    try {
      console.log("Searching papers for authorId:", authorId);
      const papers = await this.paperModel.find({
        $or: [
          { authorId: authorId },
          { collaboratorIds: authorId }
        ]
      }).sort({ updatedAt: -1 });
      console.log("Found papers in repository:", papers);
      return papers.map(paper => ({
        _id: paper._id?.toString() || "",
        title: paper.title,
        content: paper.content as unknown as Content[],
        type: "paper",
        summary: paper.summary || "",
        intent: paper.intent || "",
        createdAt: typeof paper.createdAt === 'string' ? paper.createdAt : paper.createdAt?.toISOString(),
        updatedAt: typeof paper.updatedAt === 'string' ? paper.updatedAt : paper.updatedAt?.toISOString(),
        "block-id": paper["block-id"] || "",
        authorId: (paper.authorId as any)?.toString() || "",
        collaboratorIds: (paper.collaboratorIds || []).map(id => (id as any)?.toString() || "")
      }));
    } catch (error) {
      console.error("Error in getUserPapers:", error);
      throw error;
    }
  }

  /**
   * Create a new paper
   */
  async createPaper(authorId: string, title: string, content: SharedPaper): Promise<string> {
    try {
      if (!isValidObjectId(authorId)) {
        throw new Error("Invalid authorId");
      }

      const paper = await PaperModel.create({
        authorId: authorId,
        title,
        content,
        collaboratorIds: []
      });

      return (paper._id as any)?.toString() || "";
    } catch (error) {
      console.error("Failed to create paper:", error);
      throw new Error("Failed to create paper");
    }
  }

  /**
   * Update sentence content
   */
  async updateSentence(
    authorId: string,
    paperId: string,
    blockId: string,
    content: string,
    summary: string,
    intent: string
  ): Promise<void> {
    try {
      console.log('updateSentence called with:', { authorId, paperId, blockId });
      
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        console.log('Invalid IDs:', { authorId, paperId });
        throw new Error("Invalid authorId or paperId");
      }

      const userObjectId = new mongoose.Types.ObjectId(authorId);
      const paperObjectId = new mongoose.Types.ObjectId(paperId);

      // First find the paper
      const paper = await PaperModel.findOne({
        _id: paperObjectId,
        // authorId: userObjectId
      });

      if (!paper) {
        console.log('Paper not found with query:', {
          _id: paperObjectId,
          // authorId: userObjectId
        });
        throw new Error(`Paper not found`);
      }

      // Find and update the block
      const updated = this.findAndUpdateSentence(
        paper,
        blockId,
        content,
        summary,
        intent
      );

      if (!updated) {
        throw new Error(`Sentence with block-id ${blockId} not found`);
      }

      // Save the paper (by replacement)
      await PaperModel.replaceOne(
        {"_id": paperObjectId,},
        updated
      );
    } catch (error) {
      console.error("Error updating sentence content:", error);
      throw new Error("Failed to update sentence content");
    }
  }

  // Add a new block
  async addBlock(
    authorId: string,
    paperId: string,
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    let newBlockId = "-1";

    try {
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid authorId or paperId");
      }

      // Find the paper
      const paper = await PaperModel.findOne({
        _id: paperId,
        // authorId: authorId
      });

      if (!paper) {
        throw new Error(`Paper not found`);
      }

      newBlockId = Date.now().toString();

      // Create empty sentence object (to add to paragraph)
      const emptySentence = {
        type: "sentence" as const,
        summary: "",
        intent: "Provide additional information",
        content: "",
        "block-id": (Date.now() + 1).toString(), // Add +1 to ensure block ID is not duplicated
      };

      // Initialize a new block with specified block type and assigned block ID
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
        "block-id": newBlockId, // Assign a unique block ID using timestamp
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

      // Find the parent block; throw an error if not found
      const parentBlock = this.findBlockById(paper, parentBlockId);
      if (!parentBlock) {
        throw new Error(
          `Could not find the parent block with block ID ${parentBlockId}`
        );
      }

      const paperWithAddedBlock = this.findAndAddBlock(
        paper,
        parentBlockId,
        newBlock,
        prevBlockId
      );

      // Save the paper (by replacement)
      await PaperModel.replaceOne(
        {"_id": paperId,},
        paperWithAddedBlock
      );
    } catch (error) {
      console.error("Error adding a new block:", error);
      throw new Error("Failed to add a new block");
    }

    return newBlockId;
  }

  // Update block content
  async updateBlock(
    authorId: string,
    paperId: string,
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid authorId or paperId");
      }

      // Find the paper
      const paper = await PaperModel.findOne({
        _id: paperId,
        // authorId: authorId
      });

      if (!paper) {
        throw new Error(`Paper not found`);
      }

      // Find the block
      const targetBlock = this.findBlockById(paper.content, targetBlockId);

      if (!targetBlock) {
        throw new Error(`Block with ID ${targetBlockId} not found`);
      }

      // Update the block
      targetBlock[keyToUpdate] = updatedValue;
      
      // Save changes
      await paper.save();
    } catch (error) {
      console.error("Error updating a block:", error);
      throw new Error(`Failed to update block ${targetBlockId}`);
    }
  }

  // Delete a block
  async deleteBlock(
    authorId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid authorId or paperId");
      }

      // Find the paper
      const paper = await PaperModel.findOne({
        _id: paperId,
        // authorId: authorId
      });

      if (!paper) {
        throw new Error(`Paper not found`);
      }

      // Delete the block
      const deleted = this.findAndDeleteBlock(paper, blockId);

      if (!deleted) {
        throw new Error(`Block with ID ${blockId} not found`);
      }

      // Save the paper (by replacement)
      await PaperModel.replaceOne(
        {"_id": paperId,},
        deleted
      );
    } catch (error) {
      console.error("Error deleting block:", error);
      throw new Error(`Failed to delete block ${blockId}`);
    }
  }

  // Delete a sentence
  async deleteSentence(
    authorId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid authorId or paperId");
      }

      // Find the paper
      const paper = await PaperModel.findOne({
        _id: paperId,
        // authorId: authorId
      });

      if (!paper) {
        throw new Error(`Paper not found`);
      }

      // Delete the sentence
      const deleted = this.findAndDeleteSentence(paper, blockId);

      if (!deleted) {
        throw new Error(`Sentence with block-id ${blockId} not found`);
      }

      // Save changes
      await paper.save();
    } catch (error) {
      console.error("Error deleting sentence:", error);
      throw new Error(`Failed to delete sentence ${blockId}`);
    }
  }

  // Add a collaborator
  async addCollaborator(
    paperId: string,
    authorId: string,
    collaboratorId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(paperId) || !isValidObjectId(authorId) || !isValidObjectId(collaboratorId)) {
        throw new Error("Invalid paperId, authorId, or collaboratorId");
      }

      const paperObjectId = new mongoose.Types.ObjectId(paperId);
      const authorObjectId = new mongoose.Types.ObjectId(authorId);
      const collaboratorObjectId = new mongoose.Types.ObjectId(collaboratorId);

      // Find the paper (only owner can add collaborators)
      const paper = await PaperModel.findOne({
        _id: paperObjectId,
        // authorId: authorObjectId
      });

      if (!paper) {
        throw new Error(`Paper not found or you don't have permission`);
      }

      // Check if collaborator already exists
      const collaboratorExists = paper.collaboratorIds.some(id => 
        (id as any)?.toString() === collaboratorId
      );
      
      if (collaboratorExists) {
        return; // Collaborator already exists
      }

      // Add the collaborator
      paper.collaboratorIds.push(collaboratorObjectId as any);
      await paper.save();
    } catch (error) {
      console.error("Error adding collaborator:", error);
      throw new Error("Failed to add collaborator");
    }
  }

  async removeCollaborator(
    paperId: string,
    authorId: string,
    collaboratorId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(paperId) || !isValidObjectId(authorId) || !isValidObjectId(collaboratorId)) {
        throw new Error("Invalid paperId, authorId, or collaboratorId");
      }

      const paperObjectId = new mongoose.Types.ObjectId(paperId);
      const authorObjectId = new mongoose.Types.ObjectId(authorId);
      const collaboratorObjectId = new mongoose.Types.ObjectId(collaboratorId);

      // Find the paper (only owner can remove collaborators)
      const paper = await PaperModel.findOne({
        _id: paperObjectId,
        // authorId: authorObjectId
      });

      if (!paper) {
        throw new Error(`Paper not found or you don't have permission`);
      }

      // Remove the collaborator
      paper.collaboratorIds = paper.collaboratorIds.filter(id => 
        (id as any)?.toString() !== collaboratorId
      );
      await paper.save();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      throw new Error("Failed to remove collaborator");
    }
  }

  // Utility Methods
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

  // Find and add block function (search recursively)
  // This function finds the parent block by its ID and adds a new block after the specified previous block ID
  private findAndAddBlock(
    obj: any,
    parentBlockId: string,
    newBlock: any,
    prevBlockId: string | null
  ): any {
    // Check if the current object's block-id matches the parentBlockId
    if (obj && obj["block-id"] === parentBlockId) {
      // Find the index of the previous block ID within the parent block's content
      const prevBlockIndex = !prevBlockId
        ? -1
        : obj.content.findIndex((block: any) => block["block-id"] === prevBlockId);
  
      // Insert the new block after the previous block
      obj.content.splice(prevBlockIndex + 1, 0, newBlock);
      return obj; // Successfully added the block
    }
  
    // If the object has a content array, search recursively
    if (obj && obj.content && Array.isArray(obj.content)) {
      for (const child of obj.content) {
        if (this.findAndAddBlock(child, parentBlockId, newBlock, prevBlockId)) {
          return obj; // Block added successfully in a child
        }
      }
    }
  
    return null; // Block not added
  }

  // Find and update sentence
  private findAndUpdateSentence(
    obj: any,
    blockId: string,
    content: string,
    summary: string,
    intent: string
  ) {
    // Check if current object is the target sentence
    if (obj && obj.type === "sentence" && obj["block-id"] === blockId) {
      obj.content = content;
      obj.summary = summary;
      obj.intent = intent;
      return obj;
    }

    // If content array exists, search recursively
    if (obj && obj.content && Array.isArray(obj.content)) {
      for (const child of obj.content) {
        if (this.findAndUpdateSentence(child, blockId, content, summary, intent)) {
          return obj;
        }
      }
    }

    return null;
  }

  // Find and delete sentence
  private findAndDeleteSentence(obj: any, blockId: string): boolean {
    // If content array exists, search
    if (obj && obj.content && Array.isArray(obj.content)) {
      // Find the sentence to delete among direct children
      const index = obj.content.findIndex(
        (item: any) => item.type === "sentence" && item["block-id"] === blockId
      );

      if (index !== -1) {
        // Delete the sentence
        obj.content.splice(index, 1);
        return true;
      }

      // Search recursively through children
      for (const child of obj.content) {
        if (this.findAndDeleteSentence(child, blockId)) {
          return true;
        }
      }
    }

    return false;
  }

  // Find and delete block
  private findAndDeleteBlock(obj: any, blockId: string): any {
    // If content array exists, search
    if (obj && obj.content && Array.isArray(obj.content)) {
      // Find the block to delete among direct children
      const index = obj.content.findIndex(
        (item: any) => item["block-id"] === blockId
      );

      if (index !== -1) {
        // Delete the block
        obj.content.splice(index, 1);
        return obj;
      }

      // Search recursively through children
      for (const child of obj.content) {
        if (this.findAndDeleteBlock(child, blockId)) {
          return obj;
        }
      }
    }

    return null;
  }

  // Find parent block by child ID
  findParentBlockByChildId(obj: any, blockId: string): any {
    // If content array exists, search
    if (obj && obj.content && Array.isArray(obj.content)) {
      // Check if target block exists among direct children
      const hasChild = obj.content.some(
        (item: any) => item["block-id"] === blockId
      );

      if (hasChild) {
        return obj;
      }

      // Search recursively through children
      for (const child of obj.content) {
        const found = this.findParentBlockByChildId(child, blockId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Get children values
   */
  getChildrenValues(authorId: string, paperId: string, blockId: string, targetKey: string): Promise<string> {
    return this.getPaper(authorId, paperId).then(paper => {
      if (!paper) {
        throw new Error('Paper not found');
      }
      
      const block = this.findBlockById(paper, blockId);
      if (!block) {
        throw new Error(`Block with ID ${blockId} not found`);
      }

      let values: string[] = [];
      
      const findSentenceValues = (block: any): void => {
        if (block.type === 'sentence') {
          values.push(block[targetKey] || '');
        } else if (block.content && Array.isArray(block.content)) {
          for (const childBlock of block.content) {
            findSentenceValues(childBlock);
          }
        }
      };
      
      findSentenceValues(block);
      return values.join(' ');
    });
  }

  /**
   * Save paper (create or update)
   */
  async savePaper(authorId: string, paper: SharedPaper): Promise<SharedPaper> {
    try {
      console.log('Attempting to save paper for authorId:', authorId);
      console.log('Paper object received:', JSON.stringify({
        _id: paper._id,
        title: paper.title,
        'block-id': paper['block-id']
      }));
      
      let userObjectId: mongoose.Types.ObjectId;

      // If authorId is not in ObjectId format, search by username
      if (!isValidObjectId(authorId)) {
        console.log('authorId is not a valid ObjectId, searching by username');
        const user = await User.findOne({ username: authorId });
        if (!user) {
          console.log('User not found by username:', authorId);
          throw new Error("User not found");
        }
        userObjectId = user._id as mongoose.Types.ObjectId;
        console.log('Found user by username, userObjectId:', userObjectId);
      } else {
        userObjectId = new mongoose.Types.ObjectId(authorId);
        console.log('authorId is a valid ObjectId, converted to:', userObjectId);
      }

      // Update existing paper or create new one
      const paperData = { ...paper } as any;
      
      // Explicitly check if paperData._id is a valid ObjectId
      if (paperData._id && isValidObjectId(paperData._id)) {
        console.log(`Updating existing paper with ID: ${paperData._id}`);
        
        const existingPaper = await PaperModel.findOne({
          _id: paperData._id,
          $or: [
            { authorId: authorId },
            { authorId: userObjectId }
          ]
        });

        if (!existingPaper) {
          throw new Error("Paper not found or user does not have permission to update");
        }

        // Update paper content - extract only necessary fields from paper object
        existingPaper.title = paper.title || 'Untitled Paper';
        
        // Update content field directly (to avoid type mismatch)
        if (paper.content) {
          existingPaper.content = paper.content as any;
        }
        
        // Update other fields
        if (paper.summary) existingPaper.summary = paper.summary;
        if (paper.intent) existingPaper.intent = paper.intent;
        if (paper['block-id']) existingPaper['block-id'] = paper['block-id'];
        
        await existingPaper.save();
        
        console.log('Paper updated successfully');
        
        // Create response object
        return {
          ...paper,
          _id: existingPaper._id?.toString() || paperData._id,
          authorId: (existingPaper.authorId as any)?.toString() || authorId,
          collaboratorIds: (existingPaper.collaboratorIds || []).map(id => (id as any)?.toString() || "")
        };
      } else {
        // Create new paper
        console.log('Creating new paper - no _id provided');
        const newPaper = await PaperModel.create({
          authorId: userObjectId,
          title: paper.title || 'Untitled Paper',
          content: paper.content || [],
          collaboratorIds: [],
          summary: paper.summary || "",
          intent: paper.intent || "",
          type: "paper",
          "block-id": paper["block-id"] || Date.now().toString()
        });

        console.log('New paper created with ID:', newPaper._id);
        return {
          ...paper,
          _id: newPaper._id?.toString() || new mongoose.Types.ObjectId().toString(),
          authorId: authorId,
          collaboratorIds: []
        };
      }
    } catch (error) {
      console.error("Failed to save paper:", error);
      throw new Error(`Failed to save paper: ${(error as Error).message}`);
    }
  }

  /**
   * Delete paper
   */
  async deletePaper(authorId: string, paperId: string): Promise<void> {
    try {
      console.log(`Attempting to delete paper. authorId: ${authorId}, paperId: ${paperId}`);
      
      if (!isValidObjectId(authorId)) {
        console.error(`Invalid authorId format: ${authorId}`);
        throw new Error("Invalid authorId format");
      }
      
      if (!isValidObjectId(paperId)) {
        console.error(`Invalid paperId format: ${paperId}`);
        throw new Error("Invalid paperId format");
      }

      // Check if paper exists
      const paperExists = await PaperModel.findById(paperId);
      if (!paperExists) {
        console.error(`Paper not found with id: ${paperId}`);
        throw new Error(`Paper not found with id: ${paperId}`);
      }

      // Check user permissions
      const userObjectId = new mongoose.Types.ObjectId(authorId);
      const hasPermission = await PaperModel.findOne({
        _id: paperId,
        $or: [
          { authorId: authorId },
          { authorId: userObjectId }
        ]
      });

      if (!hasPermission) {
        console.error(`User ${authorId} does not have permission to delete paper ${paperId}`);
        throw new Error("User does not have permission to delete this paper");
      }

      // Find and delete the paper
      const result = await PaperModel.findOneAndDelete({
        _id: paperId,
        $or: [
          { authorId: authorId },
          { authorId: userObjectId }
        ]
      });

      if (!result) {
        console.error(`Failed to delete paper. Paper: ${paperId}, User: ${authorId}`);
        throw new Error("Failed to delete paper");
      }
      
      console.log(`Successfully deleted paper ${paperId} for user ${authorId}`);
    } catch (error) {
      console.error("Error deleting paper:", error);
      throw new Error(`Failed to delete paper: ${(error as Error).message}`);
    }
  }
}
