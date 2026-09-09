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

/** Get the currently authenticated session context. @returns {Promise<MeResponse>} */
export async function getMe() {
  return /** @type {Promise<MeResponse>} */ (request('auth/me'));
}

/**
 * Switch active account context (user profile or organization admin).
 *
 * @param {{ activeAccountType: AccountType, activeAccountId?: number }} data
 * @returns {Promise<MeResponse>}
 */
export async function switchAccount(data) {
  return /** @type {Promise<MeResponse>} */ (request('auth/switch', { method: 'POST', body: JSON.stringify(data) }));
}

/**
 * Register a new user account and start a session.
 *
 * @param {{ name: string }} data
 * @returns {Promise<RegisterResponse>}
 */
export async function register(data) {
  return /** @type {Promise<RegisterResponse>} */ (request('auth/register', { method: 'POST', body: JSON.stringify(data) }));
}

/**
 * Log in and start a session.
 *
 * @param {{ name: string, password: string }} data
 * @returns {Promise<MeResponse>}
 */
export async function login(data) {
  return /** @type {Promise<MeResponse>} */ (request('auth/login', { method: 'POST', body: JSON.stringify(data) }));
}

/** End the current session. @returns {Promise<unknown>} */
export async function logout() {
  return request('auth/logout', { method: 'POST' });
}

/** List all users. @returns {Promise<User[]>} */
export async function getUsers() {
  return /** @type {Promise<User[]>} */ (request('users'));
}

/** List all organizations. @returns {Promise<Organization[]>} */
export async function getOrganizations() {
  return /** @type {Promise<Organization[]>} */ (request('organizations'));
}

/** Get a single user by ID. @param {number} id @returns {Promise<User>} */
export async function getUser(id) {
  return /** @type {Promise<User>} */ (request(`users/${id}`));
}

/** Get a single organization by ID. @param {number} id @returns {Promise<Organization>} */
export async function getOrganization(id) {
  return /** @type {Promise<Organization>} */ (request(`organizations/${id}`));
}

/** Update the authenticated user's own profile. @param {number} id @param {Partial<User>} data @returns {Promise<User>} */
export async function updateUser(id, data) {
  return /** @type {Promise<User>} */ (request(`users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

/** Update the authenticated organization's profile (admin context). @param {number} id @param {Partial<Organization>} data @returns {Promise<Organization>} */
export async function updateOrganization(id, data) {
  return /** @type {Promise<Organization>} */ (request(`organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

/** Create a new organization; caller becomes admin. @param {{ name: string, bio?: string, location?: GeoLocation | null }} data @returns {Promise<Organization>} */
export async function createOrganization(data) {
  return /** @type {Promise<Organization>} */ (request('organizations', { method: 'POST', body: JSON.stringify(data) }));
}

/** List org memberships for the logged-in user. @returns {Promise<Membership[]>} */
export async function getMyMemberships() {
  return /** @type {Promise<Membership[]>} */ (request('users/me/memberships'));
}

/**
 * Add a member or admin to an organization.
 *
 * @param {number} orgId
 * @param {{ userId: number, role: 'admin' | 'member' }} data
 */
export async function addOrganizationMember(orgId, data) {
  return request(`organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify(data) });
}

/**
 * Change a member's role.
 *
 * @param {number} orgId
 * @param {number} userId
 * @param {{ role: 'admin' | 'member' }} data
 */
export async function updateOrganizationMember(orgId, userId, data) {
  return request(`organizations/${orgId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

/**
 * Remove a member or leave an organization.
 *
 * @param {number} orgId
 * @param {number} userId
 */
export async function removeOrganizationMember(orgId, userId) {
  return request(`organizations/${orgId}/members/${userId}`, { method: 'DELETE' });
}

/** Follow a volunteer. @param {number} id @returns {Promise<unknown>} */
export async function followUser(id) {
  return request(`users/${id}/follow`, { method: 'POST' });
}

/** Unfollow a volunteer. @param {number} id @returns {Promise<unknown>} */
export async function unfollowUser(id) {
  return request(`users/${id}/follow`, { method: 'DELETE' });
}

/** Follow an organization. @param {number} id @returns {Promise<unknown>} */
export async function followOrganization(id) {
  return request(`organizations/${id}/follow`, { method: 'POST' });
}

/** Unfollow an organization. @param {number} id @returns {Promise<unknown>} */
export async function unfollowOrganization(id) {
  return request(`organizations/${id}/follow`, { method: 'DELETE' });
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

/**
 * Fetch an organization's profile-scoped feed.
 *
 * @param {number} orgId
 * @param {Record<string, string|number>} params
 * @returns {Promise<FeedResponse>}
 */
export async function getOrganizationFeed(orgId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  return /** @type {Promise<FeedResponse>} */ (request(`organizations/${orgId}/feed?${qs}`));
}

/** Create a new post. @param {{ content: string, imageFileId?: number }} data @returns {Promise<Post>} */
export async function createPost(data) {
  return /** @type {Promise<Post>} */ (request('posts', { method: 'POST', body: JSON.stringify(data) }));
}

/**
 * Build URL for file binary content (for img src).
 *
 * @param {number} id
 * @returns {string}
 */
export function fileContentUrl(id) {
  return `${API_BASE}/files/${id}/content`;
}

/**
 * Upload an image file; returns catalog metadata with id and url.
 *
 * @param {File} file
 * @returns {Promise<StoredFile>}
 */
export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/files`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return /** @type {StoredFile} */ (data);
}

/** Delete an uploaded file by id. @param {number} id @returns {Promise<unknown>} */
export async function deleteFile(id) {
  return request(`files/${id}`, { method: 'DELETE' });
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
 * List in-app notifications for the current user.
 *
 * @param {{ limit?: number }} [params]
 * @returns {Promise<NotificationsResponse>}
 */
export async function getNotifications(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const suffix = qs ? `?${qs}` : '';
  return /** @type {Promise<NotificationsResponse>} */ (request(`notifications${suffix}`));
}

/** Get unread notification count for the header badge. @returns {Promise<{ totalUnread: number }>} */
export async function getNotificationsUnreadCount() {
  return /** @type {Promise<{ totalUnread: number }>} */ (request('notifications/unread-count'));
}

/** Mark a single notification as read. @param {number} id @returns {Promise<{ ok: boolean }>} */
export async function markNotificationRead(id) {
  return /** @type {Promise<{ ok: boolean }>} */ (request(`notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  }));
}

/** Mark all notifications as read for the current user. @returns {Promise<{ ok: boolean }>} */
export async function markAllNotificationsRead() {
  return /** @type {Promise<{ ok: boolean }>} */ (request('notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({}),
  }));
}

/**
 * List conversations for the current user (inbox).
 *
 * @param {{ page?: number, perPage?: number }} [params]
 * @returns {Promise<ConversationInboxResponse>}
 */
export async function getConversations(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return /** @type {Promise<ConversationInboxResponse>} */ (request(`conversations?${qs}`));
}

/**
 * Create or get a conversation.
 *
 * @param {{ type: 'direct' | 'group', participants: AccountRef[], title?: string }} data
 * @returns {Promise<Conversation>}
 */
export async function createConversation(data) {
  return /** @type {Promise<Conversation>} */ (request('conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  }));
}

/** Get a single conversation by ID. @param {number} id @returns {Promise<Conversation>} */
export async function getConversation(id) {
  return /** @type {Promise<Conversation>} */ (request(`conversations/${id}`));
}

/**
 * List messages in a conversation.
 *
 * @param {number} conversationId
 * @param {{ page?: number, perPage?: number }} [params]
 * @returns {Promise<MessagesResponse>}
 */
export async function getMessages(conversationId, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return /** @type {Promise<MessagesResponse>} */ (request(`conversations/${conversationId}/messages?${qs}`));
}

/**
 * Send a message in a conversation.
 *
 * @param {number} conversationId
 * @param {string} content
 * @returns {Promise<Message>}
 */
export async function sendMessage(conversationId, content) {
  return /** @type {Promise<Message>} */ (request(`conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  }));
}

/** Mark a conversation as read. @param {number} conversationId @returns {Promise<{ lastReadAt: string | null }>} */
export async function markConversationRead(conversationId) {
  return /** @type {Promise<{ lastReadAt: string | null }>} */ (request(`conversations/${conversationId}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  }));
}

/**
 * List applications for a position (organization owner only).
 *
 * @param {number} positionId
 * @returns {Promise<Application[]>}
 */
export async function getPositionApplications(positionId) {
  return /** @type {Promise<Application[]>} */ (request(`positions/${positionId}/applications`));
}

/**
 * List inbound skill offers for an organization.
 *
 * @param {number} orgId
 * @returns {Promise<Availability[]>}
 */
export async function getInboundAvailability(orgId) {
  return /** @type {Promise<Availability[]>} */ (request(`availability?forOrgId=${orgId}`));
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
