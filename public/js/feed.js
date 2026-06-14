import {
  getUsers,
  getPositions,
  getComments,
  createComment,
} from './api.js';
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
 * Format a date string as relative time (e.g. '2 hours ago').
 *
 * @param {string} dateStr ISO date string
 * @returns {string} Human-readable relative time
 */
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return date.toLocaleDateString();
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
 * Render a single position card with comments.
 *
 * @param {HTMLElement} container Parent element
 * @param {Position} position Position data
 * @param {Record<number, User>} usersMap Map of user id to user object
 * @returns {Promise<void>}
 */
async function renderPosition(container, position, usersMap) {
  const author = usersMap[position.authorId] || { name: 'Unknown' };
  const comments = await getComments(position.id);
  const commentsWithAuthors = await Promise.all(
    comments.map(async (c) => ({
      ...c,
      author: usersMap[c.authorId] || { name: 'Unknown' },
    }))
  );

  const article = document.createElement('article');
  article.className = 'position';
  article.dataset.positionId = String(position.id);
  article.innerHTML = `
    <div class="position-header">
      <div class="avatar">${escapeHtml(getInitials(author.name))}</div>
      <div class="position-meta">
        <div class="name">${escapeHtml(author.name)}</div>
        <div class="time">${timeAgo(position.createdAt)}</div>
      </div>
    </div>
    <h3 class="position-title">${escapeHtml(position.title)}</h3>
    <p class="position-description">${escapeHtml(position.description)}</p>
    <div class="position-actions">
      <button type="button" class="js-toggle-comments">Comment (${comments.length})</button>
    </div>
    <div class="comments-section" style="display:none">
      <div class="comments-list"></div>
      <div class="comment-form">
        <input type="text" placeholder="Write a comment..." class="comment-input" maxlength="500">
        <button type="button" class="comment-submit">Post</button>
      </div>
    </div>
  `;

  const commentsSection = article.querySelector('.comments-section');
  const commentsList = article.querySelector('.comments-list');
  const commentInput = article.querySelector('.comment-input');
  const commentSubmit = article.querySelector('.comment-submit');
  const toggleCommentsBtn = article.querySelector('.js-toggle-comments');
  if (
    !(commentsSection instanceof HTMLElement) ||
    !(commentsList instanceof HTMLElement) ||
    !(commentInput instanceof HTMLInputElement) ||
    !(commentSubmit instanceof HTMLButtonElement) ||
    !(toggleCommentsBtn instanceof HTMLButtonElement)
  ) {
    throw new Error('Feed position DOM template is incomplete');
  }

  /** @type {HTMLElement} */
  const commentsListEl = commentsList;

  /**
   * Render current comments list into the DOM.
   *
   * @param {CommentWithAuthor[]} items Comments with author names
   * @returns {void}
   */
  function renderComments(items) {
    commentsListEl.innerHTML = items
      .map(
        (c) => `
      <div class="comment">
        <div class="avatar">${escapeHtml(getInitials(c.author.name))}</div>
        <div class="comment-body">
          <div class="comment-author">${escapeHtml(c.author.name)}</div>
          <div class="comment-content">${escapeHtml(c.content)}</div>
          <div class="comment-time">${timeAgo(c.createdAt)}</div>
        </div>
      </div>
    `
      )
      .join('');
  }

  renderComments(commentsWithAuthors);

  toggleCommentsBtn.addEventListener('click', () => {
    const isHidden = commentsSection.style.display === 'none';
    commentsSection.style.display = isHidden ? 'block' : 'none';
  });

  commentSubmit.addEventListener('click', async () => {
    const content = commentInput.value.trim();
    if (!content) return;
    const currentId = getCurrentUserId();
    commentSubmit.disabled = true;
    try {
      const newComment = await createComment(position.id, {
        content,
        authorId: currentId,
      });
      const authorUser = usersMap[currentId] || { name: 'Unknown' };
      commentsWithAuthors.push({ ...newComment, author: authorUser });
      renderComments(commentsWithAuthors);
      commentInput.value = '';
      toggleCommentsBtn.textContent = `Comment (${commentsWithAuthors.length})`;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to post comment';
      alert(message);
    } finally {
      commentSubmit.disabled = false;
    }
  });

  commentInput.addEventListener('keydown', (e) => {
    if (e instanceof KeyboardEvent && e.key === 'Enter') commentSubmit.click();
  });

  container.appendChild(article);
}

/**
 * Render the feed page: list of positions (new positions are opened from Profile).
 *
 * @param {HTMLElement} [container] Element to render into (default: #app)
 * @returns {Promise<void>}
 */
export async function renderFeed(container) {
  const root = container ?? document.getElementById('app');
  if (!root) throw new Error('Missing #app');
  root.innerHTML = '';

  const [users, positions] = await Promise.all([getUsers(), getPositions()]);
  /** @type {Record<number, User>} */
  const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

  for (const pos of positions) {
    await renderPosition(root, pos, usersMap);
  }

  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  pagination.innerHTML = '<span>End of feed</span>';
  root.appendChild(pagination);
}
