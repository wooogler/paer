import { type Paper, ContentType } from "@paer/shared";
import api from "../services/api";

// API function definition
export const fetchPaper = async (userId: string): Promise<Paper> => {
  try {
    const response = await api.get(`/papers?userId=${userId}`);
    // Server returns an array of papers, but we only need the first one
    const papers = response.data as Paper[];
    
    if (!papers || papers.length === 0) {
      throw new Error("No papers found for this user");
    }
    
    return papers[0];
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching paper:", error.message);
    }
    throw new Error("Failed to fetch paper data");
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
    await api.patch("/paper/sentence", { blockId, content, summary, intent });
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
    await api.delete(`/paper/sentence/${blockId}`);
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
    await api.patch("/paper/sentence/intent", { blockId, intent });
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
    await api.patch("/paper/sentence/summary", { blockId, summary });
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
    const response = await api.post("/paper/block", {
      parentBlockId,
      prevBlockId,
      blockType,
    });

    const blockId = response.data.blockId as string;
    return blockId;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error adding ${blockType}:`, error.message);
    } else {
      console.error(`Unknown error adding ${blockType}:`, error);
    }
    throw new Error(`Failed to add new ${blockType}`);
  }
};

// Update block intent
export const updateBlockIntent = async (
  targetBlockId: string,
  blockType: ContentType,
  intent: string
): Promise<void> => {
  try {
    await api.patch("/paper/block/intent", {
      targetBlockId,
      blockType,
      keyToUpdate: "intent",
      updatedValue: intent,
    });
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
    await api.patch("/paper/block/summary", {
      targetBlockId,
      blockType,
      keyToUpdate: "summary",
      updatedValue: summary,
    });
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
    await api.patch("/paper/block/title", {
      targetBlockId,
      blockType,
      keyToUpdate: "title",
      updatedValue: title,
    });
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
    await api.delete(`/paper/block/${blockId}`);
  } catch (error) {
    console.error("Error deleting block:", error);
    throw new Error("Failed to delete block");
  }
}

export const processPaperContent = async (content: string) => {
  try {
    const response = await api.post("/papers/process", { content });
    return response.data;
  } catch (error) {
    console.error("Error processing paper content:", error);
    throw error;
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

export const savePaper = async (paper: ProcessedPaper): Promise<void> => {
  try {
    await api.post("/papers", paper);
  } catch (error) {
    console.error("Error saving paper:", error);
    throw error;
  }
};
