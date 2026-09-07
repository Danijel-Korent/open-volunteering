import * as api from './api.js';
import { getCurrentUser, loadCurrentUser, getSessionUserId, showCreateOrganizationModal, switchToAccount } from './auth.js';
import { isSameAccount, profileLink, renderProfileBadge } from './account-utils.js';
import { renderAvatarHtml, setupImageDropzone } from './components/image-dropzone.js';
import { renderPostCard } from './components/post-card.js';
import { startDirectMessage } from './messages.js';

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
  const current = getCurrentUser();
  if (!userId && current?.type === 'organization') {
    window.location.hash = `#/organization/${current.id}`;
    return;
  }

  const sessionUserId = getSessionUserId();
  const isOwn = !userId || (sessionUserId !== null && sessionUserId === userId);
  const targetId = userId || sessionUserId || undefined;

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
      await renderOwnVolunteerProfile(container, user);
    } else {
      await renderPublicVolunteerProfile(container, user);
    }
  } catch (err) {
    container.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Profile not found'}</p>`;
  }
}

/**
 * Render organization profile page.
 *
 * @param {HTMLElement} container
 * @param {number} [orgId]
 * @param {number} [projectId]
 */
export async function renderOrganization(container, orgId, projectId) {
  const current = getCurrentUser();
  if (!orgId && current?.activeAccountType === 'user') {
    window.location.hash = `#/profile/${current.userId}`;
    return;
  }

  if (projectId && orgId) {
    await renderProjectDetail(container, projectId, orgId, 'organization');
    return;
  }

  const targetId = orgId || (current?.activeAccountType === 'organization' ? current.activeAccountId : undefined);
  const isOwnAdmin = current?.activeAccountType === 'organization'
    && targetId !== undefined
    && current.activeAccountId === targetId
    && current.organizationRole === 'admin';

  if (!targetId) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Please log in to view your organization profile.</p>
        <a href="#/login" class="btn btn-primary" data-testid="profile-login-link">Login</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const org = await api.getOrganization(targetId);
    if (isOwnAdmin && current) {
      await renderOwnOrganizationProfile(container, org);
    } else {
      await renderPublicOrganizationProfile(container, org);
    }
  } catch (err) {
    container.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Organization not found'}</p>`;
  }
}

/**
 * Render the editable profile page for the logged-in user.
 *
 * @param {HTMLElement} container
 * @param {User} user
 */
async function renderOwnVolunteerProfile(container, user) {
  container.innerHTML = `
    <h1 class="page-title">My Profile</h1>
    <div class="profile-avatar-section" data-testid="profile-avatar-section">
      <div id="profile-avatar-display" data-testid="profile-avatar-display">
        ${renderAvatarHtml(user, 'profile-avatar')}
      </div>
      <div id="profile-avatar-dropzone-mount"></div>
    </div>
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
      <div class="form-group">
        <label>Skills (comma-separated)</label>
        <input type="text" id="profile-skills" data-testid="profile-skills" value="${escapeHtml((user.skills || []).join(', '))}">
      </div>
      <div class="form-group">
        <label>Experience (one per line)</label>
        <textarea id="profile-experience" data-testid="profile-experience">${escapeHtml((user.experience || []).join('\n'))}</textarea>
      </div>
      <div class="form-group profile-volunteering-prefs">
        <label class="checkbox-label">
          <input type="checkbox" id="profile-seeking-volunteering" data-testid="profile-seeking-volunteering" ${user.seekingVolunteering ? 'checked' : ''}>
          Looking for volunteering positions
        </label>
      </div>
      <div class="form-group" id="profile-hours-wrap">
        <label>Hours per week available</label>
        <input type="number" min="0" step="1" id="profile-weekly-volunteering-hours" data-testid="profile-weekly-volunteering-hours" value="${user.weeklyVolunteeringHours ?? 0}">
      </div>
      <button class="btn btn-primary" data-testid="profile-save">Save profile</button>
    </div>
    <div class="profile-section" data-testid="user-memberships-section">
      <h3>Your organizations</h3>
      <div id="user-memberships-list"></div>
      <button type="button" class="btn btn-primary" data-testid="btn-create-organization" style="margin-top:0.75rem">Create organization</button>
    </div>
    ${renderVolunteerActions()}
    ${renderSubscriptionsSection()}
    <h2 class="page-title" style="font-size:1rem">Your feed</h2>
    <div id="profile-feed" data-testid="profile-feed"></div>
  `;

  /** @type {number | undefined} */
  let savedAvatarFileId = user.avatarFileId;
  const avatarDisplay = /** @type {HTMLElement} */ (container.querySelector('#profile-avatar-display'));
  const avatarDropzoneMount = /** @type {HTMLElement} */ (container.querySelector('#profile-avatar-dropzone-mount'));

  const dropzone = setupImageDropzone(avatarDropzoneMount, {
    dropzoneTestId: 'profile-avatar-dropzone',
    fileInputTestId: 'profile-avatar-file-input',
    previewTestId: 'profile-avatar-preview',
    label: 'Change profile photo — drop or tap',
    onChange: ({ fileId, uploading }) => {
      if (uploading || !fileId || fileId === savedAvatarFileId) return;
      void (async () => {
        try {
          const updated = await api.updateUser(user.id, { avatarFileId: fileId });
          savedAvatarFileId = updated.avatarFileId;
          await loadCurrentUser();
          avatarDisplay.innerHTML = renderAvatarHtml(updated, 'profile-avatar');
          dropzone.release();
          api.showToast('Profile photo updated!');
        } catch (err) {
          api.showToast(err instanceof Error ? err.message : 'Failed to update photo');
        }
      })();
    },
  });

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
    data.skills = /** @type {HTMLInputElement} */ (document.getElementById('profile-skills')).value
      .split(',').map((s) => s.trim()).filter(Boolean);
    data.experience = /** @type {HTMLTextAreaElement} */ (document.getElementById('profile-experience')).value
      .split('\n').map((s) => s.trim()).filter(Boolean);
    data.seekingVolunteering = /** @type {HTMLInputElement} */ (document.getElementById('profile-seeking-volunteering')).checked;
    data.weeklyVolunteeringHours = parseInt(/** @type {HTMLInputElement} */ (document.getElementById('profile-weekly-volunteering-hours')).value, 10) || 0;
    await api.updateUser(user.id, data);
    api.showToast('Profile saved!');
  });

  setupVolunteerEventForm(container);
  setupSubscriptions(container);
  await setupUserMembershipsSection(container, user.id);
  container.querySelector('[data-testid="btn-create-organization"]')?.addEventListener('click', () => {
    void showCreateOrganizationModal();
  });
  await loadProfileFeed('user', user.id);
}

/**
 * Render the editable profile page for the logged-in organization.
 *
 * @param {HTMLElement} container
 * @param {Organization} org
 */
async function renderOwnOrganizationProfile(container, org) {
  container.innerHTML = `
    <h1 class="page-title">My Organization</h1>
    <div class="profile-avatar-section" data-testid="profile-avatar-section">
      <div id="profile-avatar-display" data-testid="profile-avatar-display">
        ${renderAvatarHtml(org, 'profile-avatar')}
      </div>
      <div id="profile-avatar-dropzone-mount"></div>
    </div>
    <div class="profile-form" data-testid="profile-edit-form">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="profile-name" data-testid="profile-name" value="${escapeHtml(org.name)}">
      </div>
      <div class="form-group">
        <label>Bio</label>
        <textarea id="profile-bio" data-testid="profile-bio">${escapeHtml(org.bio || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Location label</label>
        <input type="text" id="profile-loc-label" data-testid="profile-location-label" value="${escapeHtml(org.location?.label || '')}">
      </div>
      <div class="form-group">
        <label>Latitude</label>
        <input type="number" step="any" id="profile-lat" data-testid="profile-lat" value="${org.location?.lat ?? ''}">
      </div>
      <div class="form-group">
        <label>Longitude</label>
        <input type="number" step="any" id="profile-lng" data-testid="profile-lng" value="${org.location?.lng ?? ''}">
      </div>
      <button class="btn btn-primary" data-testid="profile-save">Save profile</button>
    </div>
    ${renderOrgActions()}
    <div class="profile-section" data-testid="org-members-admin-section">
      <h3>Members</h3>
      <div id="org-members-admin-list"></div>
      <div class="form-group" style="margin-top:0.75rem">
        <label>Add member (search by name)</label>
        <input type="text" id="org-member-search" data-testid="org-member-search" placeholder="Type a name…">
        <div id="org-member-search-results" class="message-picker-list"></div>
      </div>
    </div>
    <div class="profile-section" data-testid="org-applicants-section">
      <h3>Position applicants</h3>
      <div id="org-applicants-list"><p class="empty-state">Loading…</p></div>
    </div>
    <div class="profile-section" data-testid="org-availability-section">
      <h3>Skill offers</h3>
      <div id="org-availability-list"><p class="empty-state">Loading…</p></div>
    </div>
    <h2 class="page-title" style="font-size:1rem">Your feed</h2>
    <div id="profile-feed" data-testid="profile-feed"></div>
  `;

  /** @type {number | undefined} */
  let savedAvatarFileId = org.avatarFileId;
  const avatarDisplay = /** @type {HTMLElement} */ (container.querySelector('#profile-avatar-display'));
  const avatarDropzoneMount = /** @type {HTMLElement} */ (container.querySelector('#profile-avatar-dropzone-mount'));

  const dropzone = setupImageDropzone(avatarDropzoneMount, {
    dropzoneTestId: 'profile-avatar-dropzone',
    fileInputTestId: 'profile-avatar-file-input',
    previewTestId: 'profile-avatar-preview',
    label: 'Change profile photo — drop or tap',
    onChange: ({ fileId, uploading }) => {
      if (uploading || !fileId || fileId === savedAvatarFileId) return;
      void (async () => {
        try {
          const updated = await api.updateOrganization(org.id, { avatarFileId: fileId });
          savedAvatarFileId = updated.avatarFileId;
          await loadCurrentUser();
          avatarDisplay.innerHTML = renderAvatarHtml(updated, 'profile-avatar');
          dropzone.release();
          api.showToast('Profile photo updated!');
        } catch (err) {
          api.showToast(err instanceof Error ? err.message : 'Failed to update photo');
        }
      })();
    },
  });

  container.querySelector('[data-testid="profile-save"]')?.addEventListener('click', async () => {
    const locLabel = /** @type {HTMLInputElement} */ (document.getElementById('profile-loc-label')).value;
    const lat = parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('profile-lat')).value);
    const lng = parseFloat(/** @type {HTMLInputElement} */ (document.getElementById('profile-lng')).value);
    await api.updateOrganization(org.id, {
      name: /** @type {HTMLInputElement} */ (document.getElementById('profile-name')).value,
      bio: /** @type {HTMLTextAreaElement} */ (document.getElementById('profile-bio')).value,
      location: locLabel ? { label: locLabel, lat: lat || 0, lng: lng || 0 } : null,
    });
    api.showToast('Profile saved!');
  });

  setupOrgForms(container, org.id);
  await setupOrgMemberManagement(container, org);
  await loadOrgMessagingSections(container, org.id);
  await loadProfileFeed('organization', org.id);
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
        locationType: /** @type {'physical' | 'online'} */ (/** @type {HTMLSelectElement} */ (document.getElementById('evt-loc-type')).value),
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
        locationType: /** @type {'physical' | 'online'} */ (/** @type {HTMLSelectElement} */ (document.getElementById('evt-loc-type')).value),
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
      <a href="#/organization/${orgId}/project/${p.id}" data-testid="project-link-${p.id}">${escapeHtml(p.title)}</a>
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
      filterType: /** @type {'category' | 'organization' | 'location'} */ (/** @type {HTMLSelectElement} */ (document.getElementById('sub-type')).value),
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
async function renderPublicVolunteerProfile(container, user) {
  const current = getCurrentUser();
  container.innerHTML = `
    <div class="profile-header" data-testid="profile-header">
      <div class="profile-header-top">
        ${renderAvatarHtml(user, 'profile-avatar')}
        <div>
          <h1 class="profile-name">${escapeHtml(user.name)}</h1>
          ${renderProfileBadge('user')}
        </div>
      </div>
      <p class="profile-bio">${escapeHtml(user.bio || '')}</p>
      ${user.location?.label ? `<p class="post-meta">📍 ${escapeHtml(user.location.label)}</p>` : ''}
      ${user.seekingVolunteering ? `<p class="post-meta">🕐 Available ${user.weeklyVolunteeringHours ?? 0}h/week for volunteering</p>` : ''}
      ${user.skills?.length ? `
        <div class="profile-section"><h3>Skills</h3>
          <div class="tag-list">${user.skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join('')}</div>
        </div>` : ''}
      ${user.experience?.length ? `
        <div class="profile-section"><h3>Experience</h3>
          <ul>${user.experience.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
        </div>` : ''}
      ${current && !isSameAccount(current, user) ? `
        <div class="profile-actions">
          <button class="btn btn-primary" data-testid="btn-follow">Follow</button>
          <button class="btn btn-primary" data-testid="btn-message-user-${user.id}">Message</button>
        </div>
      ` : ''}
    </div>
    <h2 class="page-title" style="font-size:1rem">Feed</h2>
    <div id="profile-feed" data-testid="profile-feed"></div>
  `;

  container.querySelector('[data-testid="btn-follow"]')?.addEventListener('click', async () => {
    await api.followUser(user.id);
    api.showToast('Following!');
  });

  container.querySelector(`[data-testid="btn-message-user-${user.id}"]`)?.addEventListener('click', async () => {
    try {
      await startDirectMessage('user', user.id);
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to start conversation');
    }
  });

  await loadProfileFeed('user', user.id);
}

/**
 * Render HTML for organization members list (public).
 *
 * @param {Organization} org
 * @returns {string}
 */
function renderOrgMembersHtml(org) {
  const members = org.members ?? [];
  if (members.length === 0) return '';
  const rows = members.map((m) => {
    const name = m.user?.name ?? `User ${m.userId}`;
    const roleLabel = m.role === 'admin' ? 'Admin' : 'Member';
    return `<li class="org-member-row" data-testid="org-member-${m.userId}">
      <a href="#/profile/${m.userId}">${escapeHtml(name)}</a>
      <span class="role-chip role-chip--${m.role}">${roleLabel}</span>
    </li>`;
  }).join('');
  return `
    <div class="profile-section" data-testid="org-members-section">
      <h3>Members</h3>
      <ul class="org-members-list">${rows}</ul>
    </div>
  `;
}

/**
 * Wire up memberships list on the user's own profile.
 *
 * @param {HTMLElement} container
 * @param {number} userId
 */
async function setupUserMembershipsSection(container, userId) {
  const listEl = container.querySelector('#user-memberships-list');
  if (!listEl) return;
  const memberships = await api.getMyMemberships();
  if (memberships.length === 0) {
    listEl.innerHTML = '<p class="post-meta">You are not a member of any organization yet.</p>';
    return;
  }
  listEl.innerHTML = `<ul class="org-memberships-list">${memberships.map((m) => {
    const isAdmin = m.role === 'admin';
    return `<li data-testid="membership-${m.organizationId}">
      <a href="#/organization/${m.organizationId}">${escapeHtml(m.organizationName)}</a>
      <span class="role-chip role-chip--${m.role}">${isAdmin ? 'Admin' : 'Member'}</span>
      ${isAdmin ? `<button type="button" class="btn btn-sm" data-switch-org="${m.organizationId}">Switch</button>` : ''}
      ${!isAdmin ? `<button type="button" class="btn btn-sm" data-leave-org="${m.organizationId}">Leave</button>` : ''}
    </li>`;
  }).join('')}</ul>`;

  listEl.querySelectorAll('[data-switch-org]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orgId = parseInt(btn.getAttribute('data-switch-org') || '0', 10);
      try {
        await switchToAccount('organization', orgId);
      } catch (err) {
        api.showToast(err instanceof Error ? err.message : 'Switch failed');
      }
    });
  });

  listEl.querySelectorAll('[data-leave-org]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const orgId = parseInt(btn.getAttribute('data-leave-org') || '0', 10);
      try {
        await api.removeOrganizationMember(orgId, userId);
        api.showToast('Left organization');
        await setupUserMembershipsSection(container, userId);
        await loadCurrentUser();
      } catch (err) {
        api.showToast(err instanceof Error ? err.message : 'Failed to leave');
      }
    });
  });
}

/**
 * Admin UI for managing organization members.
 *
 * @param {HTMLElement} container
 * @param {Organization} org
 */
async function setupOrgMemberManagement(container, org) {
  const listEl = container.querySelector('#org-members-admin-list');
  const searchInput = /** @type {HTMLInputElement | null} */ (container.querySelector('#org-member-search'));
  const resultsEl = container.querySelector('#org-member-search-results');
  if (!listEl) return;

  const refreshMembers = async () => {
    const fresh = await api.getOrganization(org.id);
    const members = fresh.members ?? [];
    listEl.innerHTML = members.length === 0
      ? '<p class="post-meta">No members yet.</p>'
      : `<ul class="org-members-list">${members.map((m) => {
        const name = m.user?.name ?? `User ${m.userId}`;
        return `<li data-testid="org-admin-member-${m.userId}">
          <a href="#/profile/${m.userId}">${escapeHtml(name)}</a>
          <span class="role-chip role-chip--${m.role}">${m.role === 'admin' ? 'Admin' : 'Member'}</span>
          <select data-member-role="${m.userId}" data-testid="org-member-role-${m.userId}">
            <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
            <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
          <button type="button" class="btn btn-sm" data-remove-member="${m.userId}">Remove</button>
        </li>`;
      }).join('')}</ul>`;

    listEl.querySelectorAll('[data-member-role]').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const uid = parseInt(sel.getAttribute('data-member-role') || '0', 10);
        const role = /** @type {HTMLSelectElement} */ (sel).value;
        try {
          await api.updateOrganizationMember(org.id, uid, { role: /** @type {'admin' | 'member'} */ (role) });
          await refreshMembers();
        } catch (err) {
          api.showToast(err instanceof Error ? err.message : 'Failed to update role');
        }
      });
    });

    listEl.querySelectorAll('[data-remove-member]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const uid = parseInt(btn.getAttribute('data-remove-member') || '0', 10);
        try {
          await api.removeOrganizationMember(org.id, uid);
          await refreshMembers();
        } catch (err) {
          api.showToast(err instanceof Error ? err.message : 'Failed to remove member');
        }
      });
    });
  };

  if (searchInput && resultsEl) {
    let allUsers = [];
    searchInput.addEventListener('focus', async () => {
      allUsers = await api.getUsers();
    });
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      const memberIds = new Set((org.members ?? []).map((m) => m.userId));
      const matches = allUsers.filter((u) =>
        !memberIds.has(u.id) && u.name.toLowerCase().includes(q)
      ).slice(0, 8);
      resultsEl.innerHTML = matches.map((u) => `
        <button type="button" class="message-picker-item" data-add-user="${u.id}">
          ${escapeHtml(u.name)}
        </button>
      `).join('') || '<p class="post-meta">No users found</p>';

      resultsEl.querySelectorAll('[data-add-user]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const uid = parseInt(btn.getAttribute('data-add-user') || '0', 10);
          try {
            await api.addOrganizationMember(org.id, { userId: uid, role: 'member' });
            searchInput.value = '';
            resultsEl.innerHTML = '';
            await refreshMembers();
          } catch (err) {
            api.showToast(err instanceof Error ? err.message : 'Failed to add member');
          }
        });
      });
    });
  }

  await refreshMembers();
}

/**
 * Render a read-only organization profile page.
 *
 * @param {HTMLElement} container
 * @param {Organization} org
 */
async function renderPublicOrganizationProfile(container, org) {
  const current = getCurrentUser();
  container.innerHTML = `
    <div class="profile-header" data-testid="profile-header">
      <div class="profile-header-top">
        ${renderAvatarHtml(org, 'profile-avatar')}
        <div>
          <h1 class="profile-name">${escapeHtml(org.name)}</h1>
          ${renderProfileBadge('organization')}
        </div>
      </div>
      <p class="profile-bio">${escapeHtml(org.bio || '')}</p>
      ${org.location?.label ? `<p class="post-meta">📍 ${escapeHtml(org.location.label)}</p>` : ''}
      ${renderOrgMembersHtml(org)}
      ${current && !isSameAccount(current, org) ? `
        <div class="profile-actions">
          <button class="btn btn-primary" data-testid="btn-follow">Follow</button>
          <button class="btn btn-primary" data-testid="btn-message-user-${org.id}">Message</button>
        </div>
      ` : ''}
    </div>
    <div id="projects-list"></div>
    <h2 class="page-title" style="font-size:1rem">Feed</h2>
    <div id="profile-feed" data-testid="profile-feed"></div>
  `;

  container.querySelector('[data-testid="btn-follow"]')?.addEventListener('click', async () => {
    await api.followOrganization(org.id);
    api.showToast('Following!');
  });

  container.querySelector(`[data-testid="btn-message-user-${org.id}"]`)?.addEventListener('click', async () => {
    try {
      await startDirectMessage('organization', org.id);
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to start conversation');
    }
  });

  await loadProjects(container.querySelector('#projects-list'), org.id);
  await loadProfileFeed('organization', org.id);
}

/**
 * Load applicant and availability lists for an organization's own profile.
 *
 * @param {HTMLElement} container
 * @param {number} orgId
 * @returns {Promise<void>}
 */
async function loadOrgMessagingSections(container, orgId) {
  const applicantsEl = container.querySelector('#org-applicants-list');
  const availabilityEl = container.querySelector('#org-availability-list');

  if (applicantsEl) {
    try {
      const positions = await api.getPositions();
      const orgPositions = positions.filter(
        (p) => p.authorType === 'organization' && p.authorId === orgId
      );
      if (orgPositions.length === 0) {
        applicantsEl.innerHTML = '<p class="empty-state">No open positions.</p>';
      } else {
        const blocks = [];
        for (const position of orgPositions) {
          const apps = await api.getPositionApplications(position.id);
          if (apps.length === 0) continue;
          blocks.push(`
            <div class="org-list-block">
              <h4>${escapeHtml(position.title)}</h4>
              <ul class="org-messaging-list">
                ${apps.map((app) => {
                  const applicant = app.user;
                  if (!applicant) return '';
                  return `
                    <li>
                      <span>${escapeHtml(applicant.name)}</span>
                      <button type="button" class="btn btn-sm btn-primary"
                        data-testid="btn-message-applicant-${applicant.id}"
                        data-user-id="${applicant.id}">Message</button>
                    </li>
                  `;
                }).join('')}
              </ul>
            </div>
          `);
        }
        applicantsEl.innerHTML = blocks.length > 0
          ? blocks.join('')
          : '<p class="empty-state">No applicants yet.</p>';
      }
    } catch (err) {
      applicantsEl.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load'}</p>`;
    }
  }

  if (availabilityEl) {
    try {
      const offers = await api.getInboundAvailability(orgId);
      if (offers.length === 0) {
        availabilityEl.innerHTML = '<p class="empty-state">No skill offers yet.</p>';
      } else {
        availabilityEl.innerHTML = `
          <ul class="org-messaging-list">
            ${offers.map((offer) => {
              const offerUser = offer.user;
              if (!offerUser) return '';
              const skills = (offer.skillsOffered || []).join(', ');
              const target = `${offer.targetType} #${offer.targetId}`;
              return `
                <li>
                  <div>
                    <strong>${escapeHtml(offerUser.name)}</strong>
                    <div class="post-meta">${escapeHtml(skills)} · ${escapeHtml(target)}</div>
                  </div>
                  <button type="button" class="btn btn-sm btn-primary"
                    data-testid="btn-message-volunteer-${offerUser.id}"
                    data-user-id="${offerUser.id}">Message</button>
                </li>
              `;
            }).join('')}
          </ul>
        `;
      }
    } catch (err) {
      availabilityEl.innerHTML = `<p class="empty-state">${err instanceof Error ? err.message : 'Failed to load'}</p>`;
    }
  }

  container.querySelectorAll('[data-user-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const uid = parseInt(btn.getAttribute('data-user-id') || '0', 10);
      if (!uid) return;
      try {
        await startDirectMessage('user', uid);
      } catch (err) {
        api.showToast(err instanceof Error ? err.message : 'Failed to start conversation');
      }
    });
  });
}

/**
 * Load and render feed items for a user's profile page.
 *
 * @param {AccountType} accountType
 * @param {number} accountId
 */
async function loadProfileFeed(accountType, accountId) {
  const feed = document.getElementById('profile-feed');
  if (!feed) return;
  const data = accountType === 'organization'
    ? await api.getOrganizationFeed(accountId, { perPage: 20 })
    : await api.getUserFeed(accountId, { perPage: 20 });
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
 * @param {AccountType} ownerType
 */
async function renderProjectDetail(container, projectId, orgId, ownerType = 'organization') {
  container.innerHTML = '<p class="empty-state">Loading…</p>';
  const data = await api.getProject(projectId);
  const project = data.project;
  const posts = data.posts || [];
  const current = getCurrentUser();
  const isOwner = current?.type === ownerType && current.id === orgId;

  container.innerHTML = `
    <a href="${profileLink({ type: ownerType, id: orgId })}" class="btn btn-sm">← Back to profile</a>
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
    await renderProjectDetail(container, projectId, orgId, 'organization');
  });
}
