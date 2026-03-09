import { getUsers } from './api.js';

const STORAGE_KEY = 'currentUserId';

export function getCurrentUserId() {
  const id = localStorage.getItem(STORAGE_KEY);
  return id ? parseInt(id, 10) : 1;
}

export function setCurrentUserId(id) {
  localStorage.setItem(STORAGE_KEY, String(id));
}

export async function initUserSwitcher() {
  const select = document.getElementById('user-switcher');
  if (!select) return;

  const users = await getUsers();
  const currentId = getCurrentUserId();

  select.innerHTML = users
    .map((u) => `<option value="${u.id}" ${u.id === currentId ? 'selected' : ''}>${escapeHtml(u.name)}</option>`)
    .join('');

  select.addEventListener('change', () => {
    setCurrentUserId(parseInt(select.value, 10));
    window.dispatchEvent(new Event('userchanged'));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
