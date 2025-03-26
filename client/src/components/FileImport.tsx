import React, { useRef } from 'react';
import { FiUpload } from 'react-icons/fi';

interface FileImportProps {
  onFileImport: (content: string) => void;
  acceptedFileTypes?: string[];
}

const FileImport: React.FC<FileImportProps> = ({ 
  onFileImport, 
  acceptedFileTypes = ['.txt', '.md', '.tex'] 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      onFileImport(content);
    } catch (error) {
      console.error('Error reading file:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <button
        onClick={handleButtonClick}
        className="p-2 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title="Import Paper"
      >
        <FiUpload className="w-5 h-5" />
      </button>
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        Import Paper
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default FileImport; 