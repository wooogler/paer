import React, { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import ChatMessage from "./ChatMessage";

const ChatInterface: React.FC = () => {
  const { messages, addMessage } = useChatStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageRef = useRef(false);
  const isComposing = useRef(false);

  // Display welcome message on first load (only once)
  useEffect(() => {
    if (messages.length === 0 && !initialMessageRef.current) {
      initialMessageRef.current = true;
      addMessage(
        "Hello! Do you need help with writing your document? How can I assist you?",
        "system"
      );
    }
  }, [addMessage, messages.length]);

  // Scroll to bottom when messages are added
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (input.trim()) {
        addMessage(input, "user");
        setInput("");

        // Keep focus on input field
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    },
    [input, addMessage]
  );

  // Submit with Enter, line break with Shift+Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing.current) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleSubmit]
  );

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
  }, []);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setInput(target.value);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Message display area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 p-4 bg-white"
      >
        <textarea
          ref={inputRef}
          value={input}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send, Shift+Enter for line break)"
          rows={3}
          className="w-full resize-none border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>
    </div>
  );
};

export default ChatInterface;
