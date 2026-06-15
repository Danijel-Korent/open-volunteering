import * as api from './api.js';
import { getCurrentUser } from './auth.js';
import { renderFeedControls, getFeedPrefs } from './components/feed-controls.js';
import { renderPagination } from './components/pagination.js';
import { renderPostCard } from './components/post-card.js';

/** Current feed page number (shared across re-renders). @type {number} */
let currentPage = 1;

/**
 * Render the feed page.
 *
 * @param {HTMLElement} container
 */
export async function renderFeed(container) {
  container.innerHTML = `
    <h1 class="page-title">Feed</h1>
    <div id="feed-controls-mount"></div>
    <div id="create-post-mount"></div>
    <div id="feed-list" data-testid="feed-list"></div>
    <div id="feed-pagination"></div>
  `;

  const controlsMount = document.getElementById('feed-controls-mount');
  if (controlsMount) {
    renderFeedControls(controlsMount, { showTypeFilters: true }, () => {
      currentPage = 1;
      void loadFeed();
    });
  }

  renderCreatePost();
  await loadFeed();
}

/**
 * Render create post bar for logged-in users.
 */
function renderCreatePost() {
  const mount = document.getElementById('create-post-mount');
  const user = getCurrentUser();
  if (!mount || !user) {
    if (mount) mount.innerHTML = '';
    return;
  }

  mount.innerHTML = `
    <form class="create-post-bar" data-testid="create-post-form">
      <input type="text" placeholder="What's on your mind?" data-testid="create-post-input" required>
      <button type="submit" class="btn btn-primary btn-sm" data-testid="create-post-submit">Post</button>
    </form>
  `;

  mount.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = /** @type {HTMLInputElement} */ (mount.querySelector('input'));
    const content = input.value.trim();
    if (!content) return;
    await api.createPost({ content });
    input.value = '';
    api.showToast('Post created!');
    currentPage = 1;
    await loadFeed();
  });
}

/**
 * Load and render feed items.
 */
async function loadFeed() {
  const list = document.getElementById('feed-list');
  const paginationMount = document.getElementById('feed-pagination');
  if (!list || !paginationMount) return;

  const prefs = getFeedPrefs();
  list.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const data = await api.getFeed({
      algorithm: prefs.algorithm,
      types: prefs.types.join(','),
      page: currentPage,
      perPage: prefs.perPage,
    });

    list.innerHTML = '';
    if (data.items.length === 0) {
      list.innerHTML = '<p class="empty-state">No posts to show.</p>';
    } else {
      data.items.forEach((item) => {
        list.appendChild(renderPostCard(item));
      });
    }

    renderPagination(paginationMount, data.page, data.totalPages, (page) => {
      currentPage = page;
      void loadFeed();
      window.scrollTo(0, 0);
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load feed'}</p>`;
  }
}
