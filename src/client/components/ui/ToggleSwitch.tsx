import React from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel?: string;
  rightLabel?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  leftLabel = "Summary",
  rightLabel = "Intent",
}) => {
  return (
    <div className="flex items-center space-x-2">
      <span
        className={`text-sm ${!checked ? "text-blue-600" : "text-gray-500"}`}
      >
        {leftLabel}
      </span>
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors duration-200 ${
          checked ? "bg-blue-500" : "bg-gray-200"
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
      <span
        className={`text-sm ${checked ? "text-blue-600" : "text-gray-500"}`}
      >
        {rightLabel}
      </span>
    </div>
  );
};

export default ToggleSwitch;
