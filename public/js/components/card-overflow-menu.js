/**
 * Reusable overflow (⋯) menu for post cards — mobile-first popover.
 */

/**
 * Close all open card overflow menus.
 */
export function closeAllCardOverflowMenus() {
  document.querySelectorAll('.card-overflow-menu.is-open').forEach((menu) => {
    menu.classList.remove('is-open');
  });
}

/**
 * Create a header overflow menu button with a popover panel.
 *
 * @param {object} options
 * @param {string} options.menuTestId data-testid for the menu toggle button
 * @param {HTMLElement[]} options.items Menu action buttons to render inside the panel
 * @returns {HTMLElement} Wrapper containing toggle + panel
 */
export function createCardOverflowMenu({ menuTestId, items }) {
  const wrap = document.createElement('div');
  wrap.className = 'post-card-menu';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'post-card-menu-toggle';
  toggle.dataset.testid = menuTestId;
  toggle.setAttribute('aria-label', 'More actions');
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '⋯';

  const panel = document.createElement('div');
  panel.className = 'card-overflow-menu';
  panel.setAttribute('role', 'menu');
  items.forEach((item) => panel.appendChild(item));

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !panel.classList.contains('is-open');
    closeAllCardOverflowMenus();
    panel.classList.toggle('is-open', willOpen);
    toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  });

  wrap.appendChild(toggle);
  wrap.appendChild(panel);
  return wrap;
}

if (!document.body.dataset.cardOverflowMenuBound) {
  document.body.dataset.cardOverflowMenuBound = '1';
  document.addEventListener('click', () => closeAllCardOverflowMenus());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllCardOverflowMenus();
  });
}

/**
 * Build a menu item button for follow/unfollow target actions.
 *
 * @param {object} options
 * @param {string} options.testId
 * @param {boolean} options.following
 * @param {() => void | Promise<void>} options.onToggle
 * @returns {HTMLButtonElement}
 */
export function createFollowTargetMenuItem({ testId, following, onToggle }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'card-overflow-menu-item';
  btn.dataset.testid = testId;
  btn.setAttribute('role', 'menuitem');
  btn.textContent = following ? 'Following' : 'Follow';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    void Promise.resolve(onToggle()).then(() => closeAllCardOverflowMenus());
  });

  return btn;
}
