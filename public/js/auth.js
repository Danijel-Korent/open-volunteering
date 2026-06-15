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
 * Render login form.
 *
 * @param {HTMLElement} container
 */
export function renderLogin(container) {
  container.innerHTML = `
    <form class="auth-form" data-testid="login-form">
      <h2>Login</h2>
      <div class="form-error" id="login-error" hidden></div>
      <div class="form-group">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" data-testid="login-email" required>
      </div>
      <div class="form-group">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" data-testid="login-password" required>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%" data-testid="login-submit">Login</button>
      <p class="form-switch">No account? <a href="#/register">Register</a></p>
    </form>
  `;

  container.querySelector('form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const email = /** @type {HTMLInputElement} */ (document.getElementById('login-email')).value;
    const password = /** @type {HTMLInputElement} */ (document.getElementById('login-password')).value;
    try {
      currentUser = /** @type {User} */ (await api.login({ email, password }));
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
 * Render register form.
 *
 * @param {HTMLElement} container
 */
export function renderRegister(container) {
  container.innerHTML = `
    <form class="auth-form" data-testid="register-form">
      <h2>Register</h2>
      <div class="form-error" id="register-error" hidden></div>
      <div class="form-group">
        <label for="reg-name">Name</label>
        <input type="text" id="reg-name" data-testid="register-name" required>
      </div>
      <div class="form-group">
        <label for="reg-email">Email</label>
        <input type="email" id="reg-email" data-testid="register-email" required>
      </div>
      <div class="form-group">
        <label for="reg-password">Password</label>
        <input type="password" id="reg-password" data-testid="register-password" required>
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
    const name = /** @type {HTMLInputElement} */ (document.getElementById('reg-name')).value;
    const email = /** @type {HTMLInputElement} */ (document.getElementById('reg-email')).value;
    const password = /** @type {HTMLInputElement} */ (document.getElementById('reg-password')).value;
    const type = /** @type {HTMLSelectElement} */ (document.getElementById('reg-type')).value;
    try {
      currentUser = /** @type {User} */ (await api.register({ name, email, password, type }));
      emitAuthChanged();
      window.location.hash = '#/profile';
    } catch (err) {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = err instanceof Error ? err.message : 'Registration failed';
      }
    }
  });
}
