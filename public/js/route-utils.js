/**
 * Parse query string parameters from a hash route.
 *
 * @param {string} [hash] Hash string (defaults to current location hash)
 * @returns {Record<string, string>}
 */
export function parseHashQuery(hash = window.location.hash) {
  const qIndex = hash.indexOf('?');
  if (qIndex === -1) {
    return {};
  }
  const params = new URLSearchParams(hash.slice(qIndex + 1));
  /** @type {Record<string, string>} */
  const result = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Apply deep-link effects after a profile or organization page has rendered.
 *
 * Supports `section=applicants|availability` and `highlight=post-{id}`.
 *
 * @returns {Promise<void>}
 */
export async function applyProfileDeepLinks() {
  const query = parseHashQuery();
  const section = query.section;
  if (section === 'applicants') {
    document.querySelector('[data-testid="org-applicants-section"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (section === 'availability') {
    document.querySelector('[data-testid="org-availability-section"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const highlight = query.highlight;
  if (!highlight?.startsWith('post-')) {
    return;
  }
  const postId = highlight.slice(5);
  const card = document.querySelector(
    `[data-testid="post-card-user_post-${postId}"], [data-testid="post-card-org_post-${postId}"]`,
  );
  if (!(card instanceof HTMLElement)) {
    return;
  }
  card.classList.add('post-card--highlighted');
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const { toggleComments } = await import('./components/comment-section.js');
  await toggleComments(card, 'post', parseInt(postId, 10));
}
