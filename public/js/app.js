import { renderFeed } from './feed.js';
import { renderProfile } from './profile.js';
import { initUserSwitcher } from './user-switcher.js';

const appEl = document.getElementById('app');
if (!appEl) {
  throw new Error('Missing required element #app');
}

/** @type {HTMLElement} */
const app = appEl;

/**
 * Get current route from hash (e.g. '#/feed' -> '/feed').
 *
 * @returns {string} Route path, always starting with /
 */
function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
}

/**
 * Set active state on nav link matching the current route.
 *
 * @param {string} route Route name (e.g. 'feed', 'profile')
 * @returns {void}
 */
function setActiveNav(route) {
  document.querySelectorAll('nav a[data-route]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === route);
  });
}

/**
 * Render the current page based on route.
 *
 * @returns {Promise<void>}
 */
async function render() {
  const route = getRoute();
  setActiveNav(route === '/' ? 'feed' : route.slice(1));

  if (route === '/feed' || route === '/' || route === '') {
    await renderFeed(app);
  } else if (route === '/profile') {
    await renderProfile(app);
  } else {
    app.innerHTML = '<p>Page not found.</p>';
  }
}

/**
 * Initialize app: user switcher, routing, event listeners.
 *
 * @returns {void}
 */
function init() {
  initUserSwitcher();
  void render();
  window.addEventListener('hashchange', () => {
    void render();
  });
  window.addEventListener('userchanged', () => {
    void render();
  });
}

init();
