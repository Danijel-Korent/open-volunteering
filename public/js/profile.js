import { getUser } from './api.js';
import { getCurrentUserId } from './user-switcher.js';

/**
 * Get initials from a name (e.g. 'Maria Santos' -> 'MS').
 *
 * @param {string} name Full name
 * @returns {string} Up to 2 uppercase initials
 */
function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
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

/**
 * Render the profile page for the current user.
 *
 * @param {HTMLElement} [container] Element to render into (default: #app)
 */
export async function renderProfile(container) {
  if (!container) container = document.getElementById('app');
  container.innerHTML = '';

  const userId = getCurrentUserId();
  let user;
  try {
    user = await getUser(userId);
  } catch (e) {
    container.innerHTML = '<p>User not found.</p>';
    return;
  }

  const card = document.createElement('div');
  card.className = 'profile-card';
  card.innerHTML = `
    <div class="profile-header">
      <div class="avatar">${escapeHtml(getInitials(user.name))}</div>
      <div>
        <h1 class="profile-name">${escapeHtml(user.name)}</h1>
      </div>
    </div>
    <p class="profile-bio">${escapeHtml(user.bio || 'No bio yet.')}</p>
  `;
  container.appendChild(card);
}
