import * as api from './api.js';
import { getCurrentUser } from './auth.js';

/**
 * Notify listeners to refresh notification badges and dropdowns.
 *
 * @returns {void}
 */
export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event('notificationschanged'));
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
 * Format a date string as compact relative time.
 *
 * @param {string} dateStr
 * @returns {string}
 */
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Handle tapping a notification: mark read and navigate.
 *
 * @param {Notification} notification
 * @returns {Promise<void>}
 */
export async function openNotification(notification) {
  if (!notification.readAt) {
    try {
      await api.markNotificationRead(notification.id);
      notifyNotificationsChanged();
    } catch {
      // Continue navigation even if mark-read fails.
    }
  }
  if (notification.link) {
    window.location.hash = notification.link.startsWith('#')
      ? notification.link
      : `#${notification.link}`;
  }
}

/**
 * Build HTML for a single notification row.
 *
 * @param {Notification} notification
 * @returns {string}
 */
export function renderNotificationRowHtml(notification) {
  const unread = !notification.readAt;
  const orgLabel = notification.organizationName
    ? `<span class="notification-org-label">${escapeHtml(notification.organizationName)}</span>`
    : '';
  return `
    <button type="button"
      class="notification-row${unread ? ' notification-row--unread' : ''}"
      data-notification-id="${notification.id}"
      data-testid="notification-row-${notification.id}">
      ${orgLabel}
      <span class="notification-message">${escapeHtml(notification.message || 'Notification')}</span>
      <span class="notification-time">${escapeHtml(timeAgo(notification.createdAt))}</span>
      ${unread ? '<span class="notification-unread-dot" aria-label="Unread"></span>' : ''}
    </button>
  `;
}

/**
 * Bind click handlers on notification rows within a container.
 *
 * @param {HTMLElement} container
 * @param {Notification[]} notifications
 * @returns {void}
 */
export function bindNotificationRows(container, notifications) {
  container.querySelectorAll('[data-notification-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-notification-id') || '0', 10);
      const notification = notifications.find((n) => n.id === id);
      if (notification) {
        void openNotification(notification);
      }
    });
  });
}

/**
 * Render the full notifications page.
 *
 * @param {HTMLElement} container
 * @returns {Promise<void>}
 */
export async function renderNotifications(container) {
  const current = getCurrentUser();
  if (!current) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please log in to view notifications.</p>
        <a href="#/login" class="btn btn-primary">Login</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const data = await api.getNotifications({ limit: 100 });
    const items = data.items ?? [];

    container.innerHTML = `
      <div class="notifications-page">
        <div class="notifications-header">
          <h2>Notifications</h2>
          ${data.totalUnread > 0 ? `
            <button type="button" class="btn btn-sm" data-testid="btn-mark-all-notifications-read">
              Mark all read
            </button>
          ` : ''}
        </div>
        <div class="notifications-list" data-testid="notifications-list">
          ${items.length === 0
            ? '<p class="empty-state">No notifications yet.</p>'
            : items.map((n) => renderNotificationRowHtml(n)).join('')}
        </div>
      </div>
    `;

    const list = container.querySelector('[data-testid="notifications-list"]');
    if (list instanceof HTMLElement) {
      bindNotificationRows(list, items);
    }

    container.querySelector('[data-testid="btn-mark-all-notifications-read"]')
      ?.addEventListener('click', async () => {
        try {
          await api.markAllNotificationsRead();
          notifyNotificationsChanged();
          await renderNotifications(container);
        } catch (err) {
          api.showToast(err instanceof Error ? err.message : 'Failed to mark all read');
        }
      });
  } catch (err) {
    container.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load notifications'}</p>`;
  }
}
