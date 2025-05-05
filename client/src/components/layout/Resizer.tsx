import React, { useRef } from "react";

interface ResizerProps {
  onDrag: (delta: number) => void;
  onToggle: () => void;
  isCollapsed: boolean;
  direction: "left" | "right";
}

const Resizer: React.FC<ResizerProps> = ({ onDrag, onToggle, isCollapsed, direction }) => {
  const dragging = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    const startX = e.clientX;
    document.body.style.cursor = "col-resize";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragging.current) return;
      const delta = moveEvent.clientX - startX;
      onDrag(delta);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Determine the correct triangle direction based on both collapse state and resizer position
  const getTriangle = () => {
    // For left resizer: point right when collapsed, left when expanded
    // For right resizer: point left when collapsed, right when expanded
    const isPointingRight = direction === "left" ? isCollapsed : !isCollapsed;
    
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ transform: isPointingRight ? 'none' : 'scaleX(-1)' }}
      >
        <path d="M8 5L16 12L8 19Z" />
      </svg>
    );
  };

  return (
    <div
      className="w-2 flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-col-resize select-none group"
      onMouseDown={handleMouseDown}
    >
      <div className="w-0.5 h-full bg-gray-300 group-hover:bg-gray-400 transition-colors" />
      <button
        className="absolute w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 bg-white rounded-full shadow-sm transition-transform group-hover:scale-110"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        tabIndex={-1}
      >
        {getTriangle()}
      </button>
    </div>
  );
};

export default Resizer; 