const CHAT_HISTORY_KEY = 'chatHistory';

const readChatHistory = (): any[] => {
  const data = localStorage.getItem(CHAT_HISTORY_KEY);
  return data ? JSON.parse(data) : [];
};

const writeChatHistory = (messages: any[]): void => {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
};

export { readChatHistory, writeChatHistory };