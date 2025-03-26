import { useContentStore } from "../store/useContentStore";
import { useUpdateSentence } from "../hooks/usePaperQuery";

export const TextEditor = () => {
  const { selectedContent, selectedPath } = useContentStore();
  const updateSentence = useUpdateSentence();

  const handleIntentUpdate = async () => {
    if (!selectedContent || !selectedPath) return;

    try {
      await updateSentence.mutateAsync({
        blockId: selectedContent["block-id"] as string,
        intent: selectedContent.intent || "",
      });
    } catch (error) {
      console.error("Failed to update intent:", error);
    }
  };

  const handleSummaryUpdate = async () => {
    if (!selectedContent || !selectedPath) return;

    try {
      await updateSentence.mutateAsync({
        blockId: selectedContent["block-id"] as string,
        summary: selectedContent.summary || "",
      });
    } catch (error) {
      console.error("Failed to update summary:", error);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex space-x-4">
        <button
          onClick={handleIntentUpdate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Update Intent
        </button>
        <button
          onClick={handleSummaryUpdate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Update Summary
        </button>
      </div>
      {/* ... rest of the component ... */}
    </div>
  );
};
