import * as api from './api.js';

/** @type {MeResponse | null} */
let currentUser = null;

/** @type {number | null} */
let notificationsPollTimer = null;

/**
 * Get cached active account (user or organization context).
 *
 * @returns {MeResponse | null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get logged-in user id (stable across context switches).
 *
 * @returns {number | null}
 */
export function getSessionUserId() {
  return currentUser?.userId ?? null;
}

/**
 * Get org memberships for the logged-in user.
 *
 * @returns {Membership[]}
 */
export function getMemberships() {
  return currentUser?.memberships ?? [];
}

/**
 * Load current session from API.
 *
 * @returns {Promise<MeResponse | null>}
 */
export async function loadCurrentUser() {
  try {
    currentUser = await api.getMe();
  } catch {
    currentUser = null;
  }
  return currentUser;
}

/**
 * Emit authchanged event.
 */
function emitAuthChanged() {
  window.dispatchEvent(new Event('authchanged'));
}

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

/**
 * Switch active account context and refresh session.
 *
 * @param {AccountType} activeAccountType
 * @param {number} [activeAccountId]
 * @returns {Promise<void>}
 */
export async function switchToAccount(activeAccountType, activeAccountId) {
  currentUser = await api.switchAccount({
    activeAccountType,
    activeAccountId,
  });
  emitAuthChanged();
  if (activeAccountType === 'organization' && activeAccountId) {
    window.location.hash = `#/organization/${activeAccountId}`;
  } else {
    window.location.hash = '#/profile';
  }
}

/**
 * Show modal to create a new organization.
 *
 * @returns {Promise<void>}
 */
export async function showCreateOrganizationModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.dataset.testid = 'create-org-modal';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Create organization</h3>
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="create-org-name" data-testid="create-org-name" required>
      </div>
      <div class="form-group">
        <label>Bio (optional)</label>
        <textarea id="create-org-bio" data-testid="create-org-bio"></textarea>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem">
        <button type="button" class="btn btn-primary" data-testid="create-org-submit">Create</button>
        <button type="button" class="btn" data-testid="create-org-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('[data-testid="create-org-cancel"]')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('[data-testid="create-org-submit"]')?.addEventListener('click', async () => {
    const name = /** @type {HTMLInputElement} */ (overlay.querySelector('#create-org-name')).value.trim();
    const bio = /** @type {HTMLTextAreaElement} */ (overlay.querySelector('#create-org-bio')).value.trim();
    if (!name) {
      api.showToast('Name is required');
      return;
    }
    try {
      const org = await api.createOrganization({ name, bio });
      await loadCurrentUser();
      emitAuthChanged();
      close();
      window.location.hash = `#/organization/${org.id}`;
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to create organization');
    }
  });
}

/**
 * Render account switcher dropdown HTML.
 *
 * @param {MeResponse} me
 * @returns {string}
 */
function renderAccountSwitcher(me) {
  const adminOrgs = (me.memberships ?? []).filter((m) => m.role === 'admin');
  const isUserContext = me.activeAccountType === 'user';
  const userName = me.userProfile?.name ?? (me.type === 'user' ? /** @type {User} */ (me).name : 'My profile');

  const orgOptions = adminOrgs.map((m) => {
    const active = !isUserContext && me.activeAccountId === m.organizationId;
    return `<button type="button" class="account-switcher-item${active ? ' active' : ''}" data-switch-type="organization" data-switch-id="${m.organizationId}" data-testid="account-switch-org-${m.organizationId}">
      ${escapeHtml(m.organizationName)}
    </button>`;
  }).join('');

  return `
    <div class="account-switcher" data-testid="account-switcher">
      <button type="button" class="account-switcher-toggle btn btn-sm" data-testid="account-switcher-toggle" aria-haspopup="listbox">
        ${escapeHtml(/** @type {MeResponse} */ (me).name)} ▾
      </button>
      <div class="account-switcher-menu" hidden>
        <button type="button" class="account-switcher-item${isUserContext ? ' active' : ''}" data-switch-type="user" data-testid="account-switch-user">
          ${escapeHtml(userName)}
        </button>
        ${orgOptions}
        <button type="button" class="account-switcher-item account-switcher-create" data-testid="account-switcher-create">
          + Create organization
        </button>
      </div>
    </div>
  `;
}

/**
 * Bind account switcher interactions.
 */
function bindAccountSwitcher() {
  const switcher = document.querySelector('.account-switcher');
  if (!switcher) return;

  const toggle = switcher.querySelector('.account-switcher-toggle');
  const menu = /** @type {HTMLElement | null} */ (switcher.querySelector('.account-switcher-menu'));

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu) menu.hidden = !menu.hidden;
  });

  document.addEventListener('click', () => {
    if (menu) menu.hidden = true;
  });

  switcher.querySelectorAll('[data-switch-type]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const type = /** @type {AccountType} */ (btn.getAttribute('data-switch-type'));
      const idAttr = btn.getAttribute('data-switch-id');
      const id = idAttr ? parseInt(idAttr, 10) : undefined;
      try {
        await switchToAccount(type, id);
      } catch (err) {
        api.showToast(err instanceof Error ? err.message : 'Switch failed');
      }
    });
  });

  switcher.querySelector('[data-testid="account-switcher-create"]')?.addEventListener('click', () => {
    if (menu) menu.hidden = true;
    void showCreateOrganizationModal();
  });
}

/**
 * Stop polling for notification unread counts.
 *
 * @returns {void}
 */
function stopNotificationsPolling() {
  if (notificationsPollTimer !== null) {
    clearInterval(notificationsPollTimer);
    notificationsPollTimer = null;
  }
}

/**
 * Start polling for notification unread counts.
 *
 * @returns {void}
 */
function startNotificationsPolling() {
  stopNotificationsPolling();
  notificationsPollTimer = window.setInterval(() => {
    void refreshNotificationsUnreadBadge();
  }, 30000);
}

/**
 * Refresh the notifications dropdown preview list.
 *
 * @returns {Promise<void>}
 */
async function refreshNotificationsDropdown() {
  const dropdown = /** @type {HTMLElement | null} */ (
    document.querySelector('[data-testid="notifications-dropdown"]')
  );
  if (!dropdown || dropdown.hidden || !currentUser) {
    return;
  }
  try {
    const data = await api.getNotifications({ limit: 5 });
    const items = data.items ?? [];
    if (items.length === 0) {
      dropdown.innerHTML = '<p class="notifications-dropdown-empty">No notifications yet.</p>';
      return;
    }
    dropdown.innerHTML = `
      <div class="notifications-dropdown-list">
        ${items.map((n) => {
          const unread = !n.readAt;
          return `
            <button type="button"
              class="notification-row${unread ? ' notification-row--unread' : ''}"
              data-dropdown-notification-id="${n.id}"
              data-notification-link="${escapeHtml(n.link || '#/feed')}">
              ${n.organizationName ? `<span class="notification-org-label">${escapeHtml(n.organizationName)}</span>` : ''}
              <span class="notification-message">${escapeHtml(n.message || 'Notification')}</span>
            </button>
          `;
        }).join('')}
      </div>
      <a href="#/notifications" class="notifications-dropdown-all" data-testid="header-notifications-all">See all</a>
    `;
    dropdown.querySelectorAll('[data-dropdown-notification-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-dropdown-notification-id') || '0', 10);
        const link = btn.getAttribute('data-notification-link') || '#/feed';
        dropdown.hidden = true;
        try {
          await api.markNotificationRead(id);
          window.dispatchEvent(new Event('notificationschanged'));
        } catch {
          // Continue navigation even if mark-read fails.
        }
        window.location.hash = link.startsWith('#') ? link : `#${link}`;
      });
    });
  } catch {
    dropdown.innerHTML = '<p class="notifications-dropdown-empty">Could not load notifications.</p>';
  }
}

/**
 * Bind header notification bell interactions.
 *
 * @returns {void}
 */
function bindNotificationsBell() {
  const wrap = document.querySelector('.header-notifications-wrap');
  const btn = document.querySelector('[data-testid="header-notifications"]');
  const dropdown = /** @type {HTMLElement | null} */ (
    document.querySelector('[data-testid="notifications-dropdown"]')
  );
  if (!wrap || !btn || !dropdown) {
    return;
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = dropdown.hidden;
    dropdown.hidden = !willOpen;
    if (willOpen) {
      void refreshNotificationsDropdown();
    }
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(/** @type {Node} */ (e.target))) {
      dropdown.hidden = true;
    }
  });
}

/**
 * Update auth status in header.
 */
export function renderAuthStatus() {
  const el = document.getElementById('auth-status');
  if (!el) return;

  if (currentUser) {
    el.innerHTML = `
      <a href="#/messages" class="header-messages-link" data-testid="header-messages">Messages</a>
      <span class="unread-badge" data-testid="header-messages-unread" hidden></span>
      <div class="header-notifications-wrap">
        <button type="button" class="header-notifications-btn" data-testid="header-notifications" aria-label="Notifications">🔔</button>
        <span class="unread-badge header-notifications-badge" data-testid="header-notifications-unread" hidden></span>
        <div class="notifications-dropdown" data-testid="notifications-dropdown" hidden></div>
      </div>
      ${renderAccountSwitcher(currentUser)}
      <button class="btn btn-sm" data-testid="btn-logout" id="btn-logout">Logout</button>
    `;
    bindAccountSwitcher();
    bindNotificationsBell();
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await api.logout();
      currentUser = null;
      stopNotificationsPolling();
      emitAuthChanged();
      window.location.hash = '#/feed';
    });
    void refreshMessagesUnreadBadge();
    void refreshNotificationsUnreadBadge();
    startNotificationsPolling();
  } else {
    stopNotificationsPolling();
    el.innerHTML = `
      <a href="#/login" data-testid="btn-login">Login</a>
      <a href="#/register" data-testid="btn-register">Register</a>
    `;
  }
}

/**
 * Refresh the unread messages badge in the header.
 *
 * @returns {Promise<void>}
 */
export async function refreshMessagesUnreadBadge() {
  const badge = /** @type {HTMLElement | null} */ (document.querySelector('[data-testid="header-messages-unread"]'));
  if (!badge || !currentUser) return;
  try {
    const data = await api.getConversations({ perPage: 50 });
    const total = data.totalUnread ?? 0;
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch {
    badge.hidden = true;
  }
}

/**
 * Render login form (name + password).
 *
 * @param {HTMLElement} container
 */
export function renderLogin(container) {
  container.innerHTML = `
    <form class="auth-form" data-testid="login-form">
      <h2>Login</h2>
      <div class="form-error" id="login-error" hidden></div>
      <div class="form-group">
        <label for="login-name">Name</label>
        <input type="text" id="login-name" data-testid="login-name" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" data-testid="login-password" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%" data-testid="login-submit">Login</button>
      <p class="form-switch">No account? <a href="#/register">Register</a></p>
    </form>
  `;

  container.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const name = /** @type {HTMLInputElement} */ (document.getElementById('login-name')).value;
    const password = /** @type {HTMLInputElement} */ (document.getElementById('login-password')).value;
    try {
      currentUser = await api.login({ name, password });
      emitAuthChanged();
      window.location.hash = '#/feed';
    } catch (err) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = err instanceof Error ? err.message : 'Login failed';
      }
    }
  });
}

/**
 * Show post-registration screen with generated credentials.
 *
 * @param {HTMLElement} container
 * @param {string} name Display name used for login
 * @param {string} password Server-generated password (shown once)
 */
function renderRegisterSuccess(container, name, password) {
  const loginDetails = `Name: ${name}\nPassword: ${password}`;

  container.innerHTML = `
    <div class="auth-form auth-success" data-testid="register-success">
      <h2>Account created</h2>
      <p class="auth-success-lead">Save your login details — the password is shown only once.</p>
      <dl class="credential-list">
        <div class="credential-row">
          <dt>Name</dt>
          <dd data-testid="register-success-name">${escapeHtml(name)}</dd>
        </div>
        <div class="credential-row credential-row-highlight">
          <dt>Password</dt>
          <dd class="credential-password" data-testid="register-success-password">${escapeHtml(password)}</dd>
        </div>
      </dl>
      <button type="button" class="btn btn-secondary" style="width:100%" data-testid="register-copy-credentials">
        Copy login details
      </button>
      <button type="button" class="btn btn-primary" style="width:100%;margin-top:0.75rem" data-testid="register-continue">
        Continue to profile
      </button>
    </div>
  `;

  container.querySelector('[data-testid="register-copy-credentials"]')?.addEventListener('click', async () => {
    const btn = container.querySelector('[data-testid="register-copy-credentials"]');
    try {
      await navigator.clipboard.writeText(loginDetails);
      if (btn) btn.textContent = 'Copied!';
      setTimeout(() => {
        if (btn) btn.textContent = 'Copy login details';
      }, 2000);
    } catch {
      api.showToast('Could not copy — please write down your password');
    }
  });

  container.querySelector('[data-testid="register-continue"]')?.addEventListener('click', () => {
    window.location.hash = '#/profile';
  });
}

/**
 * Render register form (name only; password is generated server-side).
 *
 * @param {HTMLElement} container
 */
export function renderRegister(container) {
  container.innerHTML = `
    <form class="auth-form" data-testid="register-form">
      <h2>Register</h2>
      <p class="auth-form-hint">Enter a display name. A simple password will be generated for you.</p>
      <div class="form-error" id="register-error" hidden></div>
      <div class="form-group">
        <label for="reg-name">Name</label>
        <input type="text" id="reg-name" data-testid="register-name" required autocomplete="name">
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%" data-testid="register-submit">Create account</button>
      <p class="form-switch">Already have an account? <a href="#/login">Login</a></p>
    </form>
  `;

  container.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('register-error');
    const name = /** @type {HTMLInputElement} */ (document.getElementById('reg-name')).value.trim();
    try {
      const result = /** @type {RegisterResponse} */ (await api.register({ name }));
      await loadCurrentUser();
      emitAuthChanged();
      renderRegisterSuccess(container, name, result.generatedPassword);
    } catch (err) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = err instanceof Error ? err.message : 'Registration failed';
      }
    }
  });
}

/**
 * Refresh the unread notifications badge in the header.
 *
 * @returns {Promise<void>}
 */
export async function refreshNotificationsUnreadBadge() {
  const badge = /** @type {HTMLElement | null} */ (
    document.querySelector('[data-testid="header-notifications-unread"]')
  );
  if (!badge || !currentUser) return;
  try {
    const data = await api.getNotificationsUnreadCount();
    const total = data.totalUnread ?? 0;
    if (total > 0) {
      badge.textContent = total > 99 ? '99+' : String(total);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  } catch {
    badge.hidden = true;
  }
}

window.addEventListener('messageschanged', () => {
  void refreshMessagesUnreadBadge();
});

window.addEventListener('notificationschanged', () => {
  void refreshNotificationsUnreadBadge();
});
