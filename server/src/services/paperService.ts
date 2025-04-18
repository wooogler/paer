import { ContentTypeSchema, Paper, ContentType, Content } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import fs from "fs";
import { LLMService } from "./llmService";
import path from "path";
import process from "process";
import { PaperSchema } from "@paer/shared/schemas/paperSchema";
import { ContentTypeSchemaEnum } from "@paer/shared/schemas/contentSchema";
import { findOrCreateDataDir, processLatexContent, detectFileType, extractTitle } from "../utils/paperUtils";

export class PaperService {
  private paperRepository: PaperRepository;
  private paperPath: string;
  private llmService: LLMService;
  private dataDir: string;

  constructor(paperPath: string) {
    this.paperRepository = new PaperRepository();
    this.paperPath = paperPath;
    this.llmService = new LLMService();
    this.dataDir = findOrCreateDataDir();
  }

  // 레거시 메서드 - 호환성 유지
  async getPaper(): Promise<Paper> {
    return this.getPaperById("default", "default");
  }

  // 새로운 메서드 - userId와 paperId로 문서 조회
  async getPaperById(userId: string, paperId: string): Promise<Paper> {
    const paper = await this.paperRepository.getPaper(userId, paperId);
    if (!paper) {
      throw new Error("Paper not found");
    }
    return paper;
  }

  async updateSentenceMetadata(blockId: string): Promise<void> {
    return;
  }

  // 레거시 메서드 - 호환성 유지
  async addBlock(
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    return this.addBlockWithUser("default", "default", parentBlockId, prevBlockId, blockType);
  }

  // 새로운 메서드 - userId와 paperId로 블록 추가
  async addBlockWithUser(
    userId: string,
    paperId: string,
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    return this.paperRepository.addBlock(userId, paperId, parentBlockId, prevBlockId, blockType);
  }

  // 레거시 메서드 - 호환성 유지
  async updateBlock(
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: string
  ): Promise<void> {
    return this.updateBlockWithUser("default", "default", targetBlockId, keyToUpdate, updatedValue);
  }

  // 새로운 메서드 - userId와 paperId로 블록 업데이트
  async updateBlockWithUser(
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

  // 레거시 메서드 - 호환성 유지
  async deleteSentence(blockId: string): Promise<void> {
    return this.deleteSentenceWithUser("default", "default", blockId);
  }

  // 새로운 메서드 - userId와 paperId로 문장 삭제
  async deleteSentenceWithUser(
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    return this.paperRepository.deleteSentence(userId, paperId, blockId);
  }

  // 레거시 메서드 - 호환성 유지
  async deleteBlock(blockId: string): Promise<void> {
    return this.deleteBlockWithUser("default", "default", blockId);
  }

  // 새로운 메서드 - userId와 paperId로 블록 삭제
  async deleteBlockWithUser(
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    return this.paperRepository.deleteBlock(userId, paperId, blockId);
  }

  async savePaper(paper: Paper): Promise<void> {
    try {
      const paperJsonPath = path.join(this.dataDir, "paper.json");
      const validatedPaper = PaperSchema.parse(paper);
      fs.writeFileSync(paperJsonPath, JSON.stringify(validatedPaper, null, 2));
    } catch (error) {
      console.error("Error saving paper:", error);
      throw error;
    }
  }

  /**
   * Initialize the conversation with the paper context
   */
  async initializeConversation(): Promise<void> {
    try {
      const paper = await this.getPaper();
      if (!paper) {
        throw new Error("Paper not found");
      }
      
      const paperContent = await this.paperRepository.getChildrenValues(
        "default", 
        "default", 
        paper["block-id"] || "root",
        "content"
      );
      
      await this.llmService.initializeConversation(paperContent);
    } catch (error) {
      console.error("Error initializing conversation:", error);
      throw new Error("Failed to initialize conversation");
    }
  }

  async askLLM(
    text: string,
    renderedContent?: string,
    blockId?: string
  ): Promise<any> {
    return this.llmService.askLLM(text, renderedContent, blockId);
  }

  /**
   * Convert paper JSON back to LaTeX format
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

  private async findBlockById(blockId: string): Promise<Content | null> {
    const paper = await this.getPaper();
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

  async updateRenderedSummaries(renderedContent: string, blockId: string) {
    try {
      const block = await this.findBlockById(blockId);
      if (!block) {
        throw new Error("Block not found");
      }

      const result = await this.llmService.updateRenderedSummaries(block);

      // Get the paper and directly replace the target block with the LLM result
      const paper = await this.getPaper();

      // Replace the block in the paper structure with the LLM result
      const replaceBlock = (content: any): boolean => {
        if (typeof content === "string") return false;

        // If this is the target block, replace it
        if (content["block-id"] === blockId) {
          // 원래 block-id를 보존하면서 다른 속성만 업데이트
          const originalBlockId = content["block-id"];

          // block-id가 없는 경우 원래 block-id를 사용
          const parsedResult = result.apiResponse.parsedResult;

          // 결과에 block-id가 없으면 원래 block-id를 추가
          if (!parsedResult["block-id"]) {
            console.log(
              `LLM 응답에 block-id가 없어서 원래 ID(${originalBlockId})를 사용합니다.`
            );
          }

          // Object.assign 대신 각 속성을 개별적으로 복사하면서 block-id는 유지
          Object.keys(parsedResult).forEach((key) => {
            if (key !== "block-id") {
              content[key] = parsedResult[key];
            }
          });

          // block-id 명시적으로 보존
          content["block-id"] = originalBlockId;

          return true;
        }

        // Otherwise check children
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

      // Start replacement from the root
      if (paper) {
        replaceBlock(paper);
      }

      // Save the updated paper
      await this.savePaper(paper);

      return result;
    } catch (error) {
      console.error("Error updating rendered summaries:", error);
      throw error;
    }
  }

  /**
   * 특정 사용자의 모든 문서 목록 조회
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
   * 새 문서 생성
   */
  async createPaper(userId: string, title: string, content?: string): Promise<Paper> {
    try {
      const paperJsonPath = path.join(this.dataDir, "paper.json");

      if (content) {
        const baseTimestamp = Math.floor(Date.now() / 1000);
        const processedContent = processLatexContent(content, baseTimestamp);

        const paper = {
          title: title || extractTitle(content, detectFileType(content)),
          "block-id": baseTimestamp.toString(),
          summary: "",
          intent: "",
          type: ContentTypeSchemaEnum.Paper,
          content: processedContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        };

        const validatedPaper = PaperSchema.parse(paper);
        fs.writeFileSync(paperJsonPath, JSON.stringify(validatedPaper, null, 2));
        return validatedPaper;
      } else {
        const paper = {
          title,
          "block-id": Math.floor(Date.now() / 1000).toString(),
          summary: "",
          intent: "",
          type: ContentTypeSchemaEnum.Paper,
          content: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        };

        const validatedPaper = PaperSchema.parse(paper);
        fs.writeFileSync(paperJsonPath, JSON.stringify(validatedPaper, null, 2));
        return validatedPaper;
      }
    } catch (error) {
      console.error("Error creating paper:", error);
      throw error;
    }
  }

  /**
   * 문장 업데이트
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
   * 협업자 추가
   */
  async addCollaborator(
    paperId: string,
    userId: string,
    collaboratorUsername: string
  ): Promise<void> {
    return this.paperRepository.addCollaborator(
      userId,
      paperId,
      collaboratorUsername
    );
  }

  /**
   * 자식 블록 값 조회
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
}
