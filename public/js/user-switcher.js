import { getUsers } from './api.js';

const STORAGE_KEY = 'currentUserId';

/**
 * Get the currently selected user ID from localStorage.
 *
 * @returns {number} User ID (default 1 if not set)
 */
export function getCurrentUserId() {
  const id = localStorage.getItem(STORAGE_KEY);
  return id ? parseInt(id, 10) : 1;
}

/**
 * Persist the active user id and keep it in sync with the switcher UI.
 *
 * @param {number} id User id to store
 * @returns {void}
 */
export function setCurrentUserId(id) {
  localStorage.setItem(STORAGE_KEY, String(id));
}

/**
 * Initialize the user switcher dropdown: load users, set current, attach change handler.
 *
 * @returns {Promise<void>}
 */
export async function initUserSwitcher() {
  const el = document.getElementById('user-switcher');
  if (!(el instanceof HTMLSelectElement)) return;

  const users = await getUsers();
  const currentId = getCurrentUserId();

  el.innerHTML = users
    .map((u) => `<option value="${u.id}" ${u.id === currentId ? 'selected' : ''}>${escapeHtml(u.name)}</option>`)
    .join('');

  el.addEventListener('change', () => {
    setCurrentUserId(parseInt(el.value, 10));
    window.dispatchEvent(new Event('userchanged'));
  });
}

/**
 * Escape HTML special characters to prevent XSS.
 *
 * @param {string} str Raw string
 * @returns {string} HTML-safe string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
