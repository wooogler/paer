import { ContentTypeSchema, Paper, ContentType, Content, Paper as SharedPaper } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import { LLMService } from "./llmService";
import { ContentTypeSchemaEnum } from "@paer/shared/schemas/contentSchema";
import { detectFileType, extractTitle, processLatexContent } from "../utils/paperUtils";
import mongoose from "mongoose";
import { Paper as PaperModel } from '../models/Paper';
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
   * 특정 사용자와 문서 ID로 문서 조회
   */
  async getPaperById(userId: string, paperId: string): Promise<SharedPaper> {
    const paper = await this.paperRepository.getPaper(userId, paperId);
    if (!paper) {
      throw new Error("Paper not found");
    }
    return paper;
  }

  /**
   * 블록 추가
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
   * 블록 업데이트
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
   * 문장 삭제
   */
  async deleteSentence(
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    return this.paperRepository.deleteSentence(userId, paperId, blockId);
  }

  /**
   * 블록 삭제
   */
  async deleteBlock(
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    return this.paperRepository.deleteBlock(userId, paperId, blockId);
  }

  /**
   * 논문 저장 (MongoDB)
   */
  async savePaper(paper: Paper & { userId: string }): Promise<SharedPaper> {
    try {
      if (!paper.userId) {
        throw new Error("userId is required");
      }

      // userId와 나머지 부분 분리
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
   * LLM 대화 초기화
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
   * LLM에 질문하기
   */
  async askLLM(
    text: string,
    renderedContent?: string,
    blockId?: string
  ): Promise<any> {
    return this.llmService.askLLM(text, renderedContent, blockId);
  }

  /**
   * 문서를 LaTeX 형식으로 내보내기
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
   * 특정 ID로 블록 찾기
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
   * 렌더링된 요약 업데이트
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

      // 페이퍼 가져오기 및 대상 블록을 LLM 결과로 대체
      const paper = await this.getPaperById(userId, paperId);

      // 페이퍼 구조에서 블록을 LLM 결과로 대체
      const replaceBlock = (content: any): boolean => {
        if (typeof content === "string") return false;

        // 대상 블록인 경우 대체
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

        // 그렇지 않으면 자식들 확인
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

      // 루트에서 시작하여 대체
      if (paper) {
        replaceBlock(paper);
      }

      // 업데이트된 문서 저장
      await this.savePaper({ ...paper, userId });

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
      const baseTimestamp = Math.floor(Date.now() / 1000);
      let processedContent = [];
      
      if (content) {
        const fileType = detectFileType(content);
        const extractedTitle = extractTitle(content, fileType) || title;
        
        if (fileType === 'latex') {
          processedContent = processLatexContent(content, baseTimestamp);
        } else {
          // 기본적으로 문단 하나로 처리
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
        
        // MongoDB에 저장
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
        
        // MongoDB에 저장
        await this.savePaper({ ...paper, userId });
        return paper;
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
    return this.paperRepository.addCollaborator(userId, paperId, collaboratorUsername);
  }

  /**
   * 협업자 제거
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

    // 협업자가 아닌 경우 에러
    if (!paper.collaboratorIds.includes(collaboratorUsername)) {
      throw new Error("User is not a collaborator");
    }

    // 협업자 목록에서 제거
    const updatedPaper = {
      ...paper,
      collaboratorIds: paper.collaboratorIds.filter(id => id !== collaboratorUsername)
    };

    // MongoDB에 저장
    await this.paperRepository.savePaper(userId, updatedPaper);
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

  /**
   * 논문 삭제
   */
  async deletePaper(userId: string, paperId: string): Promise<void> {
    return this.paperRepository.deletePaper(userId, paperId);
  }

  /**
   * 논문의 협업자 목록 조회
   */
  async getCollaborators(userId: string, paperId: string) {
    const paper = await this.paperRepository.getPaper(userId, paperId);
    if (!paper) {
      throw new Error("Paper not found");
    }
    
    const collaboratorIds = paper.collaboratorIds || [];
    
    // 각 collaborator ID에 대한 사용자 정보 조회
    const collaborators = await Promise.all(
      collaboratorIds.map(async (id) => {
        try {
          const user = await this.userService.getUserById(id);
          return {
            userId: id,
            username: user ? user.username : '알 수 없는 사용자'
          };
        } catch (error) {
          console.error(`Error fetching user for ID ${id}:`, error);
          return {
            userId: id,
            username: '알 수 없는 사용자'
          };
        }
      })
    );
    
    return collaborators;
  }
}
