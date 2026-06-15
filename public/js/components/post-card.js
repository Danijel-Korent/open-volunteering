import * as api from '../api.js';
import { getCurrentUser } from '../auth.js';
import { toggleComments } from './comment-section.js';

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

/** @type {Record<string, string>} */
const TYPE_LABELS = {
  user_post: 'User post',
  org_post: 'Org post',
  position: 'Position',
  event: 'Event',
};

/** Inline SVG icons for post action buttons. */
const ICONS = {
  like: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.77 11h-4.23l1.52-4.94C16.38 5.03 15.54 4 14.38 4c-.58 0-1.14.24-1.52.65L7 11H3v10h4v-9h2.05l4.32-5.9 1.05 3.4L13.28 13H7v8h11.77c.68 0 1.23-.55 1.23-1.23V12.23c0-.68-.55-1.23-1.23-1.23z"/></svg>',
  likeFilled: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>',
  comment: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>',
  share: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
  skills: '<svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
};

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
 * Build the gray metadata subline shown under the author name.
 *
 * @param {FeedItem} item
 * @returns {string}
 */
function buildMetaSubline(item) {
  const parts = [TYPE_LABELS[item.feedType] || item.feedType, formatDate(item.createdAt)];
  if (item.feedType === 'event' && item.startDate) {
    parts.push(formatDate(item.startDate));
    if (item.locationType === 'online') parts.push('Online');
    else if (item.location?.label) parts.push(item.location.label);
  }
  if (item.feedType === 'position') {
    if (item.remote) parts.push('Remote');
    else if (item.location?.label) parts.push(item.location.label);
    if (item.category) parts.push(item.category);
  }
  return parts.map((part) => escapeHtml(part)).join(' · ');
}

/**
 * Map a feed item type to the comment API target type.
 *
 * @param {FeedItem} item
 * @returns {'post' | 'position' | 'event'}
 */
function commentTargetType(item) {
  if (item.feedType === 'user_post' || item.feedType === 'org_post') return 'post';
  if (item.feedType === 'position') return 'position';
  return 'event';
}

/**
 * Format an ISO date string for display.
 *
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/**
 * Update comment count in the post card stats bar.
 *
 * @param {HTMLElement} statsRow
 * @param {number} commentCount
 */
function updateStats(statsRow, commentCount) {
  const commentsSummaryEl = statsRow.querySelector('.js-comments-summary');
  if (!(commentsSummaryEl instanceof HTMLElement)) return;

  commentsSummaryEl.textContent =
    commentCount === 1 ? '1 comment' : commentCount > 1 ? `${commentCount} comments` : '';
  statsRow.hidden = commentCount === 0;
}

/**
 * Render a single feed item card.
 *
 * @param {FeedItem} item
 * @param {{ showApply?: boolean }} opts
 * @returns {HTMLElement}
 */
export function renderPostCard(item, opts = {}) {
  const user = getCurrentUser();
  const card = document.createElement('article');
  card.className = `post-card type-${item.feedType}`;
  card.dataset.testid = `post-card-${item.feedType}-${item.id}`;

  const authorName = item.author?.name || 'Unknown';
  const authorLink = item.author ? `#/profile/${item.author.id}` : '#';
  let liked = false;
  let commentCount = 0;

  card.innerHTML = `
    <div class="post-card-header">
      <div class="post-card-avatar" aria-hidden="true">${escapeHtml(getInitials(authorName))}</div>
      <div class="post-card-headline">
        <a class="post-author" href="${authorLink}">${escapeHtml(authorName)}</a>
        <div class="post-meta-line">${buildMetaSubline(item)}</div>
      </div>
    </div>
    <div class="post-body">
      ${item.title ? `<div class="post-title">${escapeHtml(item.title)}</div>` : ''}
      <div class="post-content">${escapeHtml(item.content)}</div>
    </div>
    <div class="post-stats">
      <div class="post-stats-right">
        <span class="js-comments-summary"></span>
      </div>
    </div>
    <div class="post-actions"></div>
  `;

  const statsRow = card.querySelector('.post-stats');
  const actions = card.querySelector('.post-actions');
  if (!(statsRow instanceof HTMLElement) || !(actions instanceof HTMLElement)) return card;

  updateStats(statsRow, commentCount);

  const targetType = commentTargetType(item);

  const likeBtn = document.createElement('button');
  likeBtn.type = 'button';
  likeBtn.className = 'post-action-btn';
  likeBtn.dataset.testid = `btn-like-${item.feedType}-${item.id}`;
  likeBtn.innerHTML = `${ICONS.like}<span>Like</span>`;
  likeBtn.addEventListener('click', async () => {
    if (item.feedType === 'user_post' || item.feedType === 'org_post') await api.likePost(item.id);
    else if (item.feedType === 'position') await api.likePosition(item.id);
    else await api.likeEvent(item.id);
    liked = !liked;
    likeBtn.classList.toggle('is-active', liked);
    likeBtn.innerHTML = `${liked ? ICONS.likeFilled : ICONS.like}<span>Like</span>`;
    api.showToast('Liked!');
  });
  actions.appendChild(likeBtn);

  const commentBtn = document.createElement('button');
  commentBtn.type = 'button';
  commentBtn.className = 'post-action-btn';
  commentBtn.dataset.testid = `btn-comment-${item.feedType}-${item.id}`;
  commentBtn.innerHTML = `${ICONS.comment}<span>Comment</span>`;
  commentBtn.addEventListener('click', () => {
    void toggleComments(card, targetType, item.id, (count) => {
      commentCount = count;
      updateStats(statsRow, commentCount);
    });
  });
  actions.appendChild(commentBtn);

  if (user && (item.feedType === 'user_post' || item.feedType === 'org_post')) {
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'post-action-btn';
    shareBtn.dataset.testid = `btn-share-${item.id}`;
    shareBtn.innerHTML = `${ICONS.share}<span>Share</span>`;
    shareBtn.addEventListener('click', async () => {
      const url = `${window.location.origin}${window.location.pathname}#/feed`;
      await navigator.clipboard.writeText(url).catch(() => {});
      await api.sharePost(item.id);
      api.showToast('Link copied!');
    });
    actions.appendChild(shareBtn);
  }

  if (user?.type === 'volunteer') {
    const availBtn = document.createElement('button');
    availBtn.type = 'button';
    availBtn.className = 'post-action-btn';
    availBtn.dataset.testid = `btn-availability-${item.feedType}-${item.id}`;
    availBtn.innerHTML = `${ICONS.skills}<span>Offer skills</span>`;
    availBtn.addEventListener('click', () => {
      showAvailabilityModal(item);
    });
    actions.appendChild(availBtn);
  }

  const hasSecondary =
    (opts.showApply && item.feedType === 'position' && user?.type === 'volunteer')
    || (item.feedType === 'event' && user);

  if (hasSecondary) {
    const secondaryRow = document.createElement('div');
    secondaryRow.className = 'post-actions-secondary';

    if (opts.showApply && item.feedType === 'position' && user?.type === 'volunteer') {
      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'post-action-btn btn-primary';
      applyBtn.dataset.testid = `btn-apply-${item.id}`;
      applyBtn.textContent = 'Apply';
      applyBtn.addEventListener('click', async () => {
        try {
          await api.applyPosition(item.id);
          api.showToast('Application submitted!');
        } catch (err) {
          api.showToast(err instanceof Error ? err.message : 'Apply failed');
        }
      });
      secondaryRow.appendChild(applyBtn);
    }

    if (item.feedType === 'event' && user) {
      ['going', 'maybe'].forEach((status) => {
        const rsvpBtn = document.createElement('button');
        rsvpBtn.type = 'button';
        rsvpBtn.className = 'post-action-btn';
        rsvpBtn.dataset.testid = `btn-rsvp-${status}-${item.id}`;
        rsvpBtn.textContent = status === 'going' ? 'Going' : 'Maybe';
        rsvpBtn.addEventListener('click', async () => {
          await api.rsvpEvent(item.id, { status });
          api.showToast(`Marked as ${status}`);
        });
        secondaryRow.appendChild(rsvpBtn);
      });
    }

    card.appendChild(secondaryRow);
  }

  void api.getComments(targetType, item.id).then((comments) => {
    commentCount = comments.length;
    updateStats(statsRow, commentCount);
  }).catch(() => {});

  return card;
}

/**
 * Show a modal for volunteers to offer skills to a feed item's target.
 *
 * @param {FeedItem} item
 */
function showAvailabilityModal(item) {
  let targetType = 'post';
  if (item.feedType === 'position') targetType = 'position';
  else if (item.feedType === 'event') targetType = 'event';
  else if (item.author?.type === 'organization') targetType = 'organization';

  const targetId = targetType === 'organization' ? item.authorId : item.id;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.dataset.testid = 'availability-modal';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Offer your skills</h3>
      <div class="form-group">
        <label>Skills (comma-separated)</label>
        <input type="text" id="avail-skills" data-testid="availability-skills" placeholder="e.g. Cooking, First aid">
      </div>
      <div style="display:flex;gap:0.5rem">
        <button class="btn btn-primary" data-testid="availability-submit">Submit</button>
        <button class="btn" data-testid="availability-cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('[data-testid="availability-cancel"]')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('[data-testid="availability-submit"]')?.addEventListener('click', async () => {
    const skillsRaw = /** @type {HTMLInputElement} */ (document.getElementById('avail-skills')).value;
    const skillsOffered = skillsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await api.setAvailability({ targetType, targetId, skillsOffered });
      api.showToast('Availability set!');
      overlay.remove();
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed');
    }
  });
}
