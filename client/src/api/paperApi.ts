import { type Paper, ContentType } from "@paer/shared";
import api from "../services/api";

// API function definition
export const getPapers = async (userId: string) => {
  try {
    const response = await api.get(`/papers`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error("Error getting papers:", error);
    throw error;
  }
};

export const getPaperById = async (paperId: string, userId: string) => {
  try {
    const response = await api.get(`/papers/${paperId}`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error("Error getting paper:", error);
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

export const deletePaper = async (paperId: string) => {
  try {
    const response = await api.delete(`/papers/${paperId}`);
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
): Promise<void> => {
  try {
    await api.patch(`/papers/block/${blockId}/content`, { content, summary, intent });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating sentence:", error.message);
    }
    throw new Error("Failed to update sentence content");
  }
};

/**
 * API function to delete a sentence
 * @param blockId ID of the sentence to delete
 */
export async function deleteSentence(blockId: string): Promise<void> {
  try {
    await api.delete(`/papers/block/${blockId}`);
  } catch (error) {
    console.error("Error deleting sentence:", error);
    throw error;
  }
}

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
  blockType: ContentType
): Promise<string> => {
  try {
    const response = await api.post("/papers/block", {
      parentBlockId,
      prevBlockId,
      blockType,
    });
    return response.data.blockId;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error adding block:", error.message);
    }
    throw new Error("Failed to add block");
  }
};

// Update block intent
export const updateBlockIntent = async (
  targetBlockId: string,
  blockType: ContentType,
  intent: string
): Promise<void> => {
  try {
    await api.patch(`/papers/block/${targetBlockId}/intent`, { intent });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating block intent:", error.message);
    }
    throw new Error("Failed to update block intent");
  }
};

// Update block summary
export const updateBlockSummary = async (
  targetBlockId: string,
  blockType: ContentType,
  summary: string
): Promise<void> => {
  try {
    await api.patch(`/papers/block/${targetBlockId}/summary`, { summary });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating block summary:", error.message);
    }
    throw new Error("Failed to update block summary");
  }
};

// Update block title
export const updateBlockTitle = async (
  targetBlockId: string,
  blockType: ContentType,
  title: string
): Promise<void> => {
  try {
    await api.patch(`/papers/block/${targetBlockId}/title`, { title });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating block title:", error.message);
    }
    throw new Error("Failed to update block title");
  }
};

/**
 * API function to delete a block
 * @param blockId ID of the block to delete
 */
export async function deleteBlock(blockId: string): Promise<void> {
  try {
    await api.delete(`/papers/block/${blockId}`);
  } catch (error) {
    console.error("Error deleting block:", error);
    throw error;
  }
}

export const processPaperContent = async (content: string, userId?: string) => {
  try {
    const response = await api.post("/papers/process", { content, userId });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error processing paper content:", error.message);
    }
    throw new Error("Failed to process paper content");
  }
};

interface ProcessedPaper {
  title: string;
  content: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export const savePaper = async (paper: any): Promise<void> => {
  try {
    await api.post("/papers", paper);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error saving paper:", error.message);
    }
    throw new Error("Failed to save paper");
  }
};
