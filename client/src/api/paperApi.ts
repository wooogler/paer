import { type Paper } from "@paer/shared";
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
