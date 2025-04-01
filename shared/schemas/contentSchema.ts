import { z } from "zod";

// Define content type
export const ContentTypeSchema = z.enum([
  "paper",
  "section",
  "subsection",
  "subsubsection",
  "paragraph",
  "sentence",
]);

export enum ContentTypeSchemaEnum {
  Paper = "paper",
  Section = "section",
  Subsection = "subsection",
  Subsubsection = "subsubsection",
  Paragraph = "paragraph",
  Sentence = "sentence",
}

export type ContentType = z.infer<typeof ContentTypeSchema>;

// Define Content interface for better type safety
export interface Content {
  type: ContentType;
  title?: string;
  content?: string | Content[];
  summary: string;
  intent: string;
  "block-id"?: string;
}

// Define recursive content schema
export const ContentSchema: z.ZodType<Content> = z.lazy(() =>
  z.object({
    type: ContentTypeSchema,
    title: z.string().optional(),
    content: z
      .union([z.string(), z.array(z.lazy(() => ContentSchema))])
      .optional(),
    summary: z.string(),
    intent: z.string(),
    "block-id": z.string().optional(),
  })
);
