const userMemories = new Map();
const MAX_MESSAGES = 4;

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
}

export function formatHistory(userId) {
  const history = getUserMemory(userId);
  return history
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n");
}

