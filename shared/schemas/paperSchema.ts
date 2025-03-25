import { z } from "zod";
import { Content, ContentSchema } from "./contentSchema";

// Define Paper interface for better type safety
export interface Paper extends Omit<Content, "content"> {
  title: string; // title is required for Paper (not optional)
  type: "paper";
  content: Content[];
  // Paper specific properties
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  authors?: string[];
  "block-id"?: string; // Also include block-id at the Paper level
}

// Define paper schema
export const PaperSchema: z.ZodType<Paper> = z.object({
  title: z.string(),
  summary: z.string(),
  intent: z.string(),
  type: z.literal("paper"),
  content: z.array(ContentSchema),
  // Paper specific properties
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.number().optional(),
  authors: z.array(z.string()).optional(),
  "block-id": z.string().optional(),
});
