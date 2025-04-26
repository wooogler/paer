import { FastifyRequest, FastifyReply } from "fastify";
import { LLMService } from "../services/llmService";
import { ContentType, PaperSchema, Paper } from "@paer/shared";
import { PaperService } from "../services/paperService";
import { extractTitle, processLatexContent } from "../utils/paperUtils";
import { PaperRepository } from "../repositories/paperRepository";
import mongoose, { Types } from "mongoose";

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
   * Get paper by ID
   */
  async getPaperById(request: FastifyRequest<{
    Querystring: { userId: string; paperId: string }
  }>, reply: FastifyReply): Promise<any> {
    try {
      const { userId, paperId } = request.query;
      
      if (!userId || !paperId) {
        return reply.code(400).send({ error: "userId와 paperId are required" });
      }
      
      const paper = await this.paperService.getPaperById(userId, paperId);
      return paper;
    } catch (error) {
      console.error("Error in getPaperById:", error);
      return reply.code(500).send({ error: "Failed to get paper" });
    }
  }

  /**
   * Get all papers for a user
   */
  async getUserPapers(request: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) {
    try {
      const { userId } = request.query;
      if (!userId) {
        return reply.code(400).send({ error: "userId is required" });
      }
      const papers = await this.paperService.getUserPapers(userId);
      return papers;
    } catch (error) {
      console.error("Error in getUserPapers:", error);
      return reply.code(500).send({ error: "Failed to get user papers" });
    }
  }

  /**
   * Create new paper
   */
  async createPaper(req: FastifyRequest<{
    Body: { userId: string; title?: string; content?: string }
  }>, reply: FastifyReply) {
    try {
      const { userId, title, content } = req.body;
      console.log('=== Paper creation started ===');
      console.log('Input content:', content?.substring(0, 200) + '...');

      if (!userId || !content) {
        return reply.code(400).send({ error: 'userId and content are required' });
      }

      let processedPaper: Paper;
      
      // LaTeX file detection condition modified
      const isLatexFile = content.includes('\\documentclass') || 
                         content.includes('\\begin{document}') || 
                         content.includes('\\section{');
      
      if (isLatexFile) {
        console.log('LaTeX file detected');
        // Remove comments from content
        const cleanedContent = content.replace(/^%.*$/gm, '').trim();
        console.log('Comments removed content:', cleanedContent.substring(0, 200) + '...');
        
        const sectionsArray = processLatexContent(cleanedContent, Date.now());
        console.log('Processed section count:', sectionsArray.length);
        
        processedPaper = {
          _id: new Types.ObjectId().toString(),
          title: extractTitle(cleanedContent, 'latex'),
          summary: '',
          intent: '',
          type: 'paper',
          content: sectionsArray,
          'block-id': 'root',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorId: userId,
          collaboratorIds: []
        };
      } else {
        processedPaper = {
          _id: new Types.ObjectId().toString(),
          title: title || extractTitle(content, 'text'),
          summary: '',
          intent: '',
          type: 'paper',
          content: [{
            type: 'sentence' as ContentType,
            content: content,
            'block-id': 'root',
            summary: '',
            intent: ''
          }],
          'block-id': 'root',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorId: userId,
          collaboratorIds: []
        };
      }

      // Remove _id for creating a new paper
      const { _id, ...paperWithoutId } = processedPaper;
      const paperToSave = { 
        ...paperWithoutId,
        userId 
      };
      
      console.log('Creating paper without ID. Repository will generate a new ID.');
      
      const savedPaper = await this.paperService.savePaper(paperToSave as any);
      return reply.code(201).send({ 
        message: 'Paper created successfully',
        paperId: savedPaper._id
      });
    } catch (error) {
      console.error('Error creating paper:', error);
      return reply.code(500).send({ error: 'Failed to create paper' });
    }
  }

  /**
   * Update paper
   */
  async savePaper(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    try {
      const requestBody = request.body as { userId: string; } & Paper;
      const { userId, ...paperData } = requestBody;
      
      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: "userId is required"
        });
      }

      // Validate paperData against Paper schema
      const validationResult = PaperSchema.safeParse(paperData);
      if (!validationResult.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid paper format",
          details: validationResult.error
        });
      }

      await this.paperService.savePaper({
        ...validationResult.data,
        userId
      });
      
      return reply.send({
        success: true,
        message: "Paper saved successfully"
      });
    } catch (error) {
      console.error("Error saving paper:", error);
      return reply.code(500).send({
        success: false,
        error: "Failed to save paper"
      });
    }
  }

  /**
   * Update sentence
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
        return reply.code(400).send({ error: "userId, paperId, blockId, content are required" });
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
        .send({ error: "Failed to update sentence" });
    }
  }

  /**
   * Add block
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
        return reply.code(400).send({ error: "userId와 paperId are required" });
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
      return reply.code(500).send({ error: "Failed to add block" });
    }
  }

  /**
   * Update block
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
        return reply.code(400).send({ error: "userId, paperId, targetBlockId, keyToUpdate are required" });
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
      return reply.code(500).send({ error: "Failed to update block" });
    }
  }

  /**
   * Delete sentence
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
        return reply.code(400).send({ error: "userId, paperId, blockId are required" });
      }

      await this.paperService.deleteSentence(userId, paperId, blockId);
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error("Error deleting sentence:", error);
      return reply.code(500).send({ error: "Failed to delete sentence" });
    }
  }

  /**
   * Delete block
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
        return reply.code(400).send({ error: "userId, paperId, blockId are required" });
      }

      await this.paperService.deleteBlock(userId, paperId, blockId);
      return reply.code(200).send({ success: true });
    } catch (error) {
      console.error("Error deleting block:", error);
      return reply.code(500).send({ error: "Failed to delete block" });
    }
  }

  /**
   * Initialize LLM conversation
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
   * Add collaborator
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
        return reply.code(400).send({ error: "userId, paperId, collaboratorUsername are required" });
      }

      await this.paperService.addCollaborator(id, userId, collaboratorUsername);
      return { success: true };
    } catch (error) {
      console.error("Error adding collaborator:", error);
      return reply.code(500).send({ error: "Failed to add collaborator" });
    }
  }

  /**
   * Export to LaTeX
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
        return reply.code(400).send({ error: "userId와 paperId are required" });
      }
      
      // Get latest paper data
      const paper = await this.paperService.getPaperById(userId, paperId);

      // Convert to LaTeX
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
   * Update rendered summaries
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
        return reply.code(400).send({ error: "userId와 paperId are required" });
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
        .send({ success: false, error: "Failed to update rendered summaries" });
    }
  }

  /**
   * Delete paper
   */
  async deletePaper(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;
      const { userId } = request.query;

      if (!userId) {
        return reply.code(400).send({ 
          success: false,
          error: "userId is required" 
        });
      }

      await this.paperService.deletePaper(userId, id);
      return reply.send({ 
        success: true,
        message: "Paper deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting paper:", error);
      return reply.code(500).send({ 
        success: false,
        error: "Failed to delete paper" 
      });
    }
  }

  /**
   * Get collaborators
   */
  async getCollaborators(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { id: paperId } = request.params;
      const { userId } = request.query;

      if (!userId || !paperId) {
        return reply.code(400).send({ error: "userId와 paperId are required" });
      }

      const collaborators = await this.paperService.getCollaborators(userId, paperId);
      return reply.send(collaborators);
    } catch (error) {
      console.error("Error in getCollaborators:", error);
      return reply.code(500).send({ error: "Failed to get collaborators" });
    }
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(
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
        return reply.code(400).send({ error: "userId, paperId, collaboratorUsername are required" });
      }

      await this.paperService.removeCollaborator(id, userId, collaboratorUsername);
      return { success: true };
    } catch (error) {
      console.error("Error removing collaborator:", error);
      return reply.code(500).send({ error: "Failed to remove collaborator" });
    }
  }
}