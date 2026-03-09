import { renderFeed } from './feed.js';
import { renderProfile } from './profile.js';
import { initUserSwitcher } from './user-switcher.js';

const app = document.getElementById('app');

function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  return hash.startsWith('/') ? hash : `/${hash}`;
}

function setActiveNav(route) {
  document.querySelectorAll('nav a[data-route]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === route);
  });
}

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

function init() {
  initUserSwitcher();
  render();
  window.addEventListener('hashchange', render);
  window.addEventListener('userchanged', render);
}

init();
