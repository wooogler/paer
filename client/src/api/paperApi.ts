import { type Paper, ContentType } from "@paer/shared";
import api from "../services/api";

// API function definition
export const fetchPaper = async (): Promise<Paper> => {
  try {
    const response = await api.get("/paper");
    // Return response data (type validation is handled on the server side)
    return response.data as Paper;
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
  newContent: string
): Promise<void> => {
  try {
    await api.patch("/paper/sentence", { blockId, content: newContent });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error updating sentence:", error.message);
    }
    throw new Error("Failed to update sentence content");
  }
};

// Add a new sentence after the sentence with the given block-id
// If blockId is null, add to the beginning of the selected paragraph
export const addSentenceAfter = async (
  blockId: string | null
): Promise<void> => {
  try {
    await api.post("/paper/sentence", { blockId });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error adding sentence:", error.message);
    }
    throw new Error("Failed to add new sentence");
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
    return response.data.blockId as string;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error adding block:", error.message);
    }
    throw new Error("Failed to add new block");
  }
};

// Update block intent
export const updateBlockIntent = async (
  parentBlockId: string | null,
  targetBlockId: string,
  blockType: ContentType,
  intent: string
): Promise<void> => {
  try {
    await api.patch("/paper/block/intent", {
      parentBlockId,
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
  parentBlockId: string | null,
  targetBlockId: string,
  blockType: ContentType,
  summary: string
): Promise<void> => {
  try {
    await api.patch("/paper/block/summary", {
      parentBlockId,
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
