import * as api from '../api.js';
import { getCurrentUser } from '../auth.js';

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
 * Get initials from a display name.
 *
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
}

/**
 * Format a date string as compact relative time.
 *
 * @param {string} dateStr
 * @returns {string}
 */
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
  return date.toLocaleDateString();
}

/**
 * Render comment section for a target.
 *
 * @param {HTMLElement} container
 * @param {string} targetType
 * @param {number} targetId
 * @param {(count: number) => void} [onCountChange]
 */
export async function renderCommentSection(container, targetType, targetId, onCountChange) {
  const user = getCurrentUser();
  let comments = [];
  try {
    comments = await api.getComments(targetType, targetId);
  } catch {
    comments = [];
  }

  container.innerHTML = `
    <div class="comments-section" data-testid="comments-${targetType}-${targetId}">
      <div class="comments-list">
        ${comments.map((c) => `
          <div class="comment" data-testid="comment-${c.id}">
            <div class="comment-avatar" aria-hidden="true">${escapeHtml(getInitials(c.author?.name || '?'))}</div>
            <div class="comment-body">
              <div class="comment-author">${escapeHtml(c.author?.name || 'Unknown')}</div>
              <div class="comment-content">${escapeHtml(c.content)}</div>
              <div class="comment-time">${timeAgo(c.createdAt)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      ${user ? `
        <div class="comment-form" data-testid="comment-form-${targetType}-${targetId}">
          <input type="text" placeholder="Write a comment..." data-testid="comment-input" maxlength="500">
          <button type="button" data-testid="comment-submit">Post</button>
        </div>
      ` : '<p class="post-meta">Login to comment</p>'}
    </div>
  `;

  onCountChange?.(comments.length);

  const submitBtn = container.querySelector('[data-testid="comment-submit"]');
  const input = container.querySelector('[data-testid="comment-input"]');

  /** Post a new comment and refresh the section. */
  const submitComment = async () => {
    if (!(input instanceof HTMLInputElement) || !(submitBtn instanceof HTMLButtonElement)) return;
    const content = input.value.trim();
    if (!content) return;
    submitBtn.disabled = true;
    try {
      await api.createComment({ targetType, targetId, content });
      input.value = '';
      await renderCommentSection(container, targetType, targetId, onCountChange);
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      submitBtn.disabled = false;
    }
  };

  submitBtn?.addEventListener('click', () => { void submitComment(); });
  input?.addEventListener('keydown', (e) => {
    if (e instanceof KeyboardEvent && e.key === 'Enter') void submitComment();
  });
}

/**
 * Toggle comments visibility on a post card.
 *
 * @param {HTMLElement} cardEl
 * @param {string} targetType
 * @param {number} targetId
 * @param {(count: number) => void} [onCountChange]
 */
export async function toggleComments(cardEl, targetType, targetId, onCountChange) {
  let section = cardEl.querySelector('.comments-wrapper');
  if (section) {
    section.remove();
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'comments-wrapper';
  cardEl.appendChild(wrapper);
  await renderCommentSection(wrapper, targetType, targetId, onCountChange);
}

/**
 * Update comment count display on a post card stats row.
 *
 * @param {HTMLElement} cardEl
 * @param {number} count
 */
export function updateCommentStats(cardEl, count) {
  const summary = cardEl.querySelector('.js-comments-summary');
  if (summary instanceof HTMLElement) {
    summary.textContent = count === 1 ? '1 comment' : count > 1 ? `${count} comments` : '';
  }
}
