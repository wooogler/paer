import { Paper as SharedPaper, ContentType, Content } from "@paer/shared";
import { Paper, IPaper } from "../models/Paper";
import { User } from "../models/User";
import mongoose, { isValidObjectId } from "mongoose";
import { UserService } from "../services/userService";

export class PaperRepository {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * 사용자 ID로 문서 조회
   */
  async getPaper(userId: string, paperId: string): Promise<SharedPaper | null> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid userId or paperId");
      }

      const paper = await Paper.findOne({
        _id: paperId,
        $or: [
          { userId: userId },
          { collaborators: userId }
        ]
      });

      if (!paper) {
        return null;
      }

      return paper.content;
    } catch (error) {
      console.error("Failed to read paper data:", error);
      throw new Error("Failed to read paper data");
    }
  }

  /**
   * 특정 유저의 모든 문서 조회
   */
  async getUserPapers(userId: string): Promise<SharedPaper[]> {
    try {
      console.log('getUserPapers called with userId:', userId);
      
      let userObjectId: mongoose.Types.ObjectId;

      // userId가 ObjectId 형식이 아닌 경우 username으로 검색
      if (!isValidObjectId(userId)) {
        console.log('userId is not a valid ObjectId, searching by username');
        const user = await User.findOne({ username: userId });
        if (!user) {
          console.log('User not found by username:', userId);
          throw new Error("User not found");
        }
        userObjectId = user._id as mongoose.Types.ObjectId;
        console.log('Found user by username, userObjectId:', userObjectId);
      } else {
        userObjectId = new mongoose.Types.ObjectId(userId);
        console.log('userId is a valid ObjectId, converted to:', userObjectId);
      }

      // MongoDB에 저장된 userId가 문자열일 수도 있고 ObjectId 타입일 수도 있으므로 
      // 두 가지 경우 모두 검색
      console.log('Searching papers with query:', {
        $or: [
          { userId: userId },  // 문자열로 검색
          { userId: userObjectId },  // ObjectId로 검색
          { collaborators: userId },  // 문자열로 검색
          { collaborators: userObjectId }  // ObjectId로 검색
        ]
      });

      const papers = await Paper.find({
        $or: [
          { userId: userId },  // 문자열로 검색
          { userId: userObjectId },  // ObjectId로 검색
          { collaborators: userId },  // 문자열로 검색
          { collaborators: userObjectId }  // ObjectId로 검색
        ]
      });

      console.log('Found papers:', papers);

      return papers.map(paper => ({
        ...paper.content,
        _id: (paper._id as mongoose.Types.ObjectId).toString(),
        userId: paper.userId.toString(),
        collaborators: paper.collaborators.map(id => (id as mongoose.Types.ObjectId).toString())
      }));
    } catch (error) {
      console.error("Failed to get user papers:", error);
      throw new Error("Failed to get user papers");
    }
  }

  /**
   * 새로운 문서 생성
   */
  async createPaper(userId: string, title: string, content: SharedPaper): Promise<string> {
    try {
      if (!isValidObjectId(userId)) {
        throw new Error("Invalid userId");
      }

      const paper = await Paper.create({
        userId,
        title,
        content,
        collaborators: []
      });

      return (paper._id as mongoose.Types.ObjectId).toString();
    } catch (error) {
      console.error("Failed to create paper:", error);
      throw new Error("Failed to create paper");
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
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid userId or paperId");
      }

      // 먼저 문서를 찾음
      const paper = await Paper.findOne({
        _id: paperId,
        $or: [
          { userId: userId },
          { collaborators: userId }
        ]
      });

      if (!paper) {
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
    userId: string,
    paperId: string,
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    let newBlockId = "-1";

    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid userId or paperId");
      }

      // 문서 조회
      const paper = await Paper.findOne({
        _id: paperId,
        $or: [
          { userId: userId },
          { collaborators: userId }
        ]
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
    userId: string,
    paperId: string,
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid userId or paperId");
      }

      // 문서 조회
      const paper = await Paper.findOne({
        _id: paperId,
        $or: [
          { userId: userId },
          { collaborators: userId }
        ]
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
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid userId or paperId");
      }

      // 문서 조회
      const paper = await Paper.findOne({
        _id: paperId,
        $or: [
          { userId: userId },
          { collaborators: userId }
        ]
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
    userId: string,
    paperId: string,
    blockId: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid userId or paperId");
      }

      // 문서 조회
      const paper = await Paper.findOne({
        _id: paperId,
        $or: [
          { userId: userId },
          { collaborators: userId }
        ]
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
    userId: string,
    paperId: string,
    collaboratorUsername: string
  ): Promise<void> {
    try {
      if (!isValidObjectId(userId) || !isValidObjectId(paperId)) {
        throw new Error("Invalid userId or paperId");
      }

      // 협업자 사용자 찾기
      const collaborator = await User.findOne({ username: collaboratorUsername });
      if (!collaborator) {
        throw new Error(`User ${collaboratorUsername} not found`);
      }

      // 문서 조회 (소유자만 협업자 추가 가능)
      const paper = await Paper.findOne({
        _id: paperId,
        userId: userId
      });

      if (!paper) {
        throw new Error(`Paper not found or you don't have permission`);
      }

      // 협업자가 이미 존재하는지 확인
      const collaboratorId = collaborator._id as unknown as mongoose.Types.ObjectId;
      if (paper.collaborators.includes(collaboratorId)) {
        return; // 이미 협업자로 추가되어 있음
      }

      // 협업자 추가
      paper.collaborators.push(collaboratorId);
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
  getChildrenValues(paperId: string, userId: string, blockId: string, targetKey: string): Promise<string> {
    return this.getPaper(userId, paperId).then(paper => {
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
  async savePaper(userId: string, paper: SharedPaper): Promise<SharedPaper> {
    try {
      console.log('Attempting to save paper for userId:', userId);
      
      let userObjectId: mongoose.Types.ObjectId;

      // userId가 ObjectId 형식이 아닌 경우 username으로 사용자 검색
      if (!isValidObjectId(userId)) {
        console.log('userId is not a valid ObjectId, searching by username');
        const user = await User.findOne({ username: userId });
        if (!user) {
          console.log('User not found by username:', userId);
          throw new Error("User not found");
        }
        userObjectId = user._id as mongoose.Types.ObjectId;
        console.log('Found user by username, userObjectId:', userObjectId);
      } else {
        userObjectId = new mongoose.Types.ObjectId(userId);
        console.log('userId is a valid ObjectId, converted to:', userObjectId);
      }

      // 기존 논문 업데이트 또는 새 논문 생성
      const paperData = { ...paper } as any;
      
      if (paperData._id) {
        console.log(`Updating existing paper with ID: ${paperData._id}`);
        
        const existingPaper = await Paper.findOne({
          _id: paperData._id,
          $or: [
            { userId: userId },
            { userId: userObjectId },
            { collaborators: userId },
            { collaborators: userObjectId }
          ]
        });

        if (!existingPaper) {
          throw new Error("Paper not found or user does not have permission to update");
        }

        // 논문 내용 업데이트
        existingPaper.content = paper;
        existingPaper.title = paper.title || 'Untitled Paper';
        await existingPaper.save();
        
        console.log('Paper updated successfully');
        return {
          ...paper,
          _id: (existingPaper._id as mongoose.Types.ObjectId).toString(),
          userId: (existingPaper.userId as mongoose.Types.ObjectId).toString(),
          collaborators: existingPaper.collaborators.map(id => (id as mongoose.Types.ObjectId).toString())
        } as any;
      } else {
        // 새 논문 생성
        console.log('Creating new paper');
        const newPaper = await Paper.create({
          userId: userObjectId,
          title: paper.title || 'Untitled Paper',
          content: paper,
          collaborators: []
        });

        console.log('New paper created with ID:', newPaper._id);
        return {
          ...paper,
          _id: (newPaper._id as mongoose.Types.ObjectId).toString(),
          userId: (newPaper.userId as mongoose.Types.ObjectId).toString(),
          collaborators: []
        } as any;
      }
    } catch (error) {
      console.error("Failed to save paper:", error);
      throw new Error(`Failed to save paper: ${(error as Error).message}`);
    }
  }
}
