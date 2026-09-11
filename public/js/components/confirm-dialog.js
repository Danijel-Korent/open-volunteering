/**
 * Reusable confirmation modal (mobile-first).
 */

/**
 * Show a confirmation dialog and resolve when the user confirms or cancels.
 *
 * @param {object} [options]
 * @param {string} [options.title]
 * @param {string} [options.message]
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {string} [options.testId] data-testid on the overlay (default confirm-delete-dialog)
 * @returns {Promise<boolean>} True if the user confirmed
 */
export function showConfirmDialog(options = {}) {
  const {
    title = 'Delete this item?',
    message = "This can't be undone.",
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    testId = 'confirm-delete-dialog',
  } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.testid = testId;
    overlay.innerHTML = `
      <div class="modal" role="alertdialog" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message">
        <h3 id="confirm-dialog-title">${escapeHtml(title)}</h3>
        <p id="confirm-dialog-message" class="confirm-dialog-message">${escapeHtml(message)}</p>
        <div class="confirm-dialog-actions">
          <button type="button" class="btn btn-danger" data-testid="confirm-delete-submit">${escapeHtml(confirmLabel)}</button>
          <button type="button" class="btn" data-testid="confirm-delete-cancel">${escapeHtml(cancelLabel)}</button>
        </div>
      </div>
    `;

    const close = (confirmed) => {
      overlay.remove();
      resolve(confirmed);
    };

    document.body.appendChild(overlay);

    overlay.querySelector('[data-testid="confirm-delete-cancel"]')?.addEventListener('click', () => close(false));
    overlay.querySelector('[data-testid="confirm-delete-submit"]')?.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
  });
}

/**
 * Escape HTML for safe insertion into modal markup.
 *
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
