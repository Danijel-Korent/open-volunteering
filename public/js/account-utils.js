/**
 * Shared helpers for volunteer and organization account references.
 */

/**
 * Hash route for a volunteer or organization profile.
 *
 * @param {{ type: AccountType, id: number } | null | undefined} account
 * @returns {string}
 */
export function profileLink(account) {
  if (!account) return '#';
  return account.type === 'organization'
    ? `#/organization/${account.id}`
    : `#/profile/${account.id}`;
}

/**
 * HTML for a profile type badge chip.
 *
 * @param {AccountType} type
 * @returns {string}
 */
export function renderProfileBadge(type) {
  const label = type === 'organization' ? 'Organization' : 'Volunteer';
  return `<span class="profile-badge profile-badge--${type}">${label}</span>`;
}

/**
 * Whether two accounts refer to the same profile.
 *
 * @param {{ type: AccountType, id: number } | null | undefined} a
 * @param {{ type: AccountType, id: number } | null | undefined} b
 * @returns {boolean}
 */
export function isSameAccount(a, b) {
  if (!a || !b) return false;
  return a.type === b.type && a.id === b.id;
}
