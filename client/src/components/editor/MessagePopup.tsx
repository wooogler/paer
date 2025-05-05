import React from "react";
import { Message } from "../../api/chatApi";
import MessageBubble from "../chat/MessageBubble";

interface MessagePopupProps {
  message: Message;
}

const MessagePopup: React.FC<MessagePopupProps> = ({ message }) => {
  return (
    <div className="shadow-lg border border-gray-200 rounded-lg overflow-hidden max-w-xs">
      <MessageBubble 
        message={message} 
        isSelected={false}
        showMetadata={true}
        showType={true}
      />
    </div>
  );
};

export default MessagePopup; 