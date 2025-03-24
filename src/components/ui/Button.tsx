import React from "react";

interface ButtonProps {
    onChange: (checked: boolean) => void;
}

const Button: React.FC<ButtonProps> = ({ onChange }) => {
    return (
        <button
            className="p-2 bg-blue-600 text-white rounded"
            onClick={() => {
                onChange(true);
            }}
        >
            Get Chat History
        </button>
    );
};

export default Button;
