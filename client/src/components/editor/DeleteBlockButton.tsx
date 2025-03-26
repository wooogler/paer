import React from "react";
import { FaTrash } from "react-icons/fa";

interface DeleteBlockButtonProps {
  contentType: string;
  onDelete: () => void;
  className?: string;
}

/**
 * Block delete button component
 */
const DeleteBlockButton: React.FC<DeleteBlockButtonProps> = ({
  contentType,
  onDelete,
  className = "",
}) => (
  <button
    className={`text-red-500 hover:text-red-700 ${className}`}
    onClick={(e) => {
      e.stopPropagation();
      if (
        window.confirm(`Are you sure you want to delete this ${contentType}?`)
      ) {
        onDelete();
      }
    }}
    aria-label={`Delete ${contentType}`}
    title={`Delete ${contentType}`}
  >
    <FaTrash size={14} />
  </button>
);

export default DeleteBlockButton;
