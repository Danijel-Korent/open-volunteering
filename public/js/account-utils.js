/**
 * Shared helpers for user and organization account references.
 */

import { renderOrganizationClassificationBadge } from './organization-types.js';

/**
 * @param {{ accountType?: AccountType, type?: string } | null | undefined} account
 * @returns {AccountType}
 */
export function getAccountType(account) {
  if (!account) return 'user';
  if (account.accountType) {
    return normalizeAccountType(account.accountType);
  }
  const legacy = account.type;
  if (legacy === 'volunteer' || legacy === 'user') return 'user';
  if (legacy === 'organization') return 'organization';
  return 'user';
}

/**
 * Hash route for a user or organization profile.
 *
 * @param {{ accountType?: AccountType, type?: string, id: number } | null | undefined} account
 * @returns {string}
 */
export function profileLink(account) {
  if (!account) return '#';
  const accountType = getAccountType(account);
  return accountType === 'organization'
    ? `#/organization/${account.id}`
    : `#/profile/${account.id}`;
}

/**
 * HTML for a profile type badge chip (user or organization classification).
 *
 * @param {Account | AccountType | 'volunteer'} accountOrType
 * @returns {string}
 */
export function renderProfileBadge(accountOrType) {
  if (typeof accountOrType === 'string') {
    const normalized = accountOrType === 'volunteer' ? 'user' : accountOrType;
    if (normalized === 'organization') {
      return `<span class="profile-badge profile-badge--organization" data-testid="org-classification-badge">Organization</span>`;
    }
    return `<span class="profile-badge profile-badge--user">User</span>`;
  }
  const accountType = getAccountType(accountOrType);
  if (accountType === 'organization') {
    const classification = /** @type {Organization} */ (accountOrType).type;
    if (classification) {
      return renderOrganizationClassificationBadge(classification);
    }
    return `<span class="profile-badge profile-badge--organization" data-testid="org-classification-badge">Organization</span>`;
  }
  return `<span class="profile-badge profile-badge--user">User</span>`;
}

/**
 * Whether two accounts refer to the same profile.
 *
 * @param {{ accountType?: AccountType, type?: string, id: number } | null | undefined} a
 * @param {{ accountType?: AccountType, type?: string, id: number } | null | undefined} b
 * @returns {boolean}
 */
export function isSameAccount(a, b) {
  if (!a || !b) return false;
  return getAccountType(a) === getAccountType(b) && a.id === b.id;
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
