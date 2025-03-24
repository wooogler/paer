import React, { ReactNode } from "react";

interface PaneProps {
  title: string;
  width: string;
  children?: ReactNode;
  isLast?: boolean;
  rightContent?: ReactNode;
}

const Pane: React.FC<PaneProps> = ({
  title,
  width,
  children,
  isLast = false,
  rightContent,
}) => {
  return (
    <div
      className={`flex flex-col ${isLast ? "" : "border-r border-gray-200"}`}
      style={{ width }}
    >
      <div className="py-3 px-4 flex justify-between items-center font-bold bg-gray-100 border-b border-gray-200">
        <div>{title}</div>
        {rightContent && <div>{rightContent}</div>}
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};

export default Pane;
