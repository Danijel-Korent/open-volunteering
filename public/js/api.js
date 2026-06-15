const API_BASE = 'api';

/**
 * Make a request to the REST API.
 *
 * @param {string} path API path
 * @param {RequestInit} [options] Fetch options
 * @returns {Promise<unknown>}
 */
async function request(path, options = {}) {
  const url = `${API_BASE}/${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/** Get the currently authenticated user. @returns {Promise<User>} */
export async function getMe() {
  return /** @type {Promise<User>} */ (request('auth/me'));
}

/**
 * Register a new account and start a session.
 *
 * @param {{ email: string, password: string, name: string, type: string }} data
 * @returns {Promise<User>}
 */
export async function register(data) {
  return /** @type {Promise<User>} */ (request('auth/register', { method: 'POST', body: JSON.stringify(data) }));
}

/**
 * Log in and start a session.
 *
 * @param {{ email: string, password: string }} data
 * @returns {Promise<User>}
 */
export async function login(data) {
  return /** @type {Promise<User>} */ (request('auth/login', { method: 'POST', body: JSON.stringify(data) }));
}

/** End the current session. @returns {Promise<unknown>} */
export async function logout() {
  return request('auth/logout', { method: 'POST' });
}

/** List all users. @returns {Promise<User[]>} */
export async function getUsers() {
  return /** @type {Promise<User[]>} */ (request('users'));
}

/** Get a single user by ID. @param {number} id @returns {Promise<User>} */
export async function getUser(id) {
  return /** @type {Promise<User>} */ (request(`users/${id}`));
}

/** Update the authenticated user's own profile. @param {number} id @param {Partial<User>} data @returns {Promise<User>} */
export async function updateUser(id, data) {
  return /** @type {Promise<User>} */ (request(`users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

/** Follow a user. @param {number} id @returns {Promise<unknown>} */
export async function followUser(id) {
  return request(`users/${id}/follow`, { method: 'POST' });
}

/** Unfollow a user. @param {number} id @returns {Promise<unknown>} */
export async function unfollowUser(id) {
  return request(`users/${id}/follow`, { method: 'DELETE' });
}

/**
 * Fetch the global unified feed.
 *
 * @param {Record<string, string|number|boolean>} params
 * @returns {Promise<FeedResponse>}
 */
export async function getFeed(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  return /** @type {Promise<FeedResponse>} */ (request(`feed?${qs}`));
}

/**
 * Fetch a user's profile-scoped feed.
 *
 * @param {number} userId
 * @param {Record<string, string|number>} params
 * @returns {Promise<FeedResponse>}
 */
export async function getUserFeed(userId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  return /** @type {Promise<FeedResponse>} */ (request(`users/${userId}/feed?${qs}`));
}

/** Create a new post. @param {{ content: string }} data @returns {Promise<Post>} */
export async function createPost(data) {
  return /** @type {Promise<Post>} */ (request('posts', { method: 'POST', body: JSON.stringify(data) }));
}

/** Increment like count on a post. @param {number} id @returns {Promise<Post>} */
export async function likePost(id) {
  return /** @type {Promise<Post>} */ (request(`posts/${id}/like`, { method: 'POST' }));
}

/** Increment share count on a post. @param {number} id @returns {Promise<Post>} */
export async function sharePost(id) {
  return /** @type {Promise<Post>} */ (request(`posts/${id}/share`, { method: 'POST' }));
}

/** List all volunteering positions. @returns {Promise<Position[]>} */
export async function getPositions() {
  return /** @type {Promise<Position[]>} */ (request('positions'));
}

/**
 * Create a volunteering position (organizations only).
 *
 * @param {Partial<Position>} data
 * @returns {Promise<Position>}
 */
export async function createPosition(data) {
  return /** @type {Promise<Position>} */ (request('positions', { method: 'POST', body: JSON.stringify(data) }));
}

/** Apply to a position (volunteers only). @param {number} id @returns {Promise<unknown>} */
export async function applyPosition(id) {
  return request(`positions/${id}/apply`, { method: 'POST' });
}

/** Increment like count on a position. @param {number} id @returns {Promise<Position>} */
export async function likePosition(id) {
  return /** @type {Promise<Position>} */ (request(`positions/${id}/like`, { method: 'POST' }));
}

/** List all events. @returns {Promise<VolEvent[]>} */
export async function getEvents() {
  return /** @type {Promise<VolEvent[]>} */ (request('events'));
}

/**
 * Create an event.
 *
 * @param {Partial<VolEvent>} data
 * @returns {Promise<VolEvent>}
 */
export async function createEvent(data) {
  return /** @type {Promise<VolEvent>} */ (request('events', { method: 'POST', body: JSON.stringify(data) }));
}

/** RSVP to an event. @param {number} id @param {{ status: string }} data @returns {Promise<unknown>} */
export async function rsvpEvent(id, data) {
  return request(`events/${id}/rsvp`, { method: 'POST', body: JSON.stringify(data) });
}

/** Increment like count on an event. @param {number} id @returns {Promise<VolEvent>} */
export async function likeEvent(id) {
  return /** @type {Promise<VolEvent>} */ (request(`events/${id}/like`, { method: 'POST' }));
}

/** List comments for a post, position, or event. @param {string} targetType @param {number} targetId @returns {Promise<Comment[]>} */
export async function getComments(targetType, targetId) {
  return /** @type {Promise<Comment[]>} */ (
    request(`comments?targetType=${targetType}&targetId=${targetId}`)
  );
}

/** Add a comment to a post, position, or event. @param {{ targetType: string, targetId: number, content: string }} data @returns {Promise<Comment>} */
export async function createComment(data) {
  return /** @type {Promise<Comment>} */ (request('comments', { method: 'POST', body: JSON.stringify(data) }));
}

/** List projects, optionally filtered by organization. @param {number} [orgId] @returns {Promise<Project[]>} */
export async function getProjects(orgId) {
  const qs = orgId ? `?orgId=${orgId}` : '';
  return /** @type {Promise<Project[]>} */ (request(`projects${qs}`));
}

/**
 * Create a project (organizations only).
 *
 * @param {Partial<Project>} data
 * @returns {Promise<Project>}
 */
export async function createProject(data) {
  return /** @type {Promise<Project>} */ (request('projects', { method: 'POST', body: JSON.stringify(data) }));
}

/** Get a project with its news posts. @param {number} id @returns {Promise<ProjectDetailResponse>} */
export async function getProject(id) {
  return /** @type {Promise<ProjectDetailResponse>} */ (request(`projects/${id}`));
}

/** Add a news post to a project. @param {number} id @param {{ content: string }} data @returns {Promise<unknown>} */
export async function createProjectPost(id, data) {
  return request(`projects/${id}/posts`, { method: 'POST', body: JSON.stringify(data) });
}

/** List the current user's notification subscriptions. @returns {Promise<Subscription[]>} */
export async function getSubscriptions() {
  return /** @type {Promise<Subscription[]>} */ (request('subscriptions'));
}

/**
 * Create a notification subscription.
 *
 * @param {Partial<Subscription>} data
 * @returns {Promise<Subscription>}
 */
export async function createSubscription(data) {
  return /** @type {Promise<Subscription>} */ (request('subscriptions', { method: 'POST', body: JSON.stringify(data) }));
}

/** Delete a subscription by ID. @param {number} id @returns {Promise<unknown>} */
export async function deleteSubscription(id) {
  return request(`subscriptions/${id}`, { method: 'DELETE' });
}

/**
 * List volunteer availability offers.
 *
 * @param {Record<string, string>} [params] Query params: targetType, targetId, or mine=1
 * @returns {Promise<Availability[]>}
 */
export async function getAvailability(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return /** @type {Promise<Availability[]>} */ (request(`availability?${qs}`));
}

/**
 * Set or update volunteer availability for a target (volunteers only).
 *
 * @param {{ targetType: string, targetId: number, skillsOffered: string[] }} data
 * @returns {Promise<Availability>}
 */
export async function setAvailability(data) {
  return /** @type {Promise<Availability>} */ (request('availability', { method: 'POST', body: JSON.stringify(data) }));
}

/** Get map markers for users, positions, and events. @returns {Promise<MapMarker[]>} */
export async function getMapMarkers() {
  return /** @type {Promise<MapMarker[]>} */ (request('map/markers'));
}

/**
 * Show a brief toast message.
 *
 * @param {string} message
 */
export function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}
