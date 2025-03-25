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
