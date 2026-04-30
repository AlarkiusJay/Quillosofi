const GUEST_CONVOS_KEY = 'zetryl_guest_conversations';
const GUEST_SPACES_KEY = 'zetryl_guest_spaces';
const GUEST_MESSAGES_PREFIX = 'zetryl_guest_messages_';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const guestStorage = {
  // --- Conversations ---
  getConversations() {
    try { return JSON.parse(localStorage.getItem(GUEST_CONVOS_KEY) || '[]'); } catch { return []; }
  },
  createConversation(data) {
    const convos = this.getConversations();
    const convo = { ...data, id: generateId(), created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    convos.unshift(convo);
    localStorage.setItem(GUEST_CONVOS_KEY, JSON.stringify(convos));
    return convo;
  },
  updateConversation(id, data) {
    const convos = this.getConversations().map(c => c.id === id ? { ...c, ...data, updated_date: new Date().toISOString() } : c);
    localStorage.setItem(GUEST_CONVOS_KEY, JSON.stringify(convos));
  },
  getConversationById(id) {
    return this.getConversations().find(c => c.id === id) || null;
  },

  // --- Spaces ---
  getSpaces() {
    try { return JSON.parse(localStorage.getItem(GUEST_SPACES_KEY) || '[]'); } catch { return []; }
  },
  createSpace(data) {
    const spaces = this.getSpaces();
    const space = { ...data, id: generateId(), created_date: new Date().toISOString() };
    spaces.unshift(space);
    localStorage.setItem(GUEST_SPACES_KEY, JSON.stringify(spaces));
    return space;
  },
  updateSpace(id, data) {
    const spaces = this.getSpaces().map(s => s.id === id ? { ...s, ...data } : s);
    localStorage.setItem(GUEST_SPACES_KEY, JSON.stringify(spaces));
  },
  deleteSpace(id) {
    const spaces = this.getSpaces().filter(s => s.id !== id);
    localStorage.setItem(GUEST_SPACES_KEY, JSON.stringify(spaces));
  },

  // --- Messages ---
  getMessages(conversationId) {
    try { return JSON.parse(localStorage.getItem(GUEST_MESSAGES_PREFIX + conversationId) || '[]'); } catch { return []; }
  },
  createMessage(data) {
    const msgs = this.getMessages(data.conversation_id);
    const msg = { ...data, id: generateId(), created_date: new Date().toISOString() };
    msgs.push(msg);
    localStorage.setItem(GUEST_MESSAGES_PREFIX + data.conversation_id, JSON.stringify(msgs));
    return msg;
  },
  updateMessage(conversationId, id, data) {
    const msgs = this.getMessages(conversationId).map(m => m.id === id ? { ...m, ...data } : m);
    localStorage.setItem(GUEST_MESSAGES_PREFIX + conversationId, JSON.stringify(msgs));
  },
  deleteMessage(conversationId, id) {
    const msgs = this.getMessages(conversationId).filter(m => m.id !== id);
    localStorage.setItem(GUEST_MESSAGES_PREFIX + conversationId, JSON.stringify(msgs));
  },
};