import * as api from './api.js';
import { renderFeedControls, renderPerPageControl, getFeedPrefs } from './components/feed-controls.js';
import { renderPagination } from './components/pagination.js';
import { renderPostCard } from './components/post-card.js';

/** Current positions page number (shared across re-renders). @type {number} */
let currentPage = 1;

/**
 * Render the positions page.
 *
 * @param {HTMLElement} container
 */
export async function renderPositions(container) {
  container.innerHTML = `
    <h1 class="page-title">Volunteering Positions</h1>
    <div id="positions-controls-mount"></div>
    <div id="positions-list" data-testid="positions-list"></div>
    <div id="positions-pagination">
      <div id="positions-per-page-mount"></div>
      <div id="positions-pagination-nav"></div>
    </div>
  `;

  const controlsMount = document.getElementById('positions-controls-mount');
  if (controlsMount) {
    renderFeedControls(controlsMount, { showTypeFilters: false, positionsOnly: true }, () => {
      currentPage = 1;
      void loadPositions();
    });
  }

  const perPageMount = document.getElementById('positions-per-page-mount');
  if (perPageMount) {
    renderPerPageControl(perPageMount, () => {
      currentPage = 1;
      void loadPositions();
    });
  }

  await loadPositions();
}

/**
 * Load positions feed.
 */
async function loadPositions() {
  const list = document.getElementById('positions-list');
  const paginationMount = document.getElementById('positions-pagination-nav');
  if (!list || !paginationMount) return;

  const prefs = getFeedPrefs();
  list.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const data = await api.getFeed({
      algorithm: prefs.algorithm,
      positionsOnly: '1',
      page: currentPage,
      perPage: prefs.perPage,
    });

    list.innerHTML = '';
    if (data.items.length === 0) {
      list.innerHTML = '<p class="empty-state">No open positions.</p>';
    } else {
      data.items.forEach((item) => {
        list.appendChild(renderPostCard(item, { showApply: true }));
      });
    }

    renderPagination(paginationMount, data.page, data.totalPages, (page) => {
      currentPage = page;
      void loadPositions();
      window.scrollTo(0, 0);
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load'}</p>`;
  }
}
