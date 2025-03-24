import { ContentType } from "../types/content";

// Colors by content type
export const getTypeColor = (type: ContentType) => {
  switch (type) {
    case "paper":
      return {
        bg: "#E8F0FE",
        border: "#4285F4",
        title: "#1A73E8",
        main: "#4285F4", // Google Blue
      };
    case "section":
      return {
        bg: "#E6F4EA",
        border: "#0F9D58",
        title: "#137333",
        main: "#0F9D58", // Google Green
      };
    case "subsection":
      return {
        bg: "#FEF7E0",
        border: "#F4B400",
        title: "#AA8800",
        main: "#F4B400", // Google Yellow
      };
    case "paragraph":
      return {
        bg: "#FCE8E6",
        border: "#DB4437",
        title: "#B31412",
        main: "#DB4437", // Google Red
      };
    case "sentence":
      return {
        bg: "#F3E8FD",
        border: "#673AB7",
        title: "#5B2C9F",
        main: "#673AB7", // Purple
      };
    default:
      return {
        bg: "#F1F3F4",
        border: "#9AA0A6",
        title: "#5F6368",
        main: "#757575", // Gray
      };
  }
};

// Simple background color for editor
export const getSimpleBackgroundColor = (type: ContentType): string => {
  switch (type) {
    case "paper":
      return "#E8F0FE";
    case "section":
      return "#E6F4EA";
    case "subsection":
      return "#FEF7E0";
    case "paragraph":
      return "#FCE8E6";
    case "sentence":
      return "#F3E8FD";
    default:
      return "#F1F3F4";
  }
};

// Check if content type is selectable
export const isSelectableContent = (type: ContentType): boolean => {
  return ["section", "subsection", "paragraph"].includes(type);
};
