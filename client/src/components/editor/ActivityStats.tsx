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

// 채팅 메시지를 Q&A 쌍으로 그룹화하는 인터페이스
interface MessageGroup {
  id: string; // 그룹 식별자
  type: string; // 메시지 타입
  messages: Message[]; // 그룹 내 메시지들
  timestamp?: number; // 그룹의 타임스탬프
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

  // useChatStore에서 메시지 가져오기
  const { messages } = useChatStore();
  const { selectedPaperId, content: rootContent, updateContent } = useContentStore();
  const { userId } = useAppStore();

  // 이 블록에 관련된 메시지 필터링
  const relatedMessages = useMemo(() => {
    if (!blockId || !messages || messages.length === 0) return [];
    return messages.filter(msg => msg.blockId === blockId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [blockId, messages]);

  // 메시지를 그룹화 (chat은 Q&A 쌍으로, 다른 타입은 개별적으로)
  const messageGroups = useMemo(() => {
    const groups: MessageGroup[] = [];
    const chatGroups: Record<string, Message[]> = {}; // Q&A 쌍을 저장할 객체
    
    // 메시지를 시간 순서로 정렬 (오래된 것부터)
    const sortedMessages = [...relatedMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    sortedMessages.forEach((msg) => {
      const type = msg.messageType || 'unknown';
      
      // chat 타입은 Q&A 쌍으로 묶기
      if (type === 'chat') {
        const role = msg.role;
        
        // 사용자(user) 메시지인 경우, 새 Q&A 쌍의 시작
        if (role === 'user') {
          const groupId = `chat-${msg.id}`;
          chatGroups[groupId] = [msg];
        } 
        // assistant 메시지인 경우, 가장 최근 user 메시지와 쌍을 이룸
        else if (role === 'assistant') {
          // 가장 최근에 추가된 user 메시지를 찾음
          const latestUserGroupId = Object.keys(chatGroups).find(key => {
            const messages = chatGroups[key];
            return messages.length === 1 && messages[0].role === 'user';
          });
          
          if (latestUserGroupId) {
            chatGroups[latestUserGroupId].push(msg);
          } else {
            // 매칭되는 user 메시지가 없으면 독립적으로 처리
            const groupId = `chat-${msg.id}`;
            chatGroups[groupId] = [msg];
          }
        }
      } 
      // chat 이외의 타입(edit, comment 등)은 개별적으로 그룹화
      else {
        groups.push({
          id: `${type}-${msg.id}`,
          type,
          messages: [msg],
          timestamp: msg.timestamp
        });
      }
    });
    
    // chat 그룹을 결과 배열에 추가
    Object.entries(chatGroups).forEach(([id, chatMessages]) => {
      // 그룹 내에서 가장 오래된 메시지의 타임스탬프를 그룹 타임스탬프로 사용
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
    
    // 시간순으로 정렬 (오래된 메시지가 먼저)
    return groups.sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampA - timestampB;
    });
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

  // blockId로 콘텐츠 찾기
  const linkedContent = useMemo((): any | null => {
    if (!blockId || !rootContent) return null;

    // 헬퍼 함수로 콘텐츠 트리를 재귀적으로 탐색
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

  // 블록에 이미 저장된 요약이 있는지 확인
  const blockSummary = useMemo(() => {
    return linkedContent?.summary || "";
  }, [linkedContent]);

  // 메시지 요약 함수
  const handleSummarize = async () => {
    if (!blockId || relatedMessages.length === 0) return;
    
    try {
      setIsSummarizing(true);
      const result = await summarizeMessages(relatedMessages, blockId, selectedPaperId || undefined, userId || undefined);
      setSummary(result.summary);
      
      // summary가 성공적으로 업데이트되었으면 contentStore의 updateContent 호출하여 리렌더링
      if (result.summaryUpdated && blockId) {
        // 블록 ID로 콘텐츠 찾기
        const updateBlock = (node: any): boolean => {
          if (node && node["block-id"] === blockId) {
            // 현재 노드가 찾는 블록이면 summary 업데이트
            updateContent(blockId, { summary: result.summary });
            return true;
          }

          // 재귀적으로 자식 노드 검색
          if (node && node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
              if (updateBlock(child)) return true;
            }
          }
          
          return false;
        };

        // 전체 콘텐츠 트리에서 blockId에 해당하는 노드 찾아 업데이트
        if (rootContent) {
          updateBlock(rootContent);
        }
      }
    } catch (error) {
      console.error("메시지 요약 오류:", error);
      setSummary("요약을 생성하는 데 문제가 발생했습니다.");
    } finally {
      setIsSummarizing(false);
    }
  };

  if (relatedMessages.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-1 mb-1">
      {/* 메시지 그룹별로 표시 (chat은 Q&A 쌍으로, 다른 타입은 개별적으로) - 오래된 메시지가 왼쪽, 최신 메시지가 오른쪽 */}
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

      {/* 요약 버튼 */}
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
      
      {/* 메시지 팝업 */}
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

      {/* 요약 팝업 */}
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