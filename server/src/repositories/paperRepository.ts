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
   * 사용자 ID로 문서 조회
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
        authorId: userObjectId
      });

      if (!paper) {
        return null;
      }

      // 문서 데이터 구성
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
   * 특정 유저의 모든 문서 조회
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
   * 새로운 문서 생성
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
   * 문장 업데이트
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

      // 먼저 문서를 찾음
      const paper = await PaperModel.findOne({
        _id: paperObjectId,
        authorId: userObjectId
      });

      if (!paper) {
        console.log('Paper not found with query:', {
          _id: paperObjectId,
          authorId: userObjectId
        });
        throw new Error(`Paper not found`);
      }

      // 해당 block을 찾아서 업데이트
      const updated = this.findAndUpdateSentence(
        paper.content,
        blockId,
        content,
        summary,
        intent
      );

      if (!updated) {
        throw new Error(`Sentence with block-id ${blockId} not found`);
      }

      // 문서 저장
      await paper.save();
    } catch (error) {
      console.error("Error updating sentence content:", error);
      throw new Error("Failed to update sentence content");
    }
  }

  // 블록 추가
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

      // 문서 조회
      const paper = await PaperModel.findOne({
        _id: paperId,
        authorId: authorId
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
      const parentBlock = this.findBlockById(paper.content, parentBlockId);
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

      // 변경사항 저장
      await paper.save();
    } catch (error) {
      console.error("Error adding a new block:", error);
      throw new Error("Failed to add a new block");
    }

    return newBlockId;
  }

  // 블록 업데이트
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

      // 문서 조회
      const paper = await PaperModel.findOne({
        _id: paperId,
        authorId: authorId
      });

      if (!paper) {
        throw new Error(`Paper not found`);
      }

      // 블록 찾기
      const targetBlock = this.findBlockById(paper.content, targetBlockId);

      if (!targetBlock) {
        throw new Error(`Block with ID ${targetBlockId} not found`);
      }

      // 블록 업데이트
      targetBlock[keyToUpdate] = updatedValue;
      
      // 변경사항 저장
      await paper.save();
    } catch (error) {
      console.error("Error updating a block:", error);
      throw new Error(`Failed to update block ${targetBlockId}`);
    }
  }

  // 블록 삭제
  async deleteBlock(
    authorId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid authorId or paperId");
      }

      // 문서 조회
      const paper = await PaperModel.findOne({
        _id: paperId,
        authorId: authorId
      });

      if (!paper) {
        throw new Error(`Paper not found`);
      }

      // 블록 삭제
      const deleted = this.findAndDeleteBlock(paper.content, blockId);

      if (!deleted) {
        throw new Error(`Block with ID ${blockId} not found`);
      }

      // 변경사항 저장
      await paper.save();
    } catch (error) {
      console.error("Error deleting block:", error);
      throw new Error(`Failed to delete block ${blockId}`);
    }
  }

  // 문장 삭제
  async deleteSentence(
    authorId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(authorId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid authorId or paperId");
      }

      // 문서 조회
      const paper = await PaperModel.findOne({
        _id: paperId,
        authorId: authorId
      });

      if (!paper) {
        throw new Error(`Paper not found`);
      }

      // 문장 삭제
      const deleted = this.findAndDeleteSentence(paper.content, blockId);

      if (!deleted) {
        throw new Error(`Sentence with block-id ${blockId} not found`);
      }

      // 변경사항 저장
      await paper.save();
    } catch (error) {
      console.error("Error deleting sentence:", error);
      throw new Error(`Failed to delete sentence ${blockId}`);
    }
  }

  // 협업자 추가
  async addCollaborator(
    paperId: string,
    authorId: string,
    collaboratorUsername: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(paperId)) {
        throw new Error("Invalid paperId");
      }

      // 문서 소유자 찾기 (authorId가 username인 경우 처리)
      let ownerId: mongoose.Types.ObjectId;
      if (isValidObjectId(authorId)) {
        ownerId = new mongoose.Types.ObjectId(authorId);
      } else {
        const owner = await User.findOne({ username: authorId });
        if (!owner) {
          throw new Error(`User ${authorId} not found`);
        }
        ownerId = owner._id as mongoose.Types.ObjectId;
      }

      // 협업자 사용자 찾기
      const collaborator = await User.findOne({ username: collaboratorUsername });
      if (!collaborator) {
        throw new Error(`User ${collaboratorUsername} not found`);
      }

      // 문서 조회 (소유자만 협업자 추가 가능)
      const paper = await PaperModel.findOne({
        _id: paperId,
        authorId: ownerId
      });

      if (!paper) {
        throw new Error(`Paper not found or you don't have permission`);
      }

      // 협업자가 이미 존재하는지 확인
      const collaboratorId = collaborator._id as mongoose.Types.ObjectId;
      const collaboratorIdString = collaboratorId.toString();
      
      // collaboratorIds가 없으면 초기화
      if (!paper.collaboratorIds) {
        paper.collaboratorIds = [];
      }
      
      // 이미 협업자로 등록되어 있는지 확인
      const collaboratorExists = paper.collaboratorIds.some(id => 
        (id as any)?.toString() === collaboratorIdString
      );
      
      if (collaboratorExists) {
        return; // 이미 협업자로 추가되어 있음
      }

      // 협업자 추가
      paper.collaboratorIds.push(collaboratorId as any);
      await paper.save();
    } catch (error) {
      console.error("Error adding collaborator:", error);
      throw new Error("Failed to add collaborator");
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

  // Find and update sentence
  private findAndUpdateSentence(
    obj: any,
    blockId: string,
    content: string,
    summary: string,
    intent: string
  ): boolean {
    // 현재 객체가 타겟 문장인지 확인
    if (obj && obj.type === "sentence" && obj["block-id"] === blockId) {
      obj.content = content;
      obj.summary = summary;
      obj.intent = intent;
      return true;
    }

    // 콘텐츠 배열이 있으면 재귀적으로 검색
    if (obj && obj.content && Array.isArray(obj.content)) {
      for (const child of obj.content) {
        if (this.findAndUpdateSentence(child, blockId, content, summary, intent)) {
          return true;
        }
      }
    }

    return false;
  }

  // Find and delete sentence
  private findAndDeleteSentence(obj: any, blockId: string): boolean {
    // 콘텐츠 배열이 있는 경우 검색
    if (obj && obj.content && Array.isArray(obj.content)) {
      // 직접적인 자식 중에서 삭제할 문장 찾기
      const index = obj.content.findIndex(
        (item: any) => item.type === "sentence" && item["block-id"] === blockId
      );

      if (index !== -1) {
        // 문장 삭제
        obj.content.splice(index, 1);
        return true;
      }

      // 재귀적으로 자식들 검색
      for (const child of obj.content) {
        if (this.findAndDeleteSentence(child, blockId)) {
          return true;
        }
      }
    }

    return false;
  }

  // Find and delete block
  private findAndDeleteBlock(obj: any, blockId: string): boolean {
    // 콘텐츠 배열이 있는 경우 검색
    if (obj && obj.content && Array.isArray(obj.content)) {
      // 직접적인 자식 중에서 삭제할 블록 찾기
      const index = obj.content.findIndex(
        (item: any) => item["block-id"] === blockId
      );

      if (index !== -1) {
        // 블록 삭제
        obj.content.splice(index, 1);
        return true;
      }

      // 재귀적으로 자식들 검색
      for (const child of obj.content) {
        if (this.findAndDeleteBlock(child, blockId)) {
          return true;
        }
      }
    }

    return false;
  }

  // 부모 블록 찾기
  findParentBlockByChildId(obj: any, blockId: string): any {
    // 콘텐츠 배열이 있는 경우 검색
    if (obj && obj.content && Array.isArray(obj.content)) {
      // 직접적인 자식 중에 타겟 블록이 있는지 확인
      const hasChild = obj.content.some(
        (item: any) => item["block-id"] === blockId
      );

      if (hasChild) {
        return obj;
      }

      // 재귀적으로 자식들 검색
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
   * 자식 블록값 조회
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
   * 논문 저장 (생성 또는 업데이트)
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

      // authorId가 ObjectId 형식이 아닌 경우 username으로 사용자 검색
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

      // 기존 논문 업데이트 또는 새 논문 생성
      const paperData = { ...paper } as any;
      
      // 명시적으로 paperData._id가 유효한 ObjectId인지 확인
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

        // 논문 내용 업데이트 - paper 객체에서 필요한 필드만 추출
        existingPaper.title = paper.title || 'Untitled Paper';
        
        // content 필드만 직접 업데이트 (타입 불일치 방지)
        if (paper.content) {
          existingPaper.content = paper.content as any;
        }
        
        // 기타 필드 업데이트
        if (paper.summary) existingPaper.summary = paper.summary;
        if (paper.intent) existingPaper.intent = paper.intent;
        if (paper['block-id']) existingPaper['block-id'] = paper['block-id'];
        
        await existingPaper.save();
        
        console.log('Paper updated successfully');
        
        // 응답 객체 생성
        return {
          ...paper,
          _id: existingPaper._id?.toString() || paperData._id,
          authorId: (existingPaper.authorId as any)?.toString() || authorId,
          collaboratorIds: (existingPaper.collaboratorIds || []).map(id => (id as any)?.toString() || "")
        };
      } else {
        // 새 논문 생성
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
   * 논문 삭제
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

      // 논문 존재 여부 확인
      const paperExists = await PaperModel.findById(paperId);
      if (!paperExists) {
        console.error(`Paper not found with id: ${paperId}`);
        throw new Error(`Paper not found with id: ${paperId}`);
      }

      // 사용자 권한 확인
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

      // 문서 조회 및 삭제
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
