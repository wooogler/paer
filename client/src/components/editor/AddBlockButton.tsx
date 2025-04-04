import React from "react";
import { Content, ContentType } from "@paer/shared";
import { getButtonColor } from "../../utils/contentUtils";

interface AddBlockButtonProps {
  onClick: () => void;
  isVisible: boolean;
  blockType: ContentType;
}

const AddBlockButton: React.FC<AddBlockButtonProps> = ({
  onClick,
  isVisible,
  blockType,
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
          <div className="relative group h-1 cursor-pointer flex items-center justify-center">
            <button
              onClick={onClick}
              className={`${getButtonColor(
                blockType
              )} text-white rounded-full px-4 py-1 flex items-center justify-center text-sm absolute -top-4 left-1/2 transform -translate-x-1/2 z-10 shadow-md`}
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
