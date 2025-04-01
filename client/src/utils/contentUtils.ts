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
        bg: "bg-slate-50",
        border: "border-slate-300",
        title: "text-slate-700",
        main: "text-slate-600",
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
