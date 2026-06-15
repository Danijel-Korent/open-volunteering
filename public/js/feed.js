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
 * Format a date string as compact relative time (e.g. '2h', '3d').
 *
 * @param {string} dateStr ISO date string
 * @returns {string} Human-readable relative time
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

/** Inline SVG icons for post action buttons. */
const ICONS = {
  like: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.77 11h-4.23l1.52-4.94C16.38 5.03 15.54 4 14.38 4c-.58 0-1.14.24-1.52.65L7 11H3v10h4v-9h2.05l4.32-5.9 1.05 3.4L13.28 13H7v8h11.77c.68 0 1.23-.55 1.23-1.23V12.23c0-.68-.55-1.23-1.23-1.23z"/></svg>',
  likeFilled: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>',
  comment: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>',
  share: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
};

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
    <div class="position-body">
      <div class="position-title">${escapeHtml(position.title)}</div>
      <div class="position-description">${escapeHtml(position.description)}</div>
    </div>
    <div class="position-stats">
      <div class="position-stats-left">
        <span class="js-like-count" hidden></span>
      </div>
      <div class="position-stats-right">
        <span class="js-comments-summary"></span>
      </div>
    </div>
    <div class="position-actions">
      <button type="button" class="js-like-btn">${ICONS.like}<span>Like</span></button>
      <button type="button" class="js-toggle-comments">${ICONS.comment}<span>Comment</span></button>
      <button type="button" class="js-share-btn">${ICONS.share}<span>Share</span></button>
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
  const likeBtn = article.querySelector('.js-like-btn');
  const likeCountEl = article.querySelector('.js-like-count');
  const commentsSummaryEl = article.querySelector('.js-comments-summary');
  const statsRow = article.querySelector('.position-stats');
  if (
    !(commentsSection instanceof HTMLElement) ||
    !(commentsList instanceof HTMLElement) ||
    !(commentInput instanceof HTMLInputElement) ||
    !(commentSubmit instanceof HTMLButtonElement) ||
    !(toggleCommentsBtn instanceof HTMLButtonElement) ||
    !(likeBtn instanceof HTMLButtonElement) ||
    !(likeCountEl instanceof HTMLElement) ||
    !(commentsSummaryEl instanceof HTMLElement) ||
    !(statsRow instanceof HTMLElement)
  ) {
    throw new Error('Feed position DOM template is incomplete');
  }

  let likeCount = 0;
  let liked = false;

  /** @type {HTMLElement} */
  const likeCountElTyped = likeCountEl;
  /** @type {HTMLElement} */
  const commentsSummaryElTyped = commentsSummaryEl;
  /** @type {HTMLElement} */
  const statsRowEl = statsRow;

  /**
   * Update like and comment counts in the stats bar.
   *
   * @param {number} commentCount Current number of comments
   * @returns {void}
   */
  function updateStats(commentCount) {
    likeCountElTyped.hidden = likeCount === 0;
    likeCountElTyped.textContent = likeCount === 1 ? '1' : String(likeCount);
    commentsSummaryElTyped.textContent =
      commentCount === 1 ? '1 comment' : commentCount > 1 ? `${commentCount} comments` : '';
    statsRowEl.hidden = likeCount === 0 && commentCount === 0;
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
  updateStats(commentsWithAuthors.length);

  likeBtn.addEventListener('click', () => {
    liked = !liked;
    likeCount += liked ? 1 : -1;
    likeBtn.classList.toggle('is-active', liked);
    likeBtn.innerHTML = `${liked ? ICONS.likeFilled : ICONS.like}<span>Like</span>`;
    updateStats(commentsWithAuthors.length);
  });

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
      updateStats(commentsWithAuthors.length);
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
