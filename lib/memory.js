const userMemories = new Map();
const MAX_MESSAGES = 8;

export function getUserMemory(userId) {
  if (!userMemories.has(userId)) {
    userMemories.set(userId, []);
  }
  return userMemories.get(userId);
}

export function addMessage(userId, role, content) {
  const history = getUserMemory(userId);
  history.push({ role, content });

  if (history.length > MAX_MESSAGES) {
    history.shift();
  }

  console.log("MEMORY_WRITE", {
    userId,
    role,
    contentPreview: content.slice(0, 100),
    totalMessages: history.length,
    allMessages: history.map(m => ({
      role: m.role,
      preview: m.content.slice(0, 60)
    }))
  });
}

export function formatHistory(userId) {
  const history = getUserMemory(userId);
  return history
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n");
}
