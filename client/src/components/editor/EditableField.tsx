import React from "react";

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
  isSentence,
  onKeyDown,
}) => {
  return (
    <div className="text-sm relative group flex items-center gap-1 min-h-[24px]">
      {icon && <span className="font-medium flex-shrink-0">{icon}</span>}

      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 p-1 rounded border"
            placeholder={placeholder}
          />
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onUpdate}
            className="px-2 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white"
          >
            Update
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1">
          <span className={`break-words ${!value ? "text-gray-400" : ""}`}>
            {value || placeholder}
          </span>
          {isHovered && (
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 flex-shrink-0"
              title={`Edit ${placeholder.toLowerCase()}`}
            >
              ✎
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableField;
