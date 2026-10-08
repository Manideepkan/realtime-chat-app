// Helper functions shared by the server. Kept free of I/O so they can be unit tested.

const ROOMS = ['general', 'devops', 'random'];
const MAX_MESSAGE_LENGTH = 500;
const MAX_USERNAME_LENGTH = 20;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanUsername(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2 || trimmed.length > MAX_USERNAME_LENGTH) return null;
  if (!/^[A-Za-z0-9 ._-]+$/.test(trimmed)) return null;
  return trimmed;
}

function isValidRoom(room) {
  return ROOMS.includes(room);
}

function buildMessage(username, room, text, now = new Date()) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return {
    username,
    room,
    text: escapeHtml(trimmed.slice(0, MAX_MESSAGE_LENGTH)),
    createdAt: now.toISOString(),
  };
}

module.exports = {
  ROOMS,
  MAX_MESSAGE_LENGTH,
  MAX_USERNAME_LENGTH,
  escapeHtml,
  cleanUsername,
  isValidRoom,
  buildMessage,
};
