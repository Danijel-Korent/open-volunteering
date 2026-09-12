import * as api from '../api.js';

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
 * Show a modal to optionally attach a message when applying to a position.
 *
 * @param {string} positionTitle
 * @returns {Promise<string | null>} Trimmed message, or null if cancelled
 */
export function showApplyPositionDialog(positionTitle) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.testid = 'apply-position-dialog';

    overlay.innerHTML = `
      <div class="modal modal--scroll" role="dialog" aria-labelledby="apply-position-title">
        <div class="profile-form">
          <h3 id="apply-position-title">Apply to ${escapeHtml(positionTitle)}</h3>
          <div class="form-group">
            <label for="apply-position-message">Message to the organization (optional)</label>
            <textarea id="apply-position-message" data-testid="apply-position-message" rows="3" maxlength="500" placeholder="Introduce yourself or share availability…"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn" data-testid="apply-position-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" data-testid="apply-position-submit">Submit application</button>
          </div>
        </div>
      </div>
    `;

    const close = (/** @type {string | null} */ result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('[data-testid="apply-position-cancel"]')?.addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    overlay.querySelector('[data-testid="apply-position-submit"]')?.addEventListener('click', () => {
      const messageEl = overlay.querySelector('[data-testid="apply-position-message"]');
      const message = messageEl instanceof HTMLTextAreaElement ? messageEl.value.trim() : '';
      close(message);
    });

    document.body.appendChild(overlay);
    const messageInput = overlay.querySelector('[data-testid="apply-position-message"]');
    if (messageInput instanceof HTMLTextAreaElement) {
      messageInput.focus();
    }
  });
}

/**
 * Apply to a position after optional message dialog.
 *
 * @param {number} positionId
 * @param {string} positionTitle
 * @returns {Promise<void>}
 */
export async function applyToPositionWithDialog(positionId, positionTitle) {
  const message = await showApplyPositionDialog(positionTitle);
  if (message === null) {
    return;
  }
  await api.applyPosition(positionId, message ? { message } : {});
}
