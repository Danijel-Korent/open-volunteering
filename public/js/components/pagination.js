/**
 * Render pagination links.
 *
 * @param {HTMLElement} container
 * @param {number} page
 * @param {number} totalPages
 * @param {(page: number) => void} onPage
 */
export function renderPagination(container, page, totalPages, onPage) {
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<nav class="pagination" data-testid="pagination">';

  if (page > 1) {
    html += `<a href="#" data-page="${page - 1}" data-testid="pagination-prev">Prev</a>`;
  } else {
    html += '<span class="disabled">Prev</span>';
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === page) {
      html += `<a href="#" class="active" data-page="${i}" data-testid="pagination-page-${i}">${i}</a>`;
    } else if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      html += `<a href="#" data-page="${i}" data-testid="pagination-page-${i}">${i}</a>`;
    } else if (i === page - 2 || i === page + 2) {
      html += '<span>…</span>';
    }
  }

  if (page < totalPages) {
    html += `<a href="#" data-page="${page + 1}" data-testid="pagination-next">Next</a>`;
  } else {
    html += '<span class="disabled">Next</span>';
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
