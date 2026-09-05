import * as api from './api.js';
import { getCurrentUser } from './auth.js';
import { renderAvatarHtml } from './components/image-dropzone.js';

/** @type {number | null} */
let pollTimer = null;

/**
 * Notify the header to refresh the unread message badge.
 *
 * Dispatches a `messageschanged` event instead of importing `refreshMessagesUnreadBadge`
 * from auth.js — both modules load early via app.js/profile.js, and a direct import
 * caused a circular dependency where auth.js exports were not yet available when
 * messages.js initialized.
 *
 * @returns {void}
 */
function notifyMessagesChanged() {
  window.dispatchEvent(new Event('messageschanged'));
}

/**
 * Escape HTML special characters in a string.
 *
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Clear any active polling interval.
 *
 * @returns {void}
 */
function clearPoll() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/**
 * Format a timestamp as a short relative or date string.
 *
 * @param {string} iso
 * @returns {string}
 */
function formatMessageTime(iso) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString();
}

/**
 * Get the other participant in a direct conversation for avatar display.
 *
 * @param {ConversationInboxItem | Conversation} conversation
 * @param {number} currentUserId
 * @returns {User | null}
 */
function otherParticipant(conversation, currentUserId) {
  const participants = conversation.participants || [];
  if (conversation.type === 'direct') {
    return participants.find((p) => p.id !== currentUserId) || participants[0] || null;
  }
  return participants.find((p) => p.id !== currentUserId) || null;
}

/**
 * Render the messages page (inbox or thread).
 *
 * @param {HTMLElement} container
 * @param {number} [conversationId]
 * @returns {Promise<void>}
 */
export async function renderMessages(container, conversationId) {
  clearPoll();

  const current = getCurrentUser();
  if (!current) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please log in to view messages.</p>
        <a href="#/login" class="btn btn-primary" data-testid="messages-login-link">Login</a>
      </div>
    `;
    return;
  }

  if (conversationId) {
    await renderThread(container, conversationId, current);
  } else {
    await renderInbox(container, current);
  }
}

/**
 * Render the conversation inbox list.
 *
 * @param {HTMLElement} container
 * @param {User} current
 * @returns {Promise<void>}
 */
async function renderInbox(container, current) {
  container.innerHTML = `
    <div class="messages-page" data-testid="messages-inbox">
      <div class="messages-header">
        <h1 class="page-title">Messages</h1>
        <button type="button" class="btn btn-primary btn-sm" data-testid="btn-new-conversation">New</button>
      </div>
      <div id="messages-inbox-list" class="messages-inbox-list">
        <p class="empty-state">Loading…</p>
      </div>
    </div>
  `;

  container.querySelector('[data-testid="btn-new-conversation"]')?.addEventListener('click', () => {
    showNewConversationModal(current);
  });

  const refresh = async () => {
    const list = container.querySelector('#messages-inbox-list');
    if (!list) return;
    try {
      const data = await api.getConversations({ perPage: 50 });
      if (data.items.length === 0) {
        list.innerHTML = '<p class="empty-state">No conversations yet. Start one with New.</p>';
        return;
      }
      list.innerHTML = data.items.map((item) => {
        const peer = otherParticipant(item, current.id);
        const avatarUser = peer || { id: 0, name: '?', type: 'volunteer', email: '' };
        const unread = item.unreadCount > 0;
        return `
          <a href="#/messages/${item.id}" class="conversation-row ${unread ? 'conversation-row--unread' : ''}"
             data-testid="conversation-row-${item.id}">
            <div class="conversation-row-avatar">
              ${renderAvatarHtml(avatarUser, 'conversation-avatar')}
            </div>
            <div class="conversation-row-body">
              <div class="conversation-row-top">
                <span class="conversation-row-name">${escapeHtml(item.displayName)}</span>
                <span class="conversation-row-time">${formatMessageTime(item.updatedAt)}</span>
              </div>
              <div class="conversation-row-preview">${escapeHtml(item.lastMessagePreview || 'No messages yet')}</div>
            </div>
            ${unread ? '<span class="conversation-unread-dot" aria-label="Unread"></span>' : ''}
          </a>
        `;
      }).join('');
      notifyMessagesChanged();
    } catch (err) {
      list.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load'}</p>`;
    }
  };

  await refresh();
  pollTimer = window.setInterval(() => { void refresh(); }, 15000);
}

/**
 * Render a single conversation thread.
 *
 * @param {HTMLElement} container
 * @param {number} conversationId
 * @param {User} current
 * @returns {Promise<void>}
 */
async function renderThread(container, conversationId, current) {
  container.innerHTML = `
    <div class="messages-page messages-thread-page" data-testid="message-thread-${conversationId}">
      <div class="messages-thread-header">
        <a href="#/messages" class="btn btn-sm messages-back">← Back</a>
        <h1 class="messages-thread-title" id="thread-title">Loading…</h1>
      </div>
      <div id="message-list" class="message-list" data-testid="message-list"></div>
      <form class="message-composer" data-testid="message-composer">
        <input type="text" class="message-compose-input" data-testid="message-compose-input"
               placeholder="Type a message…" autocomplete="off" maxlength="2000">
        <button type="submit" class="btn btn-primary btn-sm" data-testid="message-send">Send</button>
      </form>
    </div>
  `;

  const listEl = /** @type {HTMLElement} */ (container.querySelector('#message-list'));
  const titleEl = container.querySelector('#thread-title');
  const form = container.querySelector('[data-testid="message-composer"]');
  const input = /** @type {HTMLInputElement} */ (container.querySelector('[data-testid="message-compose-input"]'));

  /** @type {Conversation | null} */
  let conversation = null;

  const loadConversation = async () => {
    conversation = await api.getConversation(conversationId);
    if (titleEl) {
      titleEl.textContent = conversation.displayName || 'Conversation';
    }
  };

  const loadMessages = async () => {
    const data = await api.getMessages(conversationId, { perPage: 100 });
    if (!listEl) return;
    if (data.items.length === 0) {
      listEl.innerHTML = '<p class="empty-state message-list-empty">No messages yet. Say hello!</p>';
      return;
    }
    listEl.innerHTML = data.items.map((msg) => {
      const isOwn = msg.authorId === current.id;
      const authorName = msg.author?.name || 'Unknown';
      return `
        <div class="message-bubble-wrap ${isOwn ? 'message-bubble-wrap--own' : ''}" data-testid="message-${msg.id}">
          <div class="message-bubble ${isOwn ? 'message-bubble-own' : 'message-bubble-other'}">
            ${!isOwn && conversation?.type === 'group' ? `<div class="message-author">${escapeHtml(authorName)}</div>` : ''}
            <div class="message-content">${escapeHtml(msg.content)}</div>
            <div class="message-time">${formatMessageTime(msg.createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');
    listEl.scrollTop = listEl.scrollHeight;
  };

  const refresh = async () => {
    try {
      await loadMessages();
      await api.markConversationRead(conversationId);
      notifyMessagesChanged();
    } catch (err) {
      if (listEl) {
        listEl.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load'}</p>`;
      }
    }
  };

  try {
    await loadConversation();
    await refresh();
  } catch (err) {
    container.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Conversation not found'}</p>`;
    return;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = input.value.trim();
    if (!content) return;
    try {
      await api.sendMessage(conversationId, content);
      input.value = '';
      await refresh();
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to send');
    }
  });

  pollTimer = window.setInterval(() => { void refresh(); }, 10000);
}

/**
 * Show modal to pick users and start a direct or group conversation.
 *
 * @param {User} current
 * @returns {Promise<void>}
 */
async function showNewConversationModal(current) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.dataset.testid = 'message-user-picker';
  overlay.innerHTML = `
    <div class="modal message-picker-modal">
      <h3>New conversation</h3>
      <div class="form-group">
        <label>Search users</label>
        <input type="text" id="picker-search" data-testid="message-picker-search" placeholder="Type a name…">
      </div>
      <div id="picker-user-list" class="message-picker-list"></div>
      <div class="form-group message-picker-group-title" id="picker-group-title-wrap" hidden>
        <label>Group title (optional)</label>
        <input type="text" id="picker-group-title" data-testid="group-chat-title" placeholder="e.g. Beach cleanup team">
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem">
        <button type="button" class="btn btn-primary" data-testid="message-picker-submit">Start</button>
        <button type="button" class="btn" data-testid="message-picker-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const listEl = overlay.querySelector('#picker-user-list');
  const searchInput = /** @type {HTMLInputElement} */ (overlay.querySelector('#picker-search'));
  const groupTitleWrap = /** @type {HTMLElement | null} */ (overlay.querySelector('#picker-group-title-wrap'));
  const groupTitleInput = /** @type {HTMLInputElement} */ (overlay.querySelector('#picker-group-title'));
  /** @type {Set<number>} */
  const selected = new Set();
  /** @type {User[]} */
  let users = [];

  const close = () => overlay.remove();
  overlay.querySelector('[data-testid="message-picker-cancel"]')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  const renderList = () => {
    if (!listEl) return;
    const q = searchInput.value.trim().toLowerCase();
    const filtered = users.filter((u) =>
      u.id !== current.id && u.name.toLowerCase().includes(q)
    );
    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No users found.</p>';
      return;
    }
    listEl.innerHTML = filtered.map((u) => `
      <label class="message-picker-item">
        <input type="checkbox" value="${u.id}" ${selected.has(u.id) ? 'checked' : ''}>
        ${renderAvatarHtml(u, 'conversation-avatar')}
        <span>${escapeHtml(u.name)}</span>
        <span class="profile-type">${escapeHtml(u.type)}</span>
      </label>
    `).join('');

    listEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = parseInt(/** @type {HTMLInputElement} */ (cb).value, 10);
        if (/** @type {HTMLInputElement} */ (cb).checked) {
          selected.add(id);
        } else {
          selected.delete(id);
        }
        if (groupTitleWrap) {
          groupTitleWrap.hidden = selected.size < 2;
        }
      });
    });
  };

  try {
    users = await api.getUsers();
    renderList();
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load users'}</p>`;
    }
  }

  searchInput.addEventListener('input', renderList);

  overlay.querySelector('[data-testid="message-picker-submit"]')?.addEventListener('click', async () => {
    if (selected.size === 0) {
      api.showToast('Select at least one person');
      return;
    }
    const participantIds = [...selected];
    const isGroup = participantIds.length >= 2;
    try {
      const conv = await api.createConversation({
        type: isGroup ? 'group' : 'direct',
        participantIds,
        title: isGroup ? groupTitleInput.value.trim() : undefined,
      });
      close();
      window.location.hash = `#/messages/${conv.id}`;
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to create conversation');
    }
  });
}

/**
 * Start or open a direct message with a user and navigate to the thread.
 *
 * @param {number} userId
 * @returns {Promise<void>}
 */
export async function startDirectMessage(userId) {
  const conv = await api.createConversation({
    type: 'direct',
    participantIds: [userId],
  });
  window.location.hash = `#/messages/${conv.id}`;
}
