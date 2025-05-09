import React, { useState, useMemo } from "react";
import { Message } from "../../api/chatApi";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";
import { useChatStore } from "../../store/useChatStore";
import MessagePopup from "./MessagePopup";
import { FiFileText } from "react-icons/fi";
import { summarizeMessages } from "../../api/chatApi";
import {
  useFloating,
  useDismiss,
  useInteractions,
  FloatingPortal,
  offset,
  flip,
  shift,
  useHover,
  useFocus
} from "@floating-ui/react";

interface ActivityStatsProps {
  blockId: string | undefined;
}

// Interface for grouping chat messages into Q&A pairs
interface MessageGroup {
  id: string; // Group identifier
  type: string; // Message type
  messages: Message[]; // Messages in the group
  timestamp?: number; // Group timestamp
}

const ActivityStats: React.FC<ActivityStatsProps> = ({ blockId }) => {
  const [hoveredGroup, setHoveredGroup] = useState<MessageGroup | null>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(5), flip(), shift()],
    placement: 'bottom'
  });

  const { refs: summaryRefs, floatingStyles: summaryFloatingStyles, context: summaryContext } = useFloating({
    open: summaryOpen,
    onOpenChange: setSummaryOpen,
    middleware: [offset(5), flip(), shift()],
    placement: 'bottom'
  });
  
  const hover = useHover(context, {
    restMs: 25
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover, focus, dismiss
  ]);

  const summaryHover = useHover(summaryContext, {
    restMs: 25
  });
  const summaryFocus = useFocus(summaryContext);
  const summaryDismiss = useDismiss(summaryContext);
  const { getReferenceProps: getSummaryReferenceProps, getFloatingProps: getSummaryFloatingProps } = useInteractions([
    summaryHover, summaryFocus, summaryDismiss
  ]);

  // Get messages from useChatStore
  const { messages } = useChatStore();
  const { selectedPaperId, content: rootContent, updateContent } = useContentStore();
  const { userId } = useAppStore();

  // Filter messages related to this block
  const relatedMessages = useMemo(() => {
    if (!blockId || !messages || messages.length === 0) return [];
    return messages.filter(msg => msg.blockId === blockId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [blockId, messages]);

  // Group messages (chat as Q&A pairs, other types individually)
  const messageGroups = useMemo(() => {
    const groups: MessageGroup[] = [];
    const chatGroups: Record<string, Message[]> = {}; // Object to store Q&A pairs
    
    // Sort messages by time (oldest first)
    const sortedMessages = [...relatedMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    sortedMessages.forEach((msg) => {
      const type = msg.messageType || 'unknown';
      
      // Group chat type into Q&A pairs
      if (type === 'chat') {
        const role = msg.role;
        
        // For user messages, start a new Q&A pair
        if (role === 'user') {
          const groupId = `chat-${msg.id}`;
          chatGroups[groupId] = [msg];
        } 
        // For assistant messages, pair with most recent user message
        else if (role === 'assistant') {
          // Find the most recently added user message
          const latestUserGroupId = Object.keys(chatGroups).find(key => {
            const messages = chatGroups[key];
            return messages.length === 1 && messages[0].role === 'user';
          });
          
          if (latestUserGroupId) {
            chatGroups[latestUserGroupId].push(msg);
          } else {
            // If no matching user message, handle independently
            const groupId = `chat-${msg.id}`;
            chatGroups[groupId] = [msg];
          }
        }
      } 
      // Group non-chat types (edit, comment, etc.) individually
      else {
        groups.push({
          id: `${type}-${msg.id}`,
          type,
          messages: [msg],
          timestamp: msg.timestamp
        });
      }
    });
    
    // Add chat groups to result array
    Object.entries(chatGroups).forEach(([id, chatMessages]) => {
      // Use timestamp of oldest message in group as group timestamp
      const oldestTimestamp = chatMessages.reduce((oldest, msg) => {
        return oldest < msg.timestamp ? oldest : msg.timestamp;
      }, Date.now());
      
      groups.push({
        id,
        type: 'chat',
        messages: chatMessages,
        timestamp: oldestTimestamp
      });
    });
    
    // Sort by time (oldest messages first)
    return groups.sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampA - timestampB;
    });
  }, [relatedMessages]);

  // Set colors by message type
  const getMessageColor = (type?: string) => {
    switch (type) {
      case 'chat': return 'border-blue-500 bg-blue-100';
      case 'comment': return 'border-yellow-500 bg-yellow-100';
      case 'edit': return 'border-purple-500 bg-purple-100';
      default: return 'border-gray-500 bg-gray-100';
    }
  };

  // Find content by blockId
  const linkedContent = useMemo((): any | null => {
    if (!blockId || !rootContent) return null;

    // Helper function to recursively search content tree
    const findContentByBlockId = (node: any): any | null => {
      if (node && node["block-id"] === blockId) {
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

    return findContentByBlockId(rootContent);
  }, [blockId, rootContent]);

  // Check if block already has a saved summary
  const blockSummary = useMemo(() => {
    return linkedContent?.summary || "";
  }, [linkedContent]);

  // Message summary function
  const handleSummarize = async () => {
    if (!blockId || relatedMessages.length === 0) return;
    
    try {
      setIsSummarizing(true);
      const result = await summarizeMessages(relatedMessages, blockId, selectedPaperId || undefined, userId || undefined);
      setSummary(result.summary);
      
      // If summary was successfully updated, call contentStore's updateContent to trigger re-render
      if (result.summaryUpdated && blockId) {
        // Find content by block ID
        const updateBlock = (node: any): boolean => {
          if (node && node["block-id"] === blockId) {
            // If current node is target block, update summary
            updateContent(blockId, { summary: result.summary });
            return true;
          }

          // Recursively search child nodes
          if (node && node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
              if (updateBlock(child)) return true;
            }
          }
          
          return false;
        };

        // Find and update node with blockId in entire content tree
        if (rootContent) {
          updateBlock(rootContent);
        }
      }
    } catch (error) {
      console.error("Error summarizing messages:", error);
      setSummary("There was a problem generating the summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (relatedMessages.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-1 mb-1">
      {/* Display message groups (chat as Q&A pairs, other types individually) - older messages on left, newer on right */}
      {messageGroups.map((group) => (
        <div 
          key={group.id}
          ref={hoveredGroup?.id === group.id ? refs.setReference : undefined}
          {...(hoveredGroup?.id === group.id ? getReferenceProps() : {})}
          className={`w-4 h-4 ${getMessageColor(group.type)} border rounded-sm cursor-pointer hover:ring-1 hover:ring-gray-500`}
          onMouseEnter={() => {
            setHoveredGroup(group);
            setOpen(true);
          }}
          onMouseLeave={() => {
            setOpen(false);
          }}
        />
      ))}

      {/* Summary button */}
      {(blockSummary || summary) && (
        <button 
          ref={summaryRefs.setReference}
          {...getSummaryReferenceProps()}
          className="ml-2 text-gray-500 hover:text-blue-500 flex items-center text-xs"
          onClick={handleSummarize}
          disabled={isSummarizing}
        >
          <FiFileText className="mr-1" size={14} />
          {isSummarizing ? 'Summarizing...' : 'Summarize'}
        </button>
      )}
      
      {/* Message popup */}
      {open && hoveredGroup && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50"
          >
            <MessagePopup messages={hoveredGroup.messages} />
          </div>
        </FloatingPortal>
      )}

      {/* Summary popup */}
      {summaryOpen && (blockSummary || summary) && (
        <FloatingPortal>
          <div
            ref={summaryRefs.setFloating}
            style={summaryFloatingStyles}
            {...getSummaryFloatingProps()}
            className="z-50 bg-white p-2 rounded shadow-lg border border-gray-200 max-w-xs"
          >
            <div className="text-sm text-gray-700">
              {blockSummary || summary}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

export default ActivityStats; 