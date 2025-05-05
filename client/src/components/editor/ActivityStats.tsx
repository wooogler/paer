import React, { useState, useMemo } from "react";
import { Message } from "../../api/chatApi";
import { useContentStore } from "../../store/useContentStore";
import { useAppStore } from "../../store/useAppStore";
import { useChatStore } from "../../store/useChatStore";
import MessagePopup from "./MessagePopup";
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

const ActivityStats: React.FC<ActivityStatsProps> = ({ blockId }) => {
  const [hoveredMessage, setHoveredMessage] = useState<Message | null>(null);
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
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

  // useChatStore에서 메시지 가져오기
  const { messages } = useChatStore();
  const { selectedPaperId } = useContentStore();
  const { userId } = useAppStore();

  // 이 블록에 관련된 메시지 필터링
  const relatedMessages = useMemo(() => {
    if (!blockId || !messages || messages.length === 0) return [];
    return messages.filter(msg => msg.blockId === blockId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [blockId, messages]);

  // 메시지 타입별로 그룹화
  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    
    relatedMessages.forEach((msg) => {
      const type = msg.messageType || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(msg);
    });
    
    return groups;
  }, [relatedMessages]);

  // 메시지 타입별 색상 설정
  const getMessageColor = (type?: string) => {
    switch (type) {
      case 'chat': return 'border-blue-500 bg-blue-100';
      case 'comment': return 'border-yellow-500 bg-yellow-100';
      case 'edit': return 'border-purple-500 bg-purple-100';
      default: return 'border-gray-500 bg-gray-100';
    }
  };

  if (relatedMessages.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-1 mb-1">
      {/* 메시지 타입별로 그룹화하여 표시 */}
      {Object.entries(groupedMessages).map(([type, msgs], groupIndex) => (
        <div 
          key={groupIndex}
          ref={hoveredMessage && msgs.includes(hoveredMessage) ? refs.setReference : undefined}
          {...(hoveredMessage && msgs.includes(hoveredMessage) ? getReferenceProps() : {})}
          className={`w-4 h-4 ${getMessageColor(type)} border rounded-sm cursor-pointer hover:ring-1 hover:ring-gray-500`}
          onMouseEnter={() => {
            setHoveredMessage(msgs[0]); // 그룹의 첫 번째 메시지로 설정
            setOpen(true);
          }}
          onMouseLeave={() => {
            setOpen(false);
          }}
        />
      ))}
      
      {/* 메시지 팝업 */}
      {open && hoveredMessage && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50"
          >
            <MessagePopup messages={groupedMessages[hoveredMessage.messageType || 'unknown'] || []} />
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

export default ActivityStats; 