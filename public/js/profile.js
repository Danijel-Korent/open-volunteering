import * as api from './api.js';
import { getCurrentUser } from './auth.js';
import { renderPostCard } from './components/post-card.js';

/**
 * Escape HTML special characters in a string.
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
 * Render profile page.
 *
 * @param {HTMLElement} container
 * @param {number} [userId]
 * @param {number} [projectId]
 */
export async function renderProfile(container, userId, projectId) {
  if (projectId && userId) {
    await renderProjectDetail(container, projectId, userId);
    return;
  }

  const current = getCurrentUser();
  const isOwn = !userId || (current && current.id === userId);
  const targetId = userId || current?.id;

  if (!targetId) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please log in to view your profile.</p>
        <a href="#/login" class="btn btn-primary" data-testid="profile-login-link">Login</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const user = await api.getUser(targetId);
    if (isOwn && current) {
      await renderOwnProfile(container, user);
    } else {
      await renderPublicProfile(container, user);
    }
  } catch (err) {
    container.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Profile not found'}</p>`;
  }
}

/**
 * Render the editable profile page for the logged-in user.
 *
 * @param {HTMLElement} container
 * @param {User} user
 */
async function renderOwnProfile(container, user) {
  container.innerHTML = `
    <h1 class="page-title">My Profile</h1>
    <div class="profile-form" data-testid="profile-edit-form">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="profile-name" data-testid="profile-name" value="${escapeHtml(user.name)}">
      </div>
      <div class="form-group">
        <label>Bio</label>
        <textarea id="profile-bio" data-testid="profile-bio">${escapeHtml(user.bio || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Location label</label>
        <input type="text" id="profile-loc-label" data-testid="profile-location-label" value="${escapeHtml(user.location?.label || '')}">
      </div>
      <div class="form-group">
        <label>Latitude</label>
        <input type="number" step="any" id="profile-lat" data-testid="profile-lat" value="${user.location?.lat ?? ''}">
      </div>
      <div class="form-group">
        <label>Longitude</label>
        <input type="number" step="any" id="profile-lng" data-testid="profile-lng" value="${user.location?.lng ?? ''}">
      </div>
      ${user.type === 'volunteer' ? `
      <div class="form-group">
        <label>Skills (comma-separated)</label>
        <input type="text" id="profile-skills" data-testid="profile-skills" value="${escapeHtml((user.skills || []).join(', '))}">
      </div>
      <div class="form-group">
        <label>Experience (one per line)</label>
        <textarea id="profile-experience" data-testid="profile-experience">${escapeHtml((user.experience || []).join('\n'))}</textarea>
      </div>` : ''}
      <button class="btn btn-primary" data-testid="profile-save">Save profile</button>
    </div>
    ${user.type === 'organization' ? renderOrgActions() : renderVolunteerActions()}
    ${user.type === 'volunteer' ? renderSubscriptionsSection() : ''}
    <h2 class="page-title" style="font-size:1rem">Your feed</h2>
    <div id="profile-feed" data-testid="profile-feed"></div>
  `;

  container.querySelector('[data-testid="profile-save"]')?.addEventListener('click', async () => {
    const locLabel = /** @type {HTMLInputElement} */ (document.getElementById('profile-loc-label')).value;
    const lat = parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('profile-lat')).value);
    const lng = parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('profile-lng')).value);
    /** @type {Partial<User>} */
    const data = {
      name: /** @type {HTMLInputElement} */ (document.getElementById('profile-name')).value,
      bio: /** @type {HTMLTextAreaElement} */ (document.getElementById('profile-bio')).value,
      location: locLabel ? { label: locLabel, lat: lat || 0, lng: lng || 0 } : null,
    };
    if (user.type === 'volunteer') {
      data.skills = /** @type {HTMLInputElement} */ (document.getElementById('profile-skills')).value
        .split(',').map((s) => s.trim()).filter(Boolean);
      data.experience = /** @type {HTMLTextAreaElement} */ (document.getElementById('profile-experience')).value
        .split('\n').map((s) => s.trim()).filter(Boolean);
    }
    await api.updateUser(user.id, data);
    api.showToast('Profile saved!');
  });

  if (user.type === 'organization') {
    setupOrgForms(container, user.id);
  } else if (user.type === 'volunteer') {
    setupVolunteerEventForm(container);
    setupSubscriptions(container);
  }

  await loadProfileFeed(user.id);
}

/**
 * HTML for organization action buttons and project list mount points.
 *
 * @returns {string}
 */
function renderOrgActions() {
  return `
    <div class="profile-actions">
      <button class="btn btn-primary" data-testid="btn-open-position-form">Open position</button>
      <button class="btn btn-primary" data-testid="btn-create-event-form">Create event</button>
      <button class="btn btn-primary" data-testid="btn-create-project-form">Create project</button>
    </div>
    <div id="org-form-mount"></div>
    <h3>Projects</h3>
    <div id="projects-list" data-testid="projects-list"></div>
  `;
}

/**
 * HTML for volunteer action buttons (create event).
 *
 * @returns {string}
 */
function renderVolunteerActions() {
  return `
    <div class="profile-actions">
      <button class="btn btn-primary" data-testid="btn-create-event-form">Create event</button>
    </div>
    <div id="org-form-mount"></div>
  `;
}

/**
 * HTML for the notification subscriptions section (volunteers only).
 *
 * @returns {string}
 */
function renderSubscriptionsSection() {
  return `
    <div class="profile-section" data-testid="subscriptions-section">
      <h3>Subscriptions</h3>
      <div id="subscriptions-list"></div>
      <form id="sub-form" style="margin-top:0.75rem">
        <div class="form-group">
          <label>Filter type</label>
          <select id="sub-type" data-testid="subscription-type">
            <option value="category">Category</option>
            <option value="organization">Organization</option>
            <option value="location">Location</option>
          </select>
        </div>
        <div class="form-group">
          <label>Value</label>
          <input type="text" id="sub-value" data-testid="subscription-value" placeholder="e.g. environment or org ID">
        </div>
        <button type="submit" class="btn btn-sm btn-primary" data-testid="subscription-add">Add subscription</button>
      </form>
    </div>
  `;
}

/**
 * Wire up the create-event form for volunteers on their own profile.
 *
 * @param {HTMLElement} container
 */
function setupVolunteerEventForm(container) {
  const mount = container.querySelector('#org-form-mount');
  container.querySelector('[data-testid="btn-create-event-form"]')?.addEventListener('click', () => {
    if (!mount) return;
    mount.innerHTML = `
      <div class="profile-form" data-testid="event-form">
        <h3>Create event</h3>
        <div class="form-group"><label>Title</label><input id="evt-title" data-testid="event-title"></div>
        <div class="form-group"><label>Description</label><textarea id="evt-desc" data-testid="event-description"></textarea></div>
        <div class="form-group"><label>Start date</label><input type="datetime-local" id="evt-start" data-testid="event-start"></div>
        <div class="form-group"><label>Location type</label>
          <select id="evt-loc-type" data-testid="event-location-type">
            <option value="physical">Physical</option>
            <option value="online">Online</option>
          </select>
        </div>
        <button class="btn btn-primary" data-testid="event-submit">Create</button>
      </div>
    `;
    mount.querySelector('[data-testid="event-submit"]')?.addEventListener('click', async () => {
      const start = /** @type {HTMLInputElement} */ (document.getElementById('evt-start')).value;
      await api.createEvent({
        title: /** @type {HTMLInputElement} */ (document.getElementById('evt-title')).value,
        description: /** @type {HTMLTextAreaElement} */ (document.getElementById('evt-desc')).value,
        startDate: new Date(start).toISOString(),
        locationType: /** @type {HTMLSelectElement} */ (document.getElementById('evt-loc-type')).value,
      });
      api.showToast('Event created!');
      mount.innerHTML = '';
    });
  });
}

/**
 * Wire up organization forms: open position, create event, create project.
 *
 * @param {HTMLElement} container
 * @param {number} orgId
 */
async function setupOrgForms(container, orgId) {
  const mount = container.querySelector('#org-form-mount');
  const projectsList = container.querySelector('#projects-list');

  container.querySelector('[data-testid="btn-open-position-form"]')?.addEventListener('click', () => {
    if (!mount) return;
    mount.innerHTML = `
      <div class="profile-form" data-testid="position-form">
        <h3>Open volunteering position</h3>
        <div class="form-group"><label>Title</label><input id="pos-title" data-testid="position-title"></div>
        <div class="form-group"><label>Description</label><textarea id="pos-desc" data-testid="position-description"></textarea></div>
        <div class="form-group"><label>Category</label><input id="pos-cat" data-testid="position-category" value="general"></div>
        <div class="form-group"><label><input type="checkbox" id="pos-remote" data-testid="position-remote"> Remote</label></div>
        <button class="btn btn-primary" data-testid="position-submit">Publish</button>
      </div>
    `;
    mount.querySelector('[data-testid="position-submit"]')?.addEventListener('click', async () => {
      await api.createPosition({
        title: /** @type {HTMLInputElement} */ (document.getElementById('pos-title')).value,
        description: /** @type {HTMLTextAreaElement} */ (document.getElementById('pos-desc')).value,
        category: /** @type {HTMLInputElement} */ (document.getElementById('pos-cat')).value,
        remote: /** @type {HTMLInputElement} */ (document.getElementById('pos-remote')).checked,
      });
      api.showToast('Position published!');
      mount.innerHTML = '';
    });
  });

  container.querySelector('[data-testid="btn-create-event-form"]')?.addEventListener('click', () => {
    if (!mount) return;
    mount.innerHTML = `
      <div class="profile-form" data-testid="event-form">
        <h3>Create event</h3>
        <div class="form-group"><label>Title</label><input id="evt-title" data-testid="event-title"></div>
        <div class="form-group"><label>Description</label><textarea id="evt-desc" data-testid="event-description"></textarea></div>
        <div class="form-group"><label>Start date</label><input type="datetime-local" id="evt-start" data-testid="event-start"></div>
        <div class="form-group"><label>Location type</label>
          <select id="evt-loc-type" data-testid="event-location-type">
            <option value="physical">Physical</option>
            <option value="online">Online</option>
          </select>
        </div>
        <button class="btn btn-primary" data-testid="event-submit">Create</button>
      </div>
    `;
    mount.querySelector('[data-testid="event-submit"]')?.addEventListener('click', async () => {
      const start = /** @type {HTMLInputElement} */ (document.getElementById('evt-start')).value;
      await api.createEvent({
        title: /** @type {HTMLInputElement} */ (document.getElementById('evt-title')).value,
        description: /** @type {HTMLTextAreaElement} */ (document.getElementById('evt-desc')).value,
        startDate: new Date(start).toISOString(),
        locationType: /** @type {HTMLSelectElement} */ (document.getElementById('evt-loc-type')).value,
      });
      api.showToast('Event created!');
      mount.innerHTML = '';
    });
  });

  container.querySelector('[data-testid="btn-create-project-form"]')?.addEventListener('click', () => {
    if (!mount) return;
    mount.innerHTML = `
      <div class="profile-form" data-testid="project-form">
        <h3>Create project</h3>
        <div class="form-group"><label>Title</label><input id="proj-title" data-testid="project-title"></div>
        <div class="form-group"><label>Description</label><textarea id="proj-desc" data-testid="project-description"></textarea></div>
        <button class="btn btn-primary" data-testid="project-submit">Create</button>
      </div>
    `;
    mount.querySelector('[data-testid="project-submit"]')?.addEventListener('click', async () => {
      await api.createProject({
        title: /** @type {HTMLInputElement} */ (document.getElementById('proj-title')).value,
        description: /** @type {HTMLTextAreaElement} */ (document.getElementById('proj-desc')).value,
      });
      api.showToast('Project created!');
      mount.innerHTML = '';
      await loadProjects(projectsList, orgId);
    });
  });

  await loadProjects(projectsList, orgId);
}

/**
 * Fetch and render an organization's project list.
 *
 * @param {Element | null} el
 * @param {number} orgId
 */
async function loadProjects(el, orgId) {
  if (!el) return;
  const projects = await api.getProjects(orgId);
  el.innerHTML = projects.map((p) => `
    <div class="project-card">
      <a href="#/profile/${orgId}/project/${p.id}" data-testid="project-link-${p.id}">${escapeHtml(p.title)}</a>
      <p>${escapeHtml(p.description || '')}</p>
    </div>
  `).join('') || '<p class="post-meta">No projects yet.</p>';
}

/**
 * Wire up subscription list, add form, and delete handlers.
 *
 * @param {HTMLElement} container
 */
async function setupSubscriptions(container) {
  const list = container.querySelector('#subscriptions-list');
  const form = container.querySelector('#sub-form');

  /** Reload and render the subscriptions list. */
  async function refresh() {
    if (!list) return;
    const subs = await api.getSubscriptions();
    list.innerHTML = `<ul class="subscriptions-list">${subs.map((s) => `
      <li data-testid="subscription-${s.id}">
        ${escapeHtml(s.filterType)}: ${escapeHtml(s.value)}
        <button class="btn btn-sm" data-del="${s.id}">Remove</button>
      </li>
    `).join('')}</ul>` || '<p class="post-meta">No subscriptions.</p>';

    list.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api.deleteSubscription(parseInt(/** @type {HTMLElement} */ (btn).dataset.del || '0', 10));
        await refresh();
      });
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await api.createSubscription({
      filterType: /** @type {HTMLSelectElement} */ (document.getElementById('sub-type')).value,
      value: /** @type {HTMLInputElement} */ (document.getElementById('sub-value')).value,
    });
    await refresh();
  });

  await refresh();
}

/**
 * Render a read-only profile page for another user or organization.
 *
 * @param {HTMLElement} container
 * @param {User} user
 */
async function renderPublicProfile(container, user) {
  const current = getCurrentUser();
  container.innerHTML = `
    <div class="profile-header" data-testid="profile-header">
      <h1 class="profile-name">${escapeHtml(user.name)}</h1>
      <div class="profile-type">${user.type}</div>
      <p class="profile-bio">${escapeHtml(user.bio || '')}</p>
      ${user.location?.label ? `<p class="post-meta">📍 ${escapeHtml(user.location.label)}</p>` : ''}
      ${user.type === 'volunteer' && user.skills?.length ? `
        <div class="profile-section"><h3>Skills</h3>
          <div class="tag-list">${user.skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join('')}</div>
        </div>` : ''}
      ${user.type === 'volunteer' && user.experience?.length ? `
        <div class="profile-section"><h3>Experience</h3>
          <ul>${user.experience.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
        </div>` : ''}
      ${current && current.id !== user.id ? `
        <button class="btn btn-primary" data-testid="btn-follow">Follow</button>
      ` : ''}
    </div>
    ${user.type === 'organization' ? '<div id="projects-list"></div>' : ''}
    <h2 class="page-title" style="font-size:1rem">Feed</h2>
    <div id="profile-feed" data-testid="profile-feed"></div>
  `;

  container.querySelector('[data-testid="btn-follow"]')?.addEventListener('click', async () => {
    await api.followUser(user.id);
    api.showToast('Following!');
  });

  if (user.type === 'organization') {
    await loadProjects(container.querySelector('#projects-list'), user.id);
  }

  await loadProfileFeed(user.id);
}

/**
 * Load and render feed items for a user's profile page.
 *
 * @param {number} userId
 */
async function loadProfileFeed(userId) {
  const feed = document.getElementById('profile-feed');
  if (!feed) return;
  const data = await api.getUserFeed(userId, { perPage: 20 });
  feed.innerHTML = '';
  if (data.items.length === 0) {
    feed.innerHTML = '<p class="empty-state">No posts yet.</p>';
  } else {
    data.items.forEach((item) => feed.appendChild(renderPostCard(item, { showApply: true })));
  }
}

/**
 * Render a project detail page with news posts.
 *
 * @param {HTMLElement} container
 * @param {number} projectId
 * @param {number} orgId
 */
async function renderProjectDetail(container, projectId, orgId) {
  container.innerHTML = '<p class="empty-state">Loading…</p>';
  const data = await api.getProject(projectId);
  const project = data.project;
  const posts = data.posts || [];
  const current = getCurrentUser();
  const isOwner = current && current.id === orgId;

  container.innerHTML = `
    <a href="#/profile/${orgId}" class="btn btn-sm">← Back to profile</a>
    <div class="profile-header" data-testid="project-detail">
      <h1 class="profile-name">${escapeHtml(project.title)}</h1>
      <p class="profile-bio">${escapeHtml(project.description || '')}</p>
    </div>
    ${isOwner ? `
      <form class="create-post-bar" data-testid="project-post-form">
        <input type="text" placeholder="Project news…" data-testid="project-post-input" required>
        <button type="submit" class="btn btn-primary btn-sm">Post</button>
      </form>
    ` : ''}
    <h3>News</h3>
    <div id="project-posts-list"></div>
  `;

  const list = container.querySelector('#project-posts-list');
  if (list) {
    list.innerHTML = posts.map((p) => `
      <div class="post-card" data-testid="project-post-${p.id}">
        <p class="post-content">${escapeHtml(p.content)}</p>
        <div class="post-meta">${new Date(p.createdAt).toLocaleDateString()}</div>
      </div>
    `).join('') || '<p class="empty-state">No news posts yet.</p>';
  }

  container.querySelector('[data-testid="project-post-form"]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = /** @type {HTMLInputElement} */ (container.querySelector('[data-testid="project-post-input"]'));
    await api.createProjectPost(projectId, { content: input.value });
    input.value = '';
    await renderProjectDetail(container, projectId, orgId);
  });
}
