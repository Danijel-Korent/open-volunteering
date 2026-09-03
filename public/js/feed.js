import * as api from './api.js';
import { getCurrentUser } from './auth.js';
import { renderFeedControls, renderPerPageControl, getFeedPrefs } from './components/feed-controls.js';
import { setupImageDropzone } from './components/image-dropzone.js';
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
    <div id="feed-pagination">
      <div id="feed-per-page-mount"></div>
      <div id="feed-pagination-nav"></div>
    </div>
  `;

  const controlsMount = document.getElementById('feed-controls-mount');
  if (controlsMount) {
    renderFeedControls(controlsMount, { showTypeFilters: true }, () => {
      currentPage = 1;
      void loadFeed();
    });
  }

  const perPageMount = document.getElementById('feed-per-page-mount');
  if (perPageMount) {
    renderPerPageControl(perPageMount, () => {
      currentPage = 1;
      void loadFeed();
    });
  }

  renderCreatePost();
  await loadFeed();
}

/**
 * Render create post composer for logged-in users.
 */
function renderCreatePost() {
  const mount = document.getElementById('create-post-mount');
  const user = getCurrentUser();
  if (!mount || !user) {
    if (mount) mount.innerHTML = '';
    return;
  }

  mount.innerHTML = `
    <form class="create-post-composer" data-testid="create-post-form">
      <div id="create-post-dropzone-mount"></div>
      <div class="create-post-bar">
        <input type="text" placeholder="What's on your mind?" data-testid="create-post-input" required>
        <button type="submit" class="btn btn-primary btn-sm" data-testid="create-post-submit">Post</button>
      </div>
    </form>
  `;

  const form = /** @type {HTMLFormElement} */ (mount.querySelector('form'));
  const input = /** @type {HTMLInputElement} */ (mount.querySelector('[data-testid="create-post-input"]'));
  const submitBtn = /** @type {HTMLButtonElement} */ (mount.querySelector('[data-testid="create-post-submit"]'));
  const dropzoneMount = /** @type {HTMLElement} */ (mount.querySelector('#create-post-dropzone-mount'));

  const dropzone = setupImageDropzone(dropzoneMount, {
    dropzoneTestId: 'create-post-dropzone',
    fileInputTestId: 'create-post-file-input',
    previewTestId: 'create-post-image-preview',
    label: 'Add a photo — drop here or tap',
    onChange: ({ uploading }) => {
      submitBtn.disabled = uploading;
    },
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (dropzone.isUploading()) return;
    const content = input.value.trim();
    if (!content) return;

    submitBtn.disabled = true;
    /** @type {{ content: string, imageFileId?: number }} */
    const payload = { content };
    const imageFileId = dropzone.getFileId();
    if (imageFileId) payload.imageFileId = imageFileId;

    try {
      await api.createPost(payload);
      input.value = '';
      await dropzone.clear();
      api.showToast('Post created!');
      currentPage = 1;
      await loadFeed();
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      submitBtn.disabled = dropzone.isUploading();
    }
  });
}

/**
 * Load and render feed items.
 */
async function loadFeed() {
  const list = document.getElementById('feed-list');
  const paginationMount = document.getElementById('feed-pagination-nav');
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
        list.appendChild(renderPostCard(item, { showApply: true }));
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
