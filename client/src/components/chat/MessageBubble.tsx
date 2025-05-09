import React, { useMemo } from "react";
import { Message } from "../../api/chatApi";
import { useContentStore } from "../../store/useContentStore";
import ContentInfo from "../ui/ContentInfo";
import { Content } from "@paer/shared";
import { FiMessageSquare, FiMessageCircle, FiShare2, FiEdit } from 'react-icons/fi';
import { diff_match_patch } from "diff-match-patch";

interface MessageBubbleProps {
  message: Message;
  isSelected?: boolean;
  showMetadata?: boolean;
  showType?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isSelected = false,
  showMetadata = true,
  showType = true,
}) => {
  const isUser = message.role === "user";
  const { content } = useContentStore();
  const isComment = message.messageType === "comment";
  const isEdit = message.messageType === "edit";

  // Check if message has a connected blockId
  const hasBlockReference = !!message.blockId;

  // Find content by blockId
  const linkedContent = useMemo((): Content | null => {
    if (!message.blockId || !content) return null;

    // Helper function to recursively search content tree
    const findContentByBlockId = (node: any): Content | null => {
      if (node && node["block-id"] === message.blockId) {
        return node;
      }

      if (node && node.content && Array.isArray(node.content)) {
        for (const child of node.content) {
          const result = findContentByBlockId(child);
          if (result) return result;
        }
      }

      return null;
    };

    return findContentByBlockId(content);
  }, [message.blockId, content]);

  const renderDiff = (previous: string, updated: string) => {
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(previous, updated);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map((diff, index) => {
      const [type, text] = diff;
      if (type === 0) {
        return <span key={index}>{text}</span>;
      } else if (type === 1) {
        return (
          <span key={index} className="font-bold underline">
            {text}
          </span>
        );
      } else {
        return (
          <span key={index} className="line-through text-gray-500">
            {text}
          </span>
        );
      }
    });
  };

  // Determine message background color
  const getBgColor = () => {
    if (isComment) return 'bg-yellow-50 text-yellow-900';
    if (isEdit) return 'bg-purple-50 text-purple-900';
    return isUser ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-800';
  };

  // Set border based on selection and sharing status
  const getRingStyle = () => {
    if (isSelected) return 'ring-2 ring-blue-500 ring-opacity-50';
    if (message.viewAccess === "public") return 'ring-2 ring-green-500 ring-opacity-70';
    return '';
  };

  return (
    <div className={`p-3 rounded-lg transition-all ${getBgColor()} ${getRingStyle()}`}>
      {hasBlockReference && linkedContent && showMetadata && (
        <div className="mb-1">
          <ContentInfo
            content={linkedContent}
            lightText={false}
            isClickable={true}
          />
        </div>
      )}
      <div className="flex flex-col">
        {showMetadata && (
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
            <span>{isUser ? (message.userName || "You") : "Assistant"}</span>
            {showType && (
              <div className="flex items-center gap-2">
                {isComment ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                    <FiMessageSquare size={12} />
                    <span className="text-xs">Comment</span>
                  </div>
                ) : isEdit ? (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                    <FiEdit size={12} />
                    <span className="text-xs">Edit</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    <FiMessageCircle size={12} />
                    <span className="text-xs">Chat</span>
                  </div>
                )}
                {message.viewAccess === "public" && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                    <FiShare2 size={12} />
                    <span className="text-xs">Shared</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {isEdit && message.previousSentence && message.updatedSentence ? (
          <div className="space-y-2">
            <div className="text-sm whitespace-pre-wrap break-words">
              {renderDiff(message.previousSentence, message.updatedSentence)}
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
        
        {showMetadata && (
          <div className="text-xs mt-1 opacity-70 text-right">
            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble; 