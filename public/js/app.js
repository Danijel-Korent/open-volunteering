import { renderFeed } from './feed.js';
import { renderPositions } from './positions.js';
import { renderProfile } from './profile.js';
import { renderCalendar } from './calendar.js';
import { renderMap } from './map.js';
import { loadCurrentUser, renderAuthStatus, renderLogin, renderRegister } from './auth.js';

const appEl = document.getElementById('app');
if (!appEl) throw new Error('Missing #app');

/** @type {HTMLElement} */
const app = appEl;

/**
 * Parse hash route into path segments.
 *
 * @returns {string[]} Segments after the leading slash (e.g. ['profile', '3'])
 */
function parseRoute() {
  const hash = window.location.hash.slice(1) || '/feed';
  const path = hash.startsWith('/') ? hash : `/${hash}`;
  return path.split('/').filter(Boolean);
}

/**
 * Highlight the active navigation link for the current route.
 *
 * @param {string} route First path segment (e.g. feed, profile)
 */
function setActiveNav(route) {
  document.querySelectorAll('.header-nav a[data-route]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === route);
  });
}

/**
 * Render the page matching the current hash route.
 */
async function render() {
  const segments = parseRoute();
  const page = segments[0] || 'feed';

  if (page !== 'login' && page !== 'register') {
    setActiveNav(page);
  }

  if (page === 'feed') {
    await renderFeed(app);
  } else if (page === 'positions') {
    await renderPositions(app);
  } else if (page === 'calendar') {
    await renderCalendar(app);
  } else if (page === 'map') {
    await renderMap(app);
  } else if (page === 'profile') {
    const userId = segments[1] ? parseInt(segments[1], 10) : undefined;
    const projectId = segments[2] === 'project' && segments[3] ? parseInt(segments[3], 10) : undefined;
    await renderProfile(app, userId, projectId);
  } else if (page === 'login') {
    renderLogin(app);
  } else if (page === 'register') {
    renderRegister(app);
  } else {
    app.innerHTML = '<p class="empty-state">Page not found.</p>';
  }
}

/**
 * Bootstrap the app: load session, render header auth state, and bind route listeners.
 */
async function init() {
  await loadCurrentUser();
  renderAuthStatus();
  await render();

  window.addEventListener('hashchange', () => { void render(); });
  window.addEventListener('authchanged', async () => {
    renderAuthStatus();
    await render();
  });
}

init();
