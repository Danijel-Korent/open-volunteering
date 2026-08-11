import * as api from './api.js';

/** @type {User | null} */
let currentUser = null;

/**
 * Get cached current user.
 *
 * @returns {User | null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Load current user from API.
 *
 * @returns {Promise<User | null>}
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
 * Update auth status in header.
 */
export function renderAuthStatus() {
  const el = document.getElementById('auth-status');
  if (!el) return;

  if (currentUser) {
    el.innerHTML = `
      <span class="user-name" data-testid="current-user-name">${escapeHtml(currentUser.name)}</span>
      <button class="btn btn-sm" data-testid="btn-logout" id="btn-logout">Logout</button>
    `;
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await api.logout();
      currentUser = null;
      emitAuthChanged();
      window.location.hash = '#/feed';
    });
  } else {
    el.innerHTML = `
      <a href="#/login" data-testid="btn-login">Login</a>
      <a href="#/register" data-testid="btn-register">Register</a>
    `;
  }
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
      currentUser = /** @type {User} */ (await api.login({ name, password }));
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
 * Render register form (name + account type only; password is generated server-side).
 *
 * @param {HTMLElement} container
 */
export function renderRegister(container) {
  container.innerHTML = `
    <form class="auth-form" data-testid="register-form">
      <h2>Register</h2>
      <p class="auth-form-hint">Enter a display name and account type. A simple password will be generated for you.</p>
      <div class="form-error" id="register-error" hidden></div>
      <div class="form-group">
        <label for="reg-name">Name</label>
        <input type="text" id="reg-name" data-testid="register-name" required autocomplete="name">
      </div>
      <div class="form-group">
        <label for="reg-type">Account type</label>
        <select id="reg-type" data-testid="register-type">
          <option value="volunteer">Volunteer</option>
          <option value="organization">Organization</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%" data-testid="register-submit">Create account</button>
      <p class="form-switch">Already have an account? <a href="#/login">Login</a></p>
    </form>
  `;

  container.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('register-error');
    const name = /** @type {HTMLInputElement} */ (document.getElementById('reg-name')).value.trim();
    const type = /** @type {HTMLSelectElement} */ (document.getElementById('reg-type')).value;
    try {
      const result = /** @type {RegisterResponse} */ (await api.register({ name, type }));
      currentUser = result;
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
