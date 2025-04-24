import { z } from "zod";
import { Content, ContentSchema } from "./contentSchema";

// Define Paper interface for better type safety
export interface Paper extends Omit<Content, "content"> {
  _id: string;
  title: string; // title is required for Paper (not optional)
  content: Content[];
  // Paper specific properties
  type: "paper";
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  authorId: string; // 논문 작성자 ID
  collaboratorIds: string[]; // 협업자 ID 목록
  "block-id"?: string; // Also include block-id at the Paper level
}

// Define paper schema
export const PaperSchema: z.ZodType<Paper> = z.object({
  _id: z.string(),
  title: z.string(),
  summary: z.string(),
  intent: z.string(),
  type: z.literal("paper"),
  content: z.array(ContentSchema),
  // Paper specific properties
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().optional(),
  authorId: z.string(),
  collaboratorIds: z.array(z.string()),
  "block-id": z.string().optional(),
});
