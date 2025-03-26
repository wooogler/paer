import { z } from "zod";

// Define content type
export const ContentTypeSchema = z.enum([
  "paper",
  "section",
  "subsection",
  "paragraph",
  "sentence",
]);

export enum ContentTypeSchemaEnum {
  Paper = "paper",
  Section = "section",
  Subsection = "subsection",
  Paragraph = "paragraph",
  Sentence = "sentence",
}

export type ContentType = z.infer<typeof ContentTypeSchema>;

// Define Content interface for better type safety
export interface Content {
  title?: string;
  summary: string;
  intent: string;
  type: ContentType;
  content?: string | Content[];
  "block-id"?: string;
}

// Define recursive content schema
export const ContentSchema: z.ZodType<Content> = z.lazy(() =>
  z.object({
    title: z.string().optional(),
    summary: z.string(),
    intent: z.string(),
    type: ContentTypeSchema,
    content: z
      .union([z.string(), z.array(z.lazy(() => ContentSchema))])
      .optional(),
    "block-id": z.string().optional(),
  })
);
