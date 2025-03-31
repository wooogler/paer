import React from "react";
import { Content, ContentType } from "@paer/shared";

interface AddBlockButtonProps {
  onClick: () => void;
  isVisible: boolean;
  blockType: ContentType;
  parentBlockId: string | null;
  prevBlockId: string | null;
}

const AddBlockButton: React.FC<AddBlockButtonProps> = ({
  onClick,
  isVisible,
  blockType,
  parentBlockId,
  prevBlockId,
}) => {
  // Get button text based on block type
  const getButtonText = (): string => {
    switch (blockType) {
      case "section":
        return "Add new section";
      case "subsection":
        return "Add new subsection";
      case "subsubsection":
        return "Add new subsubsection";
      case "paragraph":
        return "Add new paragraph";
      case "sentence":
        return "Add new sentence";
      default:
        return "Add new block";
    }
  };

  // Get button color based on block type
  const getButtonColor = (): string => {
    switch (blockType) {
      case "section":
        return "bg-orange-500 hover:bg-orange-600";
      case "subsection":
        return "bg-purple-500 hover:bg-purple-600";
      case "subsubsection":
        return "bg-pink-500 hover:bg-pink-600";
      case "paragraph":
        return "bg-green-500 hover:bg-green-600";
      case "sentence":
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  // Get placeholder content based on block type
  const getPlaceholderContent = (): Content | null => {
    switch (blockType) {
      case "section":
        return {
          type: "section" as const,
          content: [],
          title: "New Section",
          summary: "",
          intent: "",
        };
      case "subsection":
        return {
          type: "subsection" as const,
          content: [],
          title: "New Subsection",
          summary: "",
          intent: "",
        };
      case "subsubsection":
        return {
          type: "subsubsection" as const,
          content: [],
          title: "New Subsubsection",
          summary: "",
          intent: "",
        };
      case "paragraph":
        return {
          type: "paragraph" as const,
          content: [],
          summary: "New Paragraph",
          intent: "",
        };
      case "sentence":
        return {
          type: "sentence" as const,
          content: [],
          title: "New Sentence",
          summary: "",
          intent: "",
        };
      default:
        return null;
    }
  };

  const placeholderContent = getPlaceholderContent();
  if (!placeholderContent) return null;

  return (
    <div className={`w-full ${isVisible ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h2">
          <div
            className="relative group h-1 cursor-pointer flex items-center justify-center"
            onClick={onClick}
          >
            <button
              onClick={onClick}
              className={`${getButtonColor()} text-white rounded-full px-4 py-1 flex items-center justify-center text-sm absolute -top-4 left-1/2 transform -translate-x-1/2 z-10`}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBlockButton;
