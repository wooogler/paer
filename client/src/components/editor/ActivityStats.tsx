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
      {/* 메시지를 역순으로 표시하여 최신 메시지가 오른쪽에 배치되도록 함 */}
      {relatedMessages.slice(0, 10).map((msg, i) => (
        <div 
          key={i}
          ref={hoveredMessage === msg ? refs.setReference : undefined}
          {...(hoveredMessage === msg ? getReferenceProps() : {})}
          className={`w-3 h-3 ${getMessageColor(msg.messageType)} border cursor-pointer hover:ring-2 hover:ring-white hover:ring-opacity-70`}
          onMouseEnter={() => {
            setHoveredMessage(msg);
            setOpen(true);
          }}
          onMouseLeave={() => {
            setOpen(false);
          }}
        />
      ))}
      
      {/* 숫자 표시 제거 */}

      {/* 메시지 팝업 */}
      {open && hoveredMessage && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-50"
          >
            <MessagePopup message={hoveredMessage} />
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};

export default ActivityStats; 