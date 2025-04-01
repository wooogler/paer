import React from "react";
import { ClipLoader } from "react-spinners";

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  onUpdate: () => void;
  onCancel: () => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  placeholder: string;
  icon?: string;
  isHovered: boolean;
  isSentence: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  fontSize?: string;
  fontWeight?: string;
  extraButton?: React.ReactNode;
  isLoading?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  onUpdate,
  onCancel,
  isEditing,
  setIsEditing,
  inputRef,
  placeholder,
  icon,
  isHovered,
  onKeyDown,
  fontSize,
  fontWeight,
  extraButton,
  isLoading = false,
}) => {
  return (
    <div
      className={`relative group flex items-center gap-1 min-h-[24px] w-full ${
        fontSize || "text-sm"
      } ${fontWeight || ""}`}
    >
      {icon && <span className="font-medium flex-shrink-0">{icon}</span>}

      {isEditing ? (
        <div className="flex items-center gap-2 flex-1 w-full">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className={`flex-1 p-1 rounded border w-full min-w-0 ${
              fontSize || ""
            } ${fontWeight || ""}`}
            placeholder={placeholder}
          />
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 flex-shrink-0"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onUpdate}
            className="px-2 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0"
            disabled={isLoading}
          >
            {isLoading ? <ClipLoader size={10} color="#ffffff" /> : "Update"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1 w-full">
          <span className={`break-words ${!value ? "text-gray-400" : ""} `}>
            {value || placeholder}
          </span>
          {isHovered && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 flex-shrink-0 ml-1"
                title={`Edit ${placeholder.toLowerCase()}`}
              >
                ✎
              </button>
              {extraButton}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableField;
