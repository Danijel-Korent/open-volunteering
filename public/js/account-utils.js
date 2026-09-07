/**
 * Shared helpers for user and organization account references.
 */

/**
 * Hash route for a user or organization profile.
 *
 * @param {{ type: AccountType, id: number } | null | undefined} account
 * @returns {string}
 */
export function profileLink(account) {
  if (!account) return '#';
  const type = /** @type {string} */ (account.type) === 'volunteer' ? 'user' : account.type;
  return type === 'organization'
    ? `#/organization/${account.id}`
    : `#/profile/${account.id}`;
}

/**
 * HTML for a profile type badge chip.
 *
 * @param {AccountType | 'volunteer'} type
 * @returns {string}
 */
export function renderProfileBadge(type) {
  const normalized = type === 'volunteer' ? 'user' : type;
  const label = normalized === 'organization' ? 'Organization' : 'User';
  return `<span class="profile-badge profile-badge--${normalized}">${label}</span>`;
}

/**
 * Whether two accounts refer to the same profile.
 *
 * @param {{ type: AccountType | 'volunteer', id: number } | null | undefined} a
 * @param {{ type: AccountType | 'volunteer', id: number } | null | undefined} b
 * @returns {boolean}
 */
export function isSameAccount(a, b) {
  if (!a || !b) return false;
  const typeA = a.type === 'volunteer' ? 'user' : a.type;
  const typeB = b.type === 'volunteer' ? 'user' : b.type;
  return typeA === typeB && a.id === b.id;
}

/**
 * Normalize legacy volunteer type to user.
 *
 * @param {AccountType | 'volunteer'} type
 * @returns {AccountType}
 */
export function normalizeAccountType(type) {
  return type === 'volunteer' ? 'user' : type;
}
