export type ContentType =
  | "paper"
  | "section"
  | "subsection"
  | "paragraph"
  | "sentence";

export interface Content {
  title?: string;
  summary: string;
  intent: string;
  type: ContentType;
  content?: Content[] | string; // Manages subcontent as array or string
}

// Initial content state
export const initialContent: Content = {
  title: "New Paper",
  summary: "",
  intent: "",
  type: "paper",
  content: [],
};
