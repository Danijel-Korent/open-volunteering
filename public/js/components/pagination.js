/**
 * Render pagination links.
 *
 * @param {HTMLElement} container
 * @param {number} page
 * @param {number} totalPages
 * @param {(page: number) => void} onPage
 */
export function renderPagination(container, page, totalPages, onPage) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  let html = '<nav class="pagination" data-testid="pagination">';

  if (safePage > 1) {
    html += `<a href="#" data-page="${safePage - 1}" data-testid="pagination-prev">Prev</a>`;
  } else {
    html += '<span class="disabled" data-testid="pagination-prev">Prev</span>';
  }

  if (safeTotalPages > 1) {
    for (let i = 1; i <= safeTotalPages; i++) {
      if (i === safePage) {
        html += `<a href="#" class="active" data-page="${i}" data-testid="pagination-page-${i}">${i}</a>`;
      } else if (i === 1 || i === safeTotalPages || Math.abs(i - safePage) <= 1) {
        html += `<a href="#" data-page="${i}" data-testid="pagination-page-${i}">${i}</a>`;
      } else if (i === safePage - 2 || i === safePage + 2) {
        html += '<span>…</span>';
      }
    }
  }

  if (safePage < safeTotalPages) {
    html += `<a href="#" data-page="${safePage + 1}" data-testid="pagination-next">Next</a>`;
  } else {
    html += '<span class="disabled" data-testid="pagination-next">Next</span>';
  }

  html += '</nav>';
  container.innerHTML = html;

  container.querySelectorAll('a[data-page]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      onPage(parseInt(/** @type {HTMLElement} */ (a).dataset.page || '1', 10));
    });
  });
}
