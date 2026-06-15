import * as api from './api.js';
import { getCurrentUser } from './auth.js';

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
 * Render calendar page with events for next year.
 *
 * @param {HTMLElement} container
 */
export async function renderCalendar(container) {
  container.innerHTML = `
    <h1 class="page-title">Calendar</h1>
    <p class="post-meta">Events in the next 12 months</p>
    <div id="calendar-list" data-testid="calendar-list"></div>
  `;

  const list = document.getElementById('calendar-list');
  if (!list) return;

  list.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const events = await api.getEvents();
    const now = new Date();
    const oneYear = new Date(now);
    oneYear.setFullYear(oneYear.getFullYear() + 1);

    const filtered = events.filter((e) => {
      const start = new Date(e.startDate);
      return start >= now && start <= oneYear;
    });

    if (filtered.length === 0) {
      list.innerHTML = '<p class="empty-state">No upcoming events.</p>';
      return;
    }

    /** @type {Record<string, VolEvent[]>} */
    const byMonth = {};
    filtered.forEach((e) => {
      const key = new Date(e.startDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(e);
    });

    list.innerHTML = '';
    Object.entries(byMonth).forEach(([month, monthEvents]) => {
      const section = document.createElement('div');
      section.className = 'calendar-month';
      section.innerHTML = `<h3>${escapeHtml(month)}</h3>`;

      monthEvents.forEach((e) => {
        const el = document.createElement('div');
        el.className = 'calendar-event';
        el.dataset.testid = `calendar-event-${e.id}`;
        const start = new Date(e.startDate);
        el.innerHTML = `
          <div class="calendar-event-date">${start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
          <h4 class="post-title">${escapeHtml(e.title)}</h4>
          <p class="post-content">${escapeHtml(e.description)}</p>
          <div class="post-meta">${e.locationType === 'online' ? 'Online' : (e.location?.label || 'Physical location')}</div>
          <div class="rsvp-actions"></div>
        `;

        const user = getCurrentUser();
        const actions = el.querySelector('.rsvp-actions');
        if (user && actions) {
          actions.innerHTML = `
            <div class="post-actions">
              <button class="btn btn-sm" data-rsvp="going" data-testid="calendar-rsvp-going-${e.id}">Going</button>
              <button class="btn btn-sm" data-rsvp="maybe" data-testid="calendar-rsvp-maybe-${e.id}">Maybe</button>
            </div>
          `;
          actions.querySelectorAll('[data-rsvp]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const status = /** @type {HTMLElement} */ (btn).dataset.rsvp || 'going';
              await api.rsvpEvent(e.id, { status });
              api.showToast(`Marked as ${status}`);
            });
          });
        }

        section.appendChild(el);
      });

      list.appendChild(section);
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load'}</p>`;
  }
}
