/**
 * Get feed preferences from localStorage.
 *
 * @returns {{ algorithm: string, perPage: number, types: string[] }}
 */
export function getFeedPrefs() {
  const algorithm = localStorage.getItem('feedAlgorithm') || 'newest';
  const perPage = parseInt(localStorage.getItem('feedPerPage') || '10', 10);
  const typesRaw = localStorage.getItem('feedTypes');
  const types = typesRaw ? JSON.parse(typesRaw) : ['user_post', 'org_post', 'position', 'event'];
  return { algorithm, perPage, types };
}

/**
 * Save a feed preference to localStorage.
 *
 * @param {string} key localStorage key (e.g. feedAlgorithm)
 * @param {string} value
 */
export function saveFeedPref(key, value) {
  localStorage.setItem(key, value);
}

/**
 * Render feed control panel.
 *
 * @param {HTMLElement} container
 * @param {{ showTypeFilters?: boolean, positionsOnly?: boolean }} opts
 * @param {() => void} onChange
 */
export function renderFeedControls(container, opts, onChange) {
  const prefs = getFeedPrefs();
  const showTypes = opts.showTypeFilters !== false && !opts.positionsOnly;

  container.innerHTML = `
    <div class="feed-controls" data-testid="feed-controls">
      <div>
        <label for="feed-algorithm">Feed algorithm:</label>
        <select id="feed-algorithm" data-testid="feed-algorithm">
          <option value="newest" ${prefs.algorithm === 'newest' ? 'selected' : ''}>Newest first</option>
          <option value="most_liked" ${prefs.algorithm === 'most_liked' ? 'selected' : ''}>Most liked</option>
          <option value="by_location" ${prefs.algorithm === 'by_location' ? 'selected' : ''}>By location</option>
          <option value="only_remote" ${prefs.algorithm === 'only_remote' ? 'selected' : ''}>Remote only</option>
          <option value="following" ${prefs.algorithm === 'following' ? 'selected' : ''}>Following</option>
        </select>
      </div>
      <div>
        <label for="feed-per-page">Posts per page</label>
        <select id="feed-per-page" data-testid="feed-per-page">
          <option value="5" ${prefs.perPage === 5 ? 'selected' : ''}>5</option>
          <option value="10" ${prefs.perPage === 10 ? 'selected' : ''}>10</option>
          <option value="20" ${prefs.perPage === 20 ? 'selected' : ''}>20</option>
        </select>
      </div>
      ${showTypes ? `
      <div class="filter-checkboxes" data-testid="feed-type-filters">
        <label><input type="checkbox" data-type="user_post" data-testid="feed-filter-user-post" ${prefs.types.includes('user_post') ? 'checked' : ''}> User posts</label>
        <label><input type="checkbox" data-type="org_post" data-testid="feed-filter-org-post" ${prefs.types.includes('org_post') ? 'checked' : ''}> Org posts</label>
        <label><input type="checkbox" data-type="position" data-testid="feed-filter-position" ${prefs.types.includes('position') ? 'checked' : ''}> Positions</label>
        <label><input type="checkbox" data-type="event" data-testid="feed-filter-event" ${prefs.types.includes('event') ? 'checked' : ''}> Events</label>
      </div>` : ''}
    </div>
  `;

  container.querySelector('#feed-algorithm')?.addEventListener('change', (e) => {
    saveFeedPref('feedAlgorithm', /** @type {HTMLSelectElement} */ (e.target).value);
    onChange();
  });

  container.querySelector('#feed-per-page')?.addEventListener('change', (e) => {
    saveFeedPref('feedPerPage', /** @type {HTMLSelectElement} */ (e.target).value);
    onChange();
  });

  container.querySelectorAll('.filter-checkboxes input').forEach((cb) => {
    cb.addEventListener('change', () => {
      const types = [];
      container.querySelectorAll('.filter-checkboxes input:checked').forEach((c) => {
        types.push(/** @type {HTMLInputElement} */ (c).dataset.type || '');
      });
      localStorage.setItem('feedTypes', JSON.stringify(types));
      onChange();
    });
  });
}
