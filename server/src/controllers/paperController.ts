import { FastifyRequest, FastifyReply } from "fastify";
import { LLMService } from "../services/llmService";
import { ContentType, PaperSchema, Paper } from "@paer/shared";
import { PaperService } from "../services/paperService";
import { detectFileType, extractTitle, processLatexContent } from "../utils/paperUtils";
import { PaperRepository } from "../repositories/paperRepository";

export class PaperController {
  private paperService: PaperService;
  private llmService: LLMService;
  private paperRepository: PaperRepository;

  constructor() {
    this.paperService = new PaperService();
    this.llmService = new LLMService();
    this.paperRepository = new PaperRepository();
  }

  /**
   * 문서 가져오기 (특정 사용자와 문서 ID 기준)
   */
  async getPaperById(request: FastifyRequest<{
    Querystring: { userId: string; paperId: string }
  }>, reply: FastifyReply): Promise<any> {
    try {
      const { userId, paperId } = request.query;
      
      if (!userId || !paperId) {
        return reply.code(400).send({ error: "userId와 paperId가 필요합니다" });
      }
      
      const paper = await this.paperService.getPaperById(userId, paperId);
      return paper;
    } catch (error) {
      console.error("Error in getPaperById:", error);
      return reply.code(500).send({ error: "문서를 가져오는데 실패했습니다" });
    }
  }

  /**
   * 특정 사용자의 모든 문서 목록 조회
   */
  async getUserPapers(request: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) {
    try {
      const { userId } = request.query;
      if (!userId) {
        return reply.code(400).send({ error: "userId가 필요합니다" });
      }
      const papers = await this.paperService.getUserPapers(userId);
      return papers;
    } catch (error) {
      console.error("Error in getUserPapers:", error);
      return reply.code(500).send({ error: "사용자의 문서 목록을 가져오는데 실패했습니다" });
    }
  }

  /**
   * 새 문서 생성
   */
  async createPaper(request: FastifyRequest<{
    Body: { userId: string; title: string; content?: string }
  }>, reply: FastifyReply) {
    try {
      const { userId, title, content } = request.body;
      
      if (!userId) {
        return reply.code(400).send({ error: "userId가 필요합니다" });
      }
      
      const paper = await this.paperService.createPaper(userId, title, content);
      return reply.send(paper);
    } catch (error) {
      console.error("Error in createPaper:", error);
      return reply.status(500).send({ error: "문서 생성에 실패했습니다" });
    }
  }

  /**
   * 문서 저장 (새 문서 또는 기존 문서 업데이트)
   */
  async savePaper(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const requestBody = request.body as { userId: string; } & Paper;
      const { userId, ...paperData } = requestBody;
      
      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: "userId가 필요합니다"
        });
      }

      // Validate paperData against Paper schema
      const validationResult = PaperSchema.safeParse(paperData);
      if (!validationResult.success) {
        return reply.code(400).send({
          success: false,
          error: "잘못된 문서 형식입니다",
          details: validationResult.error
        });
      }

      await this.paperService.savePaper({
        ...validationResult.data,
        userId
      });
      
      return reply.send({
        success: true,
        message: "문서가 성공적으로 저장되었습니다"
      });
    } catch (error) {
      console.error("Error saving paper:", error);
      return reply.code(500).send({
        success: false,
        error: "문서 저장에 실패했습니다"
      });
    }
  }

  /**
   * 문장 업데이트
   */
  async updateSentence(
    request: FastifyRequest<{
      Body: {
        userId: string;
        paperId: string;
        blockId: string;
        content: string;
        summary: string;
        intent: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { userId, paperId, blockId, content, summary, intent } = request.body;

      if (!userId || !paperId || !blockId || !content) {
        return reply.code(400).send({ error: "userId, paperId, blockId, content가 필요합니다" });
      }

      await this.paperService.updateSentence(
        userId,
        paperId,
        blockId,
        content,
        summary,
        intent
      );

      return reply.send({ success: true });
    } catch (error) {
      console.error("Error in updateSentence:", error);
      return reply
        .code(500)
        .send({ error: "문장 업데이트에 실패했습니다" });
    }
  }

  /**
   * 블록 추가
   */
  async addBlock(
    request: FastifyRequest<{
      Body: {
        userId: string;
        paperId: string;
        parentBlockId: string | null;
        prevBlockId: string | null;
        blockType: ContentType;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { userId, paperId, parentBlockId, prevBlockId, blockType } = request.body;
      
      if (!userId || !paperId) {
        return reply.code(400).send({ error: "userId와 paperId가 필요합니다" });
      }
      
      const newBlockId = await this.paperService.addBlock(
        userId,
        paperId,
        parentBlockId,
        prevBlockId,
        blockType
      );
      return { success: true, blockId: newBlockId };
    } catch (error) {
      console.error("Error in addBlock:", error);
      return reply.code(500).send({ error: "블록 추가에 실패했습니다" });
    }
  }

  /**
   * 블록 업데이트
   */
  async updateBlock(
    request: FastifyRequest<{
      Body: {
        userId: string;
        paperId: string;
        targetBlockId: string;
        keyToUpdate: string;
        updatedValue: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { userId, paperId, targetBlockId, keyToUpdate, updatedValue } = request.body;
      
      if (!userId || !paperId || !targetBlockId || !keyToUpdate) {
        return reply.code(400).send({ error: "userId, paperId, targetBlockId, keyToUpdate가 필요합니다" });
      }
      
      await this.paperService.updateBlock(
        userId,
        paperId,
        targetBlockId,
        keyToUpdate,
        updatedValue
      );
      return { success: true };
    } catch (error) {
      console.error("Error in updateBlock:", error);
      return reply.code(500).send({ error: "블록 업데이트에 실패했습니다" });
    }
  }

  /**
   * 문장 삭제
   */
  async deleteSentence(
    request: FastifyRequest<{
      Body: {
        userId: string;
        paperId: string;
        blockId: string;
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId, paperId, blockId } = request.body;

      if (!userId || !paperId || !blockId) {
        return reply.code(400).send({ error: "userId, paperId, blockId가 필요합니다" });
      }

      await this.paperService.deleteSentence(userId, paperId, blockId);
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error("Error deleting sentence:", error);
      return reply.code(500).send({ error: "문장 삭제에 실패했습니다" });
    }
  }

  /**
   * 블록 삭제
   */
  async deleteBlock(
    request: FastifyRequest<{
      Body: {
        userId: string;
        paperId: string;
        blockId: string;
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId, paperId, blockId } = request.body;

      if (!userId || !paperId || !blockId) {
        return reply.code(400).send({ error: "userId, paperId, blockId가 필요합니다" });
      }

      await this.paperService.deleteBlock(userId, paperId, blockId);
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error("Error deleting block:", error);
      return reply.code(500).send({ error: "블록 삭제에 실패했습니다" });
    }
  }

  /**
   * LLM에 질문하기
   */
  async askLLM(
    request: FastifyRequest<{
      Body: { text: string; renderedContent?: string; blockId?: string };
    }>,
    reply: FastifyReply
  ) {
    const { text, renderedContent, blockId } = request.body;

    try {
      const response = await this.llmService.askLLM(
        text,
        renderedContent,
        blockId
      );
      return reply.send({
        success: true,
        result: response,
      });
    } catch (error) {
      console.error("Error in askLLM:", error);
      const errorMessage = (error as Error).message;
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * 협업자 추가
   */
  async addCollaborator(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { userId: string; collaboratorUsername: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { userId, collaboratorUsername } = request.body;

      if (!userId || !id || !collaboratorUsername) {
        return reply.code(400).send({ error: "userId, paperId, collaboratorUsername이 필요합니다" });
      }

      await this.paperService.addCollaborator(id, userId, collaboratorUsername);
      return { success: true };
    } catch (error) {
      console.error("Error adding collaborator:", error);
      return reply.code(500).send({ error: "협업자 추가에 실패했습니다" });
    }
  }

  /**
   * 문서 내용 처리 (텍스트를 구조화된 문서로 변환)
   */
  async processPaper(
    request: FastifyRequest<{
      Body: { content: string; userId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { content, userId } = request.body;

      if (!content) {
        return reply.code(400).send({
          success: false,
          error: "content가 필요합니다"
        });
      }

      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: "userId가 필요합니다"
        });
      }

      // 파일 유형 감지
      const fileType = detectFileType(content);
      
      // 제목 추출
      const title = extractTitle(content, fileType);
      
      // 현재 시간 기준 타임스탬프
      const baseTimestamp = Date.now();
      
      // 콘텐츠 처리
      let processedContent;
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

      // 처리된 페이퍼 객체 생성
      const processedPaper = {
        title,
        summary: "",
        intent: "",
        type: "paper",
        content: processedContent,
        "block-id": String(baseTimestamp - 1),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        userId: userId
      };

      // 반환
      return reply.send({
        success: true,
        paper: processedPaper
      });
    } catch (error) {
      console.error("Error processing paper:", error);
      return reply.code(500).send({
        success: false,
        error: "문서 처리에 실패했습니다"
      });
    }
  }

  /**
   * 문서를 LaTeX 형식으로 내보내기
   */
  async exportPaper(
    request: FastifyRequest<{
      Querystring: { userId: string; paperId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { userId, paperId } = request.query;
      
      if (!userId || !paperId) {
        return reply.code(400).send({ error: "userId와 paperId가 필요합니다" });
      }
      
      // 최신 문서 데이터 가져오기
      const paper = await this.paperService.getPaperById(userId, paperId);

      // LaTeX로 변환
      const latexContent = await this.paperService.exportToLatex(paper);

      return {
        success: true,
        content: latexContent,
      };
    } catch (error) {
      console.error("Error exporting paper:", error);
      const errorMessage = (error as Error).message;
      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * 렌더링된 요약 업데이트
   */
  async updateRenderedSummaries(
    request: FastifyRequest<{
      Body: { userId: string; paperId: string; renderedContent: string; blockId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { userId, paperId, renderedContent, blockId } = request.body;
      
      if (!userId || !paperId) {
        return reply.code(400).send({ error: "userId와 paperId가 필요합니다" });
      }
      
      const result = await this.paperService.updateRenderedSummaries(
        userId,
        paperId,
        renderedContent,
        blockId
      );
      return reply.send({ success: true, apiResponse: result });
    } catch (error) {
      console.error("Error updating rendered summaries:", error);
      return reply
        .status(500)
        .send({ success: false, error: "요약 업데이트에 실패했습니다" });
    }
  }
}