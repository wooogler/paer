import { ContentTypeSchema, Paper, ContentType, Content, Paper as SharedPaper } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import { LLMService } from "./llmService";
import { ContentTypeSchemaEnum } from "@paer/shared/schemas/contentSchema";
import { detectFileType, extractTitle, processLatexContent } from "../utils/paperUtils";
import mongoose, { Types } from "mongoose";
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
  async getPaperById(authorId: string, paperId: string): Promise<Paper | null> {
    try {
      const paper = await this.paperRepository.getPaper(authorId, paperId);
      return paper;
    } catch (error) {
      console.error("Error in getPaperById:", error);
      throw error;
    }
  }

  /**
   * Add block
   */
  async addBlock(
    authorId: string,
    paperId: string,
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    try {
      const newBlockId = await this.paperRepository.addBlock(
        authorId,
        paperId,
        parentBlockId,
        prevBlockId,
        blockType
      );
      return newBlockId;
    } catch (error) {
      console.error("Error in addBlock:", error);
      throw error;
    }
  }

  /**
   * Update block
   * THIS IS NOT USED FOR UPDATING SENTENCE CONTENT!
   */
  async updateBlock(
    authorId: string,
    paperId: string,
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: any
  ): Promise<void> {
    try {
      // Update the block itself
      await this.paperRepository.updateBlock(
        authorId,
        paperId,
        targetBlockId,
        keyToUpdate,
        updatedValue
      );

      // // Add the record to edit history
      // await this.paperRepository.addEditHistory(
      //   authorId,
      //   paperId,
      //   targetBlockId,
      //   keyToUpdate,
      //   updatedValue
      // );

    } catch (error) {
      console.error("Error in updateBlock:", error);
      throw error;
    }
  }

  /**
   * Delete sentence
   */
  async deleteSentence(
    authorId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      await this.paperRepository.deleteSentence(authorId, paperId, blockId);
    } catch (error) {
      console.error("Error in deleteSentence:", error);
      throw error;
    }
  }

  /**
   * Delete block
   */
  async deleteBlock(
    authorId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      await this.paperRepository.deleteBlock(authorId, paperId, blockId);
    } catch (error) {
      console.error("Error in deleteBlock:", error);
      throw error;
    }
  }

  /**
   * Save paper (MongoDB)
   */
  async savePaper(paper: Paper & { authorId: string }): Promise<Paper> {
    try {
      if (!paper.authorId) {
        throw new Error("authorId is required");
      }

      const { authorId, ...paperData } = paper;
      const paperToSave = {
        ...paperData,
        authorId,
        collaboratorIds: paperData.collaboratorIds || []
      };

      const savedPaper = await this.paperRepository.savePaper(authorId, paperToSave);
      console.log("Paper saved to MongoDB:", savedPaper._id);
      return savedPaper;
    } catch (error) {
      console.error("Error in savePaper:", error);
      throw error;
    }
  }

  /**
   * Initialize LLM conversation
   */
  async initializeConversation(authorId: string, paperId: string): Promise<void> {
    try {
      const paper = await this.getPaperById(authorId, paperId);
      if (!paper) {
        throw new Error("Paper not found");
      }
      
      const paperContent = await this.paperRepository.getChildrenValues(
        paperId, 
        authorId, 
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
  async findBlockById(authorId: string, paperId: string, blockId: string): Promise<Content | null> {
    const paper = await this.getPaperById(authorId, paperId);
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
    authorId: string,
    paperId: string,
    renderedContent: string,
    blockId: string
  ): Promise<void> {
    try {
      await this.paperRepository.updateBlock(
        authorId,
        paperId,
        blockId,
        'renderedContent',
        renderedContent
      );
    } catch (error) {
      console.error("Error in updateRenderedSummaries:", error);
      throw error;
    }
  }

  /**
   * Get all papers for a specific user
   */
  async getUserPapers(authorId: Types.ObjectId): Promise<Paper[]> {
    try {
      console.log("Getting papers for authorId:", authorId);
      const papers = await this.paperRepository.getUserPapers(authorId);
      console.log("Found papers:", papers);
      return papers;
    } catch (error) {
      console.error("Error in getUserPapers:", error);
      throw error;
    }
  }

  /**
   * Create new paper
   */
  async createPaper(authorId: string, title: string, content?: string): Promise<Paper> {
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
          authorId,
          collaboratorIds: []
        };
        
        // Save to MongoDB
        await this.savePaper({ ...paper, authorId });
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
          authorId,
          collaboratorIds: []
        };
        
        // Save to MongoDB
        await this.savePaper({ ...paper, authorId });
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
    authorId: string,
    paperId: string,
    blockId: string,
    content: string,
    summary?: string,
    intent?: string,
    lastModifiedBy?: string
  ): Promise<void> {
    try {
      await this.paperRepository.updateSentence(
        authorId,
        paperId,
        blockId,
        content,
        summary || '',
        intent || '',
        lastModifiedBy || authorId
      );
    } catch (error) {
      console.error("Error in updateSentence:", error);
      throw error;
    }
  }

  /**
   * Add collaborator
   */
  async addCollaborator(
    paperId: string,
    authorId: string,
    collaboratorId: string
  ): Promise<void> {
    try {
      await this.paperRepository.addCollaborator(paperId, authorId, collaboratorId);
    } catch (error) {
      console.error("Error in addCollaborator:", error);
      throw error;
    }
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(
    paperId: string,
    authorId: string,
    collaboratorId: string
  ): Promise<void> {
    try {
      await this.paperRepository.removeCollaborator(paperId, authorId, collaboratorId);
    } catch (error) {
      console.error("Error in removeCollaborator:", error);
      throw error;
    }
  }

  /**
   * Get children values
   */
  async getChildrenValues(
    authorId: string,
    paperId: string,
    blockId: string,
    targetKey: string
  ): Promise<string> {
    return this.paperRepository.getChildrenValues(
      paperId,
      authorId,
      blockId,
      targetKey
    );
  }

  /**
   * Delete paper
   */
  async deletePaper(authorId: string, paperId: string): Promise<void> {
    try {
      await this.paperRepository.deletePaper(authorId, paperId);
    } catch (error) {
      console.error("Error in deletePaper:", error);
      throw error;
    }
  }

  /**
   * Get collaborators for a paper
   */
  async getCollaborators(authorId: string, paperId: string): Promise<string[]> {
    try {
      const paper = await this.paperRepository.getPaper(authorId, paperId);
      return paper?.collaboratorIds || [];
    } catch (error) {
      console.error("Error in getCollaborators:", error);
      throw error;
    }
  }

  /**
   * call paperRepository to get all members (author + collaborators)
   */
  async getMembers(authorId: string, paperId: string): Promise<string[]> {
    try {
      // check if paper exists
      // get member
      // if requestor is a member, return all members
      // otherwise, throw error
      const paper = await this.paperRepository.getPaper(authorId, paperId);
      if (!paper) {
        throw new Error("Paper not found");
      }
      const members = await this.paperRepository.getMembers(paperId);
      if (authorId !== paper.authorId && !paper.collaboratorIds.includes(authorId)) {
        throw new Error("You are not authorized to access this paper's members");
      }
      if (!members) {
        throw new Error("No members found");
      }
      return members;
    } catch (error) {
      console.error("Error in getMembers:", error);
      throw error;
    }
  }
}
