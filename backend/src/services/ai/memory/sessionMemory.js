const MAX_MESSAGES = 10;
const sessions = new Map();

const trimSession = (messages) => messages.slice(-MAX_MESSAGES);

export const getSessionMessages = (sessionId) => {
  if (!sessionId) return [];
  return sessions.get(sessionId) || [];
};

export const rememberExchange = (sessionId, userMessage, assistantMessage) => {
  if (!sessionId) return;
  const current = sessions.get(sessionId) || [];
  sessions.set(
    sessionId,
    trimSession([
      ...current,
      { role: 'user', content: String(userMessage || '').slice(0, 1000) },
      { role: 'assistant', content: String(assistantMessage || '').slice(0, 1600) }
    ])
  );
};

export const clearSessionMemory = (sessionId) => {
  if (sessionId) sessions.delete(sessionId);
};
