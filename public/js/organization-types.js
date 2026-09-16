/**
 * Organization classification types (stored as `type` in organizations.json).
 */

// TODO DKO: This should be in the backend, but ok for exploratory prototype. Who know how many times it will change?
/** @type {readonly OrganizationClassification[]} */
export const ORGANIZATION_CLASSIFICATION_TYPES = [
  'NGO',
  'Non-profit',
  'Charity',
  'Informal organization',
  'Informal movement',
];

/**
 * Escape HTML for badge labels.
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
 * HTML chip for an organization classification label.
 *
 * @param {OrganizationClassification} classification
 * @returns {string}
 */
export function renderOrganizationClassificationBadge(classification) {
  return `<span class="profile-badge profile-badge--organization org-classification-badge" data-testid="org-classification-badge">${escapeHtml(classification)}</span>`;
}

/**
 * Build `<option>` elements for organization type selects.
 *
 * @param {OrganizationClassification | ''} [selected]
 * @returns {string}
 */
export function organizationTypeSelectOptions(selected = '') {
  const placeholder = selected
    ? ''
    : '<option value="" disabled selected hidden>Select type…</option>';
  const options = ORGANIZATION_CLASSIFICATION_TYPES.map((t) => {
    const sel = t === selected ? ' selected' : '';
    return `<option value="${escapeHtml(t)}"${sel}>${escapeHtml(t)}</option>`;
  });
  return placeholder + options.join('');
}
