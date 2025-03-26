// import React from "react";
import { useState } from "react";
import { useUpdateSentence } from "../hooks/usePaperQuery";

interface SentenceBlock {
  id: string;
  content: string;
  summary?: string;
  intent?: string;
}

export const SentenceBlock = ({ block }: { block: SentenceBlock }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.content);
  const [summary, setSummary] = useState(block.summary || "");
  const [intent, setIntent] = useState(block.intent || "");
  const updateSentence = useUpdateSentence();

  const handleSave = async () => {
    try {
      await updateSentence.mutateAsync({
        blockId: block.id,
        content,
        summary,
        intent,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update sentence:", error);
    }
  };

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2 border rounded"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Intent
            </label>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full p-2 border rounded"
              rows={2}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-900">{block.content}</p>
          {block.summary && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Summary:</span> {block.summary}
            </p>
          )}
          {block.intent && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">Intent:</span> {block.intent}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
