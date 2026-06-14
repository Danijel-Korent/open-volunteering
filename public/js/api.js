const API_BASE = 'api';

/**
 * Make a request to the REST API.
 *
 * @param {string} path API path (e.g. 'users', 'positions/1/comments')
 * @param {RequestInit} [options] Fetch options (method, body, headers)
 * @returns {Promise<unknown>} Parsed JSON response (object or array)
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

/**
 * List all users.
 *
 * @returns {Promise<User[]>}
 */
export async function getUsers() {
  const data = await request('users');
  return /** @type {User[]} */ (data);
}

/**
 * Fetch a single user by id.
 *
 * @param {number} id User ID
 * @returns {Promise<User>}
 */
export async function getUser(id) {
  const data = await request(`users/${id}`);
  return /** @type {User} */ (data);
}

/**
 * List all volunteering positions.
 *
 * @returns {Promise<Position[]>}
 */
export async function getPositions() {
  const data = await request('positions');
  return /** @type {Position[]} */ (data);
}

/**
 * Create a new volunteering position.
 *
 * @param {{ title: string, description: string, authorId: number }} data Position data
 * @returns {Promise<Position>}
 */
export async function createPosition(data) {
  const created = await request('positions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return /** @type {Position} */ (created);
}

/**
 * List comments for a position.
 *
 * @param {number} positionId Position ID
 * @returns {Promise<Comment[]>}
 */
export async function getComments(positionId) {
  const data = await request(`positions/${positionId}/comments`);
  return /** @type {Comment[]} */ (data);
}

/**
 * Add a comment to a position.
 *
 * @param {number} positionId Position ID
 * @param {{ content: string, authorId: number }} data Comment data
 * @returns {Promise<Comment>}
 */
export async function createComment(positionId, data) {
  const created = await request(`positions/${positionId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return /** @type {Comment} */ (created);
}
