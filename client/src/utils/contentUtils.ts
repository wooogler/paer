import { ContentType } from "@paer/shared";

// Colors by content type (Tailwind classes)
export const getTypeColor = (type: ContentType) => {
  switch (type) {
    case "paper":
      return {
        bg: "bg-indigo-50",
        border: "border-indigo-300",
        title: "text-indigo-600",
        main: "text-indigo-500",
      };
    case "section":
      return {
        bg: "bg-emerald-50",
        border: "border-emerald-300",
        title: "text-emerald-600",
        main: "text-emerald-500",
      };
    case "subsection":
      return {
        bg: "bg-amber-50",
        border: "border-amber-300",
        title: "text-amber-600",
        main: "text-amber-500",
      };
    case "subsubsection":
      return {
        bg: "bg-sky-50",
        border: "border-sky-300",
        title: "text-sky-600",
        main: "text-sky-500",
      };
    case "paragraph":
      return {
        bg: "bg-stone-50",
        border: "border-stone-300",
        title: "text-stone-700",
        main: "text-stone-600",
      };
    case "sentence":
      return {
        bg: "bg-gray-50",
        border: "border-gray-300",
        title: "text-gray-600",
        main: "text-gray-500",
      };
    default:
      return {
        bg: "bg-gray-100",
        border: "border-gray-300",
        title: "text-gray-600",
        main: "text-gray-500",
      };
  }
};

// Check if content type is selectable
export const isSelectableContent = (type: ContentType): boolean => {
  return [
    "paper",
    "section",
    "subsection",
    "subsubsection",
    "paragraph",
  ].includes(type);
};

// Get button background color
export const getButtonColor = (type: ContentType): string => {
  // Direct mapping of background colors for each type
  switch (type) {
    case "section":
      return "bg-emerald-500 hover:bg-emerald-600";
    case "subsection":
      return "bg-amber-500 hover:bg-amber-600";
    case "subsubsection":
      return "bg-sky-500 hover:bg-sky-600";
    case "paragraph":
      return "bg-stone-500 hover:bg-stone-600";
    case "sentence":
      return "bg-gray-500 hover:bg-gray-600";
    default:
      return "bg-blue-500 hover:bg-blue-600";
  }
};

// Get hover area background color
export const getHoverBackgroundColor = (type: ContentType): string => {
  switch (type) {
    case "section":
      return "bg-emerald-100";
    case "subsection":
      return "bg-amber-100";
    case "subsubsection":
      return "bg-sky-100";
    case "paragraph":
      return "bg-stone-100";
    case "sentence":
      return "bg-gray-100";
    default:
      return "bg-blue-100";
  }
};
