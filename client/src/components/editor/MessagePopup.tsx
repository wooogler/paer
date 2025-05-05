import React from "react";
import { Message } from "../../api/chatApi";
import MessageBubble from "../chat/MessageBubble";

interface MessagePopupProps {
  messages: Message[];
}

const MessagePopup: React.FC<MessagePopupProps> = ({ messages }) => {
  // 메시지를 시간순으로 정렬 (오래된 것부터)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="shadow-lg border border-gray-200 rounded-lg overflow-hidden max-w-xs">
      {sortedMessages.map((message, index) => (
        <MessageBubble 
          key={index}
          message={message} 
          isSelected={false}
          showMetadata={true}
          showType={true}
        />
      ))}
    </div>
  );
};

export default MessagePopup; 