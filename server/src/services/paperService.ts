import { ContentTypeSchema, Paper, ContentType, Content, Paper as SharedPaper } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import { LLMService } from "./llmService";
import { ContentTypeSchemaEnum } from "@paer/shared/schemas/contentSchema";
import { detectFileType, extractTitle, processLatexContent } from "../utils/paperUtils";
import mongoose from "mongoose";
import { PaperModel } from '../models/Paper';
import { UserService } from "./userService";

export class PaperService {
  private paperRepository: PaperRepository;
  private llmService: LLMService;
  private userService: UserService;

  constructor() {
    this.paperRepository = new PaperRepository();
    this.llmService = new LLMService();
    this.userService = new UserService();
  }

  /**
   * Get paper by user ID and paper ID
   */
  async getPaperById(userId: string, paperId: string): Promise<SharedPaper> {
    const paper = await this.paperRepository.getPaper(userId, paperId);
    if (!paper) {
      throw new Error("Paper not found");
    }
    return paper;
  }

  /**
   * Add block
   */
  async addBlock(
    userId: string,
    paperId: string,
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    return this.paperRepository.addBlock(userId, paperId, parentBlockId, prevBlockId, blockType);
  }

  /**
   * Update block
   */
  async updateBlock(
    userId: string,
    paperId: string,
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: string
  ): Promise<void> {
    return this.paperRepository.updateBlock(
      userId,
      paperId,
      targetBlockId,
      keyToUpdate,
      updatedValue
    );
  }

  /**
   * Delete sentence
   */
  async deleteSentence(
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    return this.paperRepository.deleteSentence(userId, paperId, blockId);
  }

  /**
   * Delete block
   */
  async deleteBlock(
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    return this.paperRepository.deleteBlock(userId, paperId, blockId);
  }

  /**
   * Save paper (MongoDB)
   */
  async savePaper(paper: Paper & { userId: string }): Promise<SharedPaper> {
    try {
      if (!paper.userId) {
        throw new Error("userId is required");
      }

      // Separate userId and the rest
      const { userId, ...sharedPaper } = paper;
      const savedPaper = await this.paperRepository.savePaper(userId, sharedPaper as SharedPaper);
      console.log("Paper saved to MongoDB");
      return savedPaper;
    } catch (error) {
      console.error("Error saving paper:", error);
      throw error;
    }
  }

  /**
   * Initialize LLM conversation
   */
  async initializeConversation(userId: string, paperId: string): Promise<void> {
    try {
      const paper = await this.getPaperById(userId, paperId);
      if (!paper) {
        throw new Error("Paper not found");
      }
      
      const paperContent = await this.paperRepository.getChildrenValues(
        paperId, 
        userId, 
        paper["block-id"] || "root",
        "content"
      );
      
      await this.llmService.initializeConversation(paperContent);
    } catch (error) {
      console.error("Error initializing conversation:", error);
      throw new Error("Failed to initialize conversation");
    }
  }

  /**
   * Ask question to LLM
   */
  async askLLM(
    text: string,
    renderedContent?: string,
    blockId?: string
  ): Promise<any> {
    return this.llmService.askLLM(text, renderedContent, blockId);
  }

  /**
   * Export document in LaTeX format
   */
  async exportToLatex(paper: Paper): Promise<string> {
    let latexContent = "";

    // Add document class and packages
    latexContent += "\\documentclass{article}\n";
    latexContent += "\\usepackage{amsmath}\n";
    latexContent += "\\usepackage{amssymb}\n";
    latexContent += "\\usepackage{graphicx}\n\n";

    // Add title
    latexContent += `\\title{${paper.title}}\n\n`;

    // Add document begin
    latexContent += "\\begin{document}\n";
    latexContent += "\\maketitle\n\n";

    // Helper function to process paragraphs
    const processParagraph = (paragraph: any): string => {
      if (
        !paragraph ||
        typeof paragraph === "string" ||
        !Array.isArray(paragraph.content)
      ) {
        return "";
      }

      const sentences = paragraph.content
        .filter((s: any) => s && typeof s !== "string" && s.type === "sentence")
        .map((s: any) => s.content)
        .join(" ");

      return sentences ? `${sentences}\n\n` : "";
    };

    // Process each section
    for (const section of paper.content) {
      if (typeof section === "string") continue;

      // Add section title
      latexContent += `\\section{${section.title}}\n\n`;

      // Process content based on type
      if (section.type === "section" && Array.isArray(section.content)) {
        for (const item of section.content) {
          if (typeof item === "string") continue;

          if (item.type === "subsection") {
            // Handle subsection
            latexContent += `\\subsection{${item.title}}\n\n`;

            // Process paragraphs or subsubsections in subsection
            if (Array.isArray(item.content)) {
              for (const subItem of item.content) {
                if (typeof subItem === "string") continue;

                if (subItem.type === "subsubsection") {
                  // Handle subsubsection
                  latexContent += `\\subsubsection{${subItem.title}}\n\n`;

                  // Process paragraphs in subsubsection
                  if (Array.isArray(subItem.content)) {
                    for (const paragraph of subItem.content) {
                      latexContent += processParagraph(paragraph);
                    }
                  }
                } else if (subItem.type === "paragraph") {
                  // Handle paragraphs directly in subsection
                  latexContent += processParagraph(subItem);
                }
              }
            }
          } else if (item.type === "paragraph") {
            // Handle paragraphs directly in section
            latexContent += processParagraph(item);
          }
        }
      }
    }

    // Add document end
    latexContent += "\\end{document}";

    return latexContent;
  }

  /**
   * Find block by specific ID
   */
  private async findBlockById(userId: string, paperId: string, blockId: string): Promise<Content | null> {
    const paper = await this.getPaperById(userId, paperId);
    if (!paper) return null;

    const findBlock = (content: Content): Content | null => {
      if (content["block-id"] === blockId) return content;
      if (Array.isArray(content.content)) {
        for (const child of content.content) {
          const found = findBlock(child);
          if (found) return found;
        }
      }
      return null;
    };

    return findBlock(paper);
  }

  /**
   * Update rendered summary
   */
  async updateRenderedSummaries(
    userId: string,
    paperId: string,
    renderedContent: string,
    blockId: string
  ) {
    try {
      const block = await this.findBlockById(userId, paperId, blockId);
      if (!block) {
        throw new Error("Block not found");
      }

      const result = await this.llmService.updateRenderedSummaries(block);

      // Get paper and replace target block with LLM result
      const paper = await this.getPaperById(userId, paperId);

      // Replace block in paper structure with LLM result
      const replaceBlock = (content: any): boolean => {
        if (typeof content === "string") return false;

        // Target block case
        if (content["block-id"] === blockId) {
          // Keep original block-id while updating other properties
          const originalBlockId = content["block-id"];

          // block-id is missing in result, use original block-id
          const parsedResult = result.apiResponse.parsedResult;

          // If result doesn't have block-id, add original block-id
          if (!parsedResult["block-id"]) {
            console.log(
              `LLM response doesn't have block-id, using original ID(${originalBlockId})`
            );
          }

          // Copy each property individually while keeping block-id
          Object.keys(parsedResult).forEach((key) => {
            if (key !== "block-id") {
              content[key] = parsedResult[key];
            }
          });

          // Explicitly keep block-id
          content["block-id"] = originalBlockId;

          return true;
        }

        // If not, check children
        if (Array.isArray(content.content)) {
          for (let i = 0; i < content.content.length; i++) {
            if (content.content[i] && typeof content.content[i] !== "string") {
              if (replaceBlock(content.content[i])) {
                return true;
              }
            }
          }
        }

        return false;
      };

      // Start from root and replace
      if (paper) {
        replaceBlock(paper);
      }

      // Save updated document
      await this.savePaper({ ...paper, userId });

      return result;
    } catch (error) {
      console.error("Error updating rendered summaries:", error);
      throw error;
    }
  }

  /**
   * Get all papers for a specific user
   */
  async getUserPapers(userId: string): Promise<Paper[]> {
    try {
      const papers = await this.paperRepository.getUserPapers(userId);
      return papers;
    } catch (error) {
      console.error("Error in getUserPapers:", error);
      throw error;
    }
  }

  /**
   * Create new paper
   */
  async createPaper(userId: string, title: string, content?: string): Promise<Paper> {
    try {
      const baseTimestamp = Math.floor(Date.now() / 1000);
      let processedContent = [];
      
      if (content) {
        const fileType = detectFileType(content);
        const extractedTitle = extractTitle(content, fileType) || title;
        
        if (fileType === 'latex') {
          processedContent = processLatexContent(content, baseTimestamp);
        } else {
          // Default to one paragraph
          processedContent = [{
            "block-id": String(baseTimestamp),
            type: "paragraph",
            content: [{
              "block-id": String(baseTimestamp + 1),
              type: "sentence",
              content: content,
              summary: "",
              intent: ""
            }],
            summary: "",
            intent: ""
          }];
        }
        
        const paper = {
          title: extractedTitle,
          "block-id": baseTimestamp.toString(),
          summary: "",
          intent: "",
          type: "paper" as const,
          content: processedContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          _id: new mongoose.Types.ObjectId().toString(),
          authorId: userId,
          collaboratorIds: []
        };
        
        // Save to MongoDB
        await this.savePaper({ ...paper, userId });
        return paper;
      } else {
        const paper = {
          title,
          "block-id": baseTimestamp.toString(),
          summary: "",
          intent: "",
          type: "paper" as const,
          content: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          _id: new mongoose.Types.ObjectId().toString(),
          authorId: userId,
          collaboratorIds: []
        };
        
        // Save to MongoDB
        await this.savePaper({ ...paper, userId });
        return paper;
      }
    } catch (error) {
      console.error("Error creating paper:", error);
      throw error;
    }
  }

  /**
   * Update sentence
   */
  async updateSentence(
    userId: string,
    paperId: string,
    blockId: string,
    content: string,
    summary: string,
    intent: string
  ): Promise<void> {
    return this.paperRepository.updateSentence(
      userId,
      paperId,
      blockId,
      content,
      summary,
      intent
    );
  }

  /**
   * Add collaborator
   */
  async addCollaborator(
    paperId: string,
    userId: string,
    collaboratorUsername: string
  ): Promise<void> {
    return this.paperRepository.addCollaborator(userId, paperId, collaboratorUsername);
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(
    paperId: string,
    userId: string,
    collaboratorUsername: string
  ): Promise<void> {
    const paper = await this.paperRepository.getPaper(userId, paperId);
    if (!paper) {
      throw new Error("Paper not found");
    }

    // Error if user is not a collaborator
    if (!paper.collaboratorIds.includes(collaboratorUsername)) {
      throw new Error("User is not a collaborator");
    }

    // Remove from collaborator list
    const updatedPaper = {
      ...paper,
      collaboratorIds: paper.collaboratorIds.filter(id => id !== collaboratorUsername)
    };

    // Save to MongoDB
    await this.paperRepository.savePaper(userId, updatedPaper);
  }

  /**
   * Get children values
   */
  async getChildrenValues(
    userId: string,
    paperId: string,
    blockId: string,
    targetKey: string
  ): Promise<string> {
    return this.paperRepository.getChildrenValues(
      paperId,
      userId,
      blockId,
      targetKey
    );
  }

  /**
   * Delete paper
   */
  async deletePaper(userId: string, paperId: string): Promise<void> {
    return this.paperRepository.deletePaper(userId, paperId);
  }

  /**
   * Get collaborators for a paper
   */
  async getCollaborators(userId: string, paperId: string) {
    const paper = await this.paperRepository.getPaper(userId, paperId);
    if (!paper) {
      throw new Error("Paper not found");
    }
    
    const collaboratorIds = paper.collaboratorIds || [];
    
    // Get user information for each collaborator ID
    const collaborators = await Promise.all(
      collaboratorIds.map(async (id) => {
        try {
          const user = await this.userService.getUserById(id);
          return {
            userId: id,
            username: user ? user.username : 'Unknown user'
          };
        } catch (error) {
          console.error(`Error fetching user for ID ${id}:`, error);
          return {
            userId: id,
            username: 'Unknown user'
          };
        }
      })
    );
    
    return collaborators;
  }
}
