const API_BASE = 'api';

/**
 * Make a request to the REST API.
 *
 * @param {string} path API path (e.g. 'users', 'positions/1/comments')
 * @param {RequestInit} [options] Fetch options (method, body, headers)
 * @returns {Promise<object>} Parsed JSON response
 * @throws {Error} On HTTP error or invalid JSON
 */
async function request(path, options = {}) {
  const url = `${API_BASE}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/** @returns {Promise<Array>} List of all users */
export async function getUsers() {
  return request('users');
}

/** @param {number} id User ID @returns {Promise<object>} User object */
export async function getUser(id) {
  return request(`users/${id}`);
}

/** @returns {Promise<Array>} List of all volunteering positions */
export async function getPositions() {
  return request('positions');
}

/**
 * Create a new volunteering position.
 *
 * @param {{ title: string, description: string, authorId: number }} data Position data
 * @returns {Promise<object>} Created position
 */
export async function createPosition(data) {
  return request('positions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** @param {number} positionId Position ID @returns {Promise<Array>} List of comments */
export async function getComments(positionId) {
  return request(`positions/${positionId}/comments`);
}

/**
 * Add a comment to a position.
 *
 * @param {number} positionId Position ID
 * @param {{ content: string, authorId: number }} data Comment data
 * @returns {Promise<object>} Created comment
 */
export async function createComment(positionId, data) {
  return request(`positions/${positionId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
