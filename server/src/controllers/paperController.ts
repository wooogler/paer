import { FastifyRequest, FastifyReply } from "fastify";
import { LLMService } from "../services/llmService";
import { ContentType, PaperSchema, Paper } from "@paer/shared";
import { PaperService } from "../services/paperService";
import { extractTitle, processLatexContent } from "../utils/paperUtils";
import { PaperRepository } from "../repositories/paperRepository";
import mongoose, { Types } from "mongoose";
import { RAGService } from "../services/ragService";

export class PaperController {
  private paperService: PaperService;
  private llmService: LLMService;
  private paperRepository: PaperRepository;
  private ragService: RAGService;

  constructor() {
    this.paperService = new PaperService();
    this.llmService = new LLMService();
    this.paperRepository = new PaperRepository();
    this.ragService = new RAGService();
  }

  /**
   * Get paper by ID
   */
  async getPaperById(request: FastifyRequest<{
    Params: { id: string };
    Querystring: { authorId: string }
  }>, reply: FastifyReply): Promise<any> {
    try {
      const { id: paperId } = request.params;
      const { authorId } = request.query;
      
      if (!authorId || !paperId) {
        return reply.code(400).send({ error: "authorId와 paperId are required4" });
      }
      
      const paper = await this.paperService.getPaperById(authorId, paperId);
      return paper;
    } catch (error) {
      console.error("Error in getPaperById:", error);
      return reply.code(500).send({ error: "Failed to get paper" });
    }
  }

  /**
   * Get all papers for a user
   */
  async getUserPapers(request: FastifyRequest<{ Querystring: { authorId: string } }>, reply: FastifyReply) {
    try {
      const { authorId } = request.query;
      console.log("Received authorId:", authorId);

      if (!authorId) {
        return reply.code(400).send({ error: "Author ID is required" });
      }

      let authorIdObj;
      try {
        authorIdObj = new Types.ObjectId(authorId);
      } catch (error) {
        console.error("Error converting authorId to ObjectId:", error);
        return reply.status(400).send({ error: "Invalid author ID format" });
      }

      const papers = await this.paperService.getUserPapers(authorIdObj);
      return papers;
    } catch (error) {
      console.error("Error in getUserPapers:", error);
      return reply.code(500).send({ error: "Failed to fetch user papers" });
    }
  }

  /**
   * Create new paper
   */
  async createPaper(req: FastifyRequest<{
    Body: { authorId: string; title?: string; content?: string }
  }>, reply: FastifyReply) {
    try {
      const { authorId, title, content } = req.body;
      console.log('=== Paper creation started ===');
      console.log('Input content:', content?.substring(0, 200) + '...');

      if (!authorId || !content) {
        return reply.code(400).send({ error: 'authorId and content are required' });
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
        console.log('Processed sections structure:', JSON.stringify(sectionsArray, null, 2));
        console.log('Processed section count:', sectionsArray.length);
        
        processedPaper = {
          _id: new Types.ObjectId().toString(),
          title: extractTitle(cleanedContent, 'latex') || title || 'Untitled Paper',
          summary: '',
          intent: '',
          type: 'paper',
          content: sectionsArray,
          'block-id': 'root',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorId: authorId,
          collaboratorIds: []
        };
        console.log('Final processed paper structure:', JSON.stringify(processedPaper, null, 2));
      } else {
        // For non-LaTeX content, create a single paragraph with a sentence
        processedPaper = {
          _id: new Types.ObjectId().toString(),
          title: title || 'Untitled Paper',
          summary: '',
          intent: '',
          type: 'paper',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'sentence',
              content: content,
              'block-id': 'root',
              summary: '',
              intent: ''
            }],
            'block-id': 'root',
            summary: '',
            intent: ''
          }],
          'block-id': 'root',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorId: authorId,
          collaboratorIds: []
        };
      }

      // Validate the processed paper
      const validationResult = PaperSchema.safeParse(processedPaper);
      if (!validationResult.success) {
        console.error('Paper validation failed:', validationResult.error);
        return reply.code(400).send({ 
          error: 'Invalid paper format',
          details: validationResult.error 
        });
      }

      // Remove _id for creating a new paper
      const { _id, ...paperWithoutId } = processedPaper;
      const paperToSave = { 
        ...paperWithoutId,
        authorId: authorId,
        collaboratorIds: []
      };
      
      console.log('Creating paper without ID. Repository will generate a new ID.');
      
      const savedPaper = await this.paperService.savePaper(paperToSave as any);

      // Process the paper with RAG service after successful creation
      try {
        console.log('Starting RAG processing for paper:', savedPaper._id);
        await this.ragService.processPaper(savedPaper._id, savedPaper.content);
        console.log('RAG processing completed for paper:', savedPaper._id);
      } catch (ragError) {
        console.error('Error in RAG processing:', ragError);
        // Don't fail the paper creation if RAG processing fails
      }

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
      const requestBody = request.body as { authorId: string; } & Paper;
      const { authorId, ...paperData } = requestBody;
      
      if (!authorId) {
        return reply.code(400).send({
          success: false,
          error: "authorId is required"
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
        authorId
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
        authorId: string;
        paperId: string;
        blockId: string;
        content: string;
        summary: string;
        intent: string;
        lastModifiedBy: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { authorId, paperId, blockId, content, summary, intent, lastModifiedBy } = request.body;

      if (!authorId || !paperId || !blockId || !content) {
        return reply.code(400).send({ error: "authorId, paperId, blockId, content are required" });
      }

      await this.paperService.updateSentence(
        authorId,
        paperId,
        blockId,
        content,
        summary,
        intent,
        lastModifiedBy
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
        authorId: string;
        paperId: string;
        parentBlockId: string | null;
        prevBlockId: string | null;
        blockType: ContentType;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { authorId, paperId, parentBlockId, prevBlockId, blockType } = request.body;
      
      if (!authorId || !paperId) {
        return reply.code(400).send({ error: "authorId와 paperId are required3" });
      }
      
      const newBlockId = await this.paperService.addBlock(
        authorId,
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
        authorId: string;
        paperId: string;
        targetBlockId: string;
        keyToUpdate: string;
        updatedValue: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { authorId, paperId, targetBlockId, keyToUpdate, updatedValue } = request.body;
      
      if (!authorId || !paperId || !targetBlockId || !keyToUpdate) {
        return reply.code(400).send({ error: "authorId, paperId, targetBlockId, keyToUpdate are required" });
      }
      
      await this.paperService.updateBlock(
        authorId,
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

  // deprecated
  // /**
  //  * Delete sentence
  //  */
  // async deleteSentence(
  //   request: FastifyRequest<{
  //     Body: {
  //       authorId: string;
  //       paperId: string;
  //       blockId: string;
  //     }
  //   }>,
  //   reply: FastifyReply
  // ): Promise<void> {
  //   try {
  //     const { authorId, paperId, blockId } = request.body;

  //     if (!authorId || !paperId || !blockId) {
  //       return reply.code(400).send({ error: "authorId, paperId, blockId are required" });
  //     }

  //     await this.paperService.deleteSentence(authorId, paperId, blockId);
  //     return reply.code(200).send({ success: true });
  //   } catch (error) {
  //     console.error("Error deleting sentence:", error);
  //     return reply.code(500).send({ error: "Failed to delete sentence" });
  //   }
  // }

  /**
   * Delete block
   */
  async deleteBlock(
    request: FastifyRequest<{
      Body: {
        authorId: string;
        paperId: string;
        blockId: string;
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { authorId, paperId, blockId } = request.body;

      if (!authorId || !paperId || !blockId) {
        return reply.code(400).send({ error: "authorId, paperId, blockId are required" });
      }

      await this.paperService.deleteBlock(authorId, paperId, blockId);
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
      Body: { authorId: string; collaboratorId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { authorId, collaboratorId } = request.body;

      if (!authorId || !id || !collaboratorId) {
        return reply.code(400).send({ error: "authorId, paperId, collaboratorId are required" });
      }

      await this.paperService.addCollaborator(id, authorId, collaboratorId);
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
      Querystring: { authorId: string; paperId: string }
    }>,
    reply: FastifyReply
  ) {
    try {
      const { authorId, paperId } = request.query;
      
      if (!authorId || !paperId) {
        return reply.code(400).send({ error: "authorId와 paperId are required2" });
      }
      
      // Get latest paper data
      const paper = await this.paperService.getPaperById(authorId, paperId);
      
      if (!paper) {
        return reply.code(404).send({ error: "Paper not found" });
      }

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
      Body: { authorId: string; paperId: string; renderedContent: string; blockId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { authorId, paperId, renderedContent, blockId } = request.body;
      if (!authorId || !paperId || !renderedContent || !blockId) {
        return reply.code(400).send({ error: "authorId, paperId, renderedContent, and blockId are required" });
      }
      
      const result = await this.llmService.updateRenderedSummaries(
        authorId,
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
      Querystring: { authorId: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params;
      const { authorId } = request.query;

      if (!authorId) {
        return reply.code(400).send({ 
          success: false,
          error: "authorId is required" 
        });
      }

      await this.paperService.deletePaper(authorId, id);
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
      Querystring: { authorId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { id: paperId } = request.params;
      const { authorId } = request.query;

      if (!authorId || !paperId) {
        return reply.code(400).send({ error: "authorId와 paperId are required1" });
      }

      const collaborators = await this.paperService.getCollaborators(authorId, paperId);
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
      Body: { authorId: string; collaboratorId: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { authorId, collaboratorId } = request.body;

      if (!authorId || !id || !collaboratorId) {
        return reply.code(400).send({ error: "authorId, paperId, collaboratorId are required" });
      }

      await this.paperService.removeCollaborator(id, authorId, collaboratorId);
      return { success: true };
    } catch (error) {
      console.error("Error removing collaborator:", error);
      return reply.code(500).send({ error: "Failed to remove collaborator" });
    }
  }

  /**
   * Get all members of a paper
   */
  async getMembers(
    request: FastifyRequest<{
      Params: { paperId: string };
      Querystring: { authorId: string };
    }>,
    reply: FastifyReply
  ): Promise<any> {
    try {
      const { paperId } = request.params;
      const { authorId } = request.query;

      if (!authorId || !paperId) {
        return reply.code(400).send({ error: "authorId and paperId are required" });
      }

      const members = await this.paperService.getMembers(authorId, paperId);
      return reply.send(members);
    } catch (error) {
      console.error("Error in getMembers:", error);
      return reply.code(500).send({ error: "Failed to get members" });
    }
  }
}