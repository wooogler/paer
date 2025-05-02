import { type Paper, ContentType } from "@paer/shared";
import axios from "axios";
import { useAppStore } from "../store/useAppStore";
import { useContentStore } from "../store/useContentStore";

// API instance 생성
export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// API function definition
export const getPapers = async (authorId: string): Promise<Paper[]> => {
  const response = await api.get(`/papers?authorId=${authorId}`);
  return response.data.map((paper: any) => ({
    ...paper,
    authorId: paper.authorId,
    collaboratorIds: paper.collaboratorIds || []
  }));
};

export const getPaperById = async (paperId: string, authorId: string) => {
  try {
    const response = await api.get(`/papers/${paperId}`, {
      params: { authorId },
    });
    return response.data;
  } catch (error) {
    console.error("Error in getPaperById:", error);
    throw error;
  }
};

export const createPaper = async (paperData: any) => {
  try {
    const response = await api.post("/papers", paperData);
    return response.data;
  } catch (error) {
    console.error("Error creating paper:", error);
    throw error;
  }
};

export const updatePaper = async (paperId: string, paperData: any) => {
  try {
    const response = await api.put(`/papers/${paperId}`, paperData);
    return response.data;
  } catch (error) {
    console.error("Error updating paper:", error);
    throw error;
  }
};

export const deletePaper = async (paperId: string, authorId: string) => {
  try {
    const response = await api.delete(`/papers/${paperId}`, {
      params: { authorId }
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting paper:", error);
    throw error;
  }
};

// Update a sentence by block-id
export const updateSentenceContent = async (
  blockId: string,
  content: string,
  summary: string,
  intent: string
) => {
  const authorId = useAppStore.getState().userId;
  const paperId = useContentStore.getState().selectedPaperId;
  
  if (!authorId || !paperId) {
    throw new Error("Author ID or Paper ID is missing");
  }

  const response = await api.patch("/papers/sentence", {
    authorId,
    paperId,
    blockId,
    content,
    summary,
    intent,
  });
  return response.data;
};

// deprecated
// /**
//  * API function to delete a sentence
//  * @param blockId ID of the sentence to delete
//  */
// export const deleteSentence = async (blockId: string) => {
//   const response = await api.delete(`/papers/block/${blockId}`);
//   return response.data;
// };

// Update sentence intent
export const updateSentenceIntent = async (
  blockId: string,
  intent: string
): Promise<void> => {
  try {
    await api.patch(`/papers/block/${blockId}/intent`, { intent });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating sentence intent:", error.message);
    }
    throw new Error("Failed to update sentence intent");
  }
};

// Update sentence summary
export const updateSentenceSummary = async (
  blockId: string,
  summary: string
): Promise<void> => {
  try {
    await api.patch(`/papers/block/${blockId}/summary`, { summary });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating sentence summary:", error.message);
    }
    throw new Error("Failed to update sentence summary");
  }
};

// Add a new block (section, subsection, paragraph)
export const addBlock = async (
  parentBlockId: string | null,
  prevBlockId: string | null,
  blockType: string
) => {
  const authorId = useAppStore.getState().userId;
  const paperId = useContentStore.getState().selectedPaperId;
  
  if (!authorId || !paperId) {
    throw new Error("Author ID or Paper ID is missing");
  }

  const response = await api.post("/papers/block", {
    authorId,
    paperId,
    parentBlockId,
    prevBlockId,
    blockType,
  });
  return response.data;
};

// Update block intent
export const updateBlockIntent = async (
  authorId: string,
  paperId: string | null,
  blockId: string,
  intent: string
) => {
  const response = await api.patch(`/papers/block/intent`, {
    authorId,
    paperId,
    targetBlockId: blockId,
    updatedValue: intent
  });
  return response.data;
};

// Update block summary
export const updateBlockSummary = async (
  blockId: string,
  blockType: string,
  summary: string
) => {
  const response = await api.put(`/papers/${blockId}/summary`, {
    blockType,
    summary,
  });
  return response.data;
};

// Update block title
export const updateBlockTitle = async (
  authorId: string,
  paperId: string | null,
  blockId: string,
  title: string
) => {
  const response = await api.patch(`/papers/block/title`, {
    authorId,
    paperId,
    targetBlockId: blockId,
    updatedValue: title
  });
  return response.data;
};

/**
 * API function to delete a block
 * @param blockId ID of the block to delete
 */
export const deleteBlock = async (
  blockId: string
) => {
  const authorId = useAppStore.getState().userId;
  const paperId = useContentStore.getState().selectedPaperId;
  
  if (!authorId || !paperId) {
    throw new Error("Author ID or Paper ID is missing");
  }

  const response = await api.delete("/papers/block", {
    data: {
      authorId,
      paperId,
      blockId,
    }
  });
  return response.data;
};

/**
 * API function to import a paper from LaTeX or plain text content
 * @param content The LaTeX or plain text content to process
 * @param userId The user ID to associate with this paper
 * @returns The processed paper object with success/error information
 */
export const importPaper = async (content: string, userId: string) => {
  try {
    const response = await api.post("/papers", {
      content,
      authorId: userId,
    });
    
    if (response.data.message === 'Paper created successfully') {
      return response.data;
    } else {
      throw new Error('Failed to import paper');
    }
  } catch (error) {
    console.error('Error importing paper:', error);
    throw error;
  }
};

export const getCollaborators = async (paperId: string, authorId: string) => {
  try {
    const response = await api.get(`/papers/${paperId}/collaborators`, {
      params: { authorId }
    });
    return response.data;
  } catch (error) {
    console.error("Error getting collaborators:", error);
    throw error;
  }
};

// get teammates (author + collaborators - self)
// /api/papers/:id/members
export const getMembers = async (paperId: string, authorId: string) => {
  try {
    const response = await api.get(`/papers/${paperId}/members`, {
      params: { authorId }
    });
    console.log(paperId, authorId);
    return response.data;
  } catch (error) {
    console.error("Error getting teammates:", error);
    throw error;
  }
};

export const addCollaborator = async (paperId: string, authorId: string, collaboratorId: string) => {
  try {
    const response = await api.post(`/papers/${paperId}/collaborators`, {
      authorId,
      collaboratorId
    });
    return response.data;
  } catch (error) {
    console.error("Error adding collaborator:", error);
    throw error;
  }
};

export const removeCollaborator = async (paperId: string, authorId: string, collaboratorId: string) => {
  try {
    const response = await api.delete(`/papers/${paperId}/collaborators`, {
      data: { authorId, collaboratorId }
    });
    return response.data;
  } catch (error) {
    console.error("Error removing collaborator:", error);
    throw error;
  }
};
