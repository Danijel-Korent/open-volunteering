/**
 * Going / Maybe RSVP controls for events (feed cards and calendar).
 */

import * as api from '../api.js';

/** @typedef {'going' | 'maybe'} RsvpStatus */

/**
 * @param {HTMLElement} container
 * @param {RsvpStatus} status
 * @param {boolean} active
 * @param {string} testIdPrefix e.g. btn-rsvp or calendar-rsvp
 * @param {number} eventId
 * @param {boolean} useSmButtons
 * @returns {HTMLButtonElement}
 */
function createRsvpButton(container, status, active, testIdPrefix, eventId, useSmButtons) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = useSmButtons ? 'btn btn-sm' : 'post-action-btn';
  if (active) {
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');
  } else {
    btn.setAttribute('aria-pressed', 'false');
  }
  btn.dataset.rsvpStatus = status;
  btn.dataset.testid = `${testIdPrefix}-${status}-${eventId}`;
  btn.textContent = status === 'going' ? 'Going' : 'Maybe';
  container.appendChild(btn);
  return btn;
}

/**
 * Mount RSVP controls and handle tap-to-clear behavior.
 *
 * @param {HTMLElement} mount
 * @param {{
 *   eventId: number,
 *   myRsvp?: RsvpStatus | null,
 *   cancelled?: boolean,
 *   testIdPrefix?: string,
 *   useSmButtons?: boolean,
 *   onChange?: (myRsvp: RsvpStatus | null) => void,
 * }} options
 */
export function mountEventRsvpControls(mount, options) {
  const {
    eventId,
    myRsvp = null,
    cancelled = false,
    testIdPrefix = 'btn-rsvp',
    useSmButtons = false,
    onChange,
  } = options;

  mount.innerHTML = '';
  if (cancelled) {
    mount.innerHTML = '<span class="post-meta">RSVP closed (event cancelled)</span>';
    return;
  }

  const row = document.createElement('div');
  row.className = useSmButtons ? 'post-actions' : 'post-actions-secondary';
  mount.appendChild(row);

  /** @type {RsvpStatus | null} */
  let current = myRsvp ?? null;

  const render = () => {
    row.innerHTML = '';
    /** @type {RsvpStatus[]} */
    const statuses = ['going', 'maybe'];
    statuses.forEach((status) => {
      const btn = createRsvpButton(row, status, current === status, testIdPrefix, eventId, useSmButtons);
      btn.addEventListener('click', async () => {
        try {
          if (current === status) {
            await api.clearEventRsvp(eventId);
            current = null;
            api.showToast('RSVP cleared');
          } else {
            await api.rsvpEvent(eventId, { status });
            current = status;
            api.showToast(`Marked as ${status}`);
          }
          onChange?.(current);
          render();
        } catch (err) {
          api.showToast(err instanceof Error ? err.message : 'RSVP failed');
        }
      });
    });
  };

  render();
}
