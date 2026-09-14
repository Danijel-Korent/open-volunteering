/**
 * Modal editor for feed items (posts, events, positions).
 */

import * as api from '../api.js';
import { setupImageDropzone } from './image-dropzone.js';
import { locationFieldsHtml, readLocationFromForm } from './location-fields.js';

/**
 * Escape HTML for safe insertion into modal markup.
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
 * Format ISO date for datetime-local input.
 *
 * @param {string} iso
 * @returns {string}
 */
function isoToDatetimeLocal(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse datetime-local value to ISO string.
 *
 * @param {string} value
 * @returns {string}
 */
function datetimeLocalToIso(value) {
  if (!value) return '';
  return new Date(value).toISOString();
}

/**
 * Merge API entity fields into an existing feed item for re-render.
 *
 * @param {FeedItem} original
 * @param {Post | Position | VolEvent} apiEntity
 * @returns {FeedItem}
 */
export function mergeFeedItemFromApi(original, apiEntity) {
  if (original.feedType === 'user_post' || original.feedType === 'org_post') {
    const post = /** @type {Post} */ (apiEntity);
    /** @type {FeedItem} */
    const merged = {
      ...original,
      content: post.content,
    };
    if (post.imageFileId) {
      merged.imageFileId = post.imageFileId;
      merged.imageUrl = api.fileContentUrl(post.imageFileId);
    } else {
      delete merged.imageFileId;
      delete merged.imageUrl;
    }
    return merged;
  }
  if (original.feedType === 'position') {
    const position = /** @type {Position} */ (apiEntity);
    /** @type {FeedItem} */
    const merged = {
      ...original,
      title: position.title,
      content: position.description,
      category: position.category,
      remote: position.remote,
      location: position.location ?? null,
      closed: Boolean(position.closedAt),
    };
    if (position.imageFileId) {
      merged.imageFileId = position.imageFileId;
      merged.imageUrl = api.fileContentUrl(position.imageFileId);
    } else {
      delete merged.imageFileId;
      delete merged.imageUrl;
    }
    return merged;
  }
  const event = /** @type {VolEvent} */ (apiEntity);
  /** @type {FeedItem} */
  const merged = {
    ...original,
    title: event.title,
    content: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    locationType: event.locationType,
    location: event.location ?? null,
    cancelled: Boolean(event.cancelledAt),
  };
  if (event.imageFileId) {
    merged.imageFileId = event.imageFileId;
    merged.imageUrl = api.fileContentUrl(event.imageFileId);
  } else {
    delete merged.imageFileId;
    delete merged.imageUrl;
  }
  return merged;
}

/**
 * Show edit modal for a feed item; returns merged feed item on save.
 *
 * @param {FeedItem} item
 * @returns {Promise<FeedItem | null>}
 */
export function showEditFeedItemDialog(item) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.dataset.testid = 'edit-content-dialog';

    let formInner = '';
    if (item.feedType === 'user_post' || item.feedType === 'org_post') {
      formInner = `
        <h3 id="edit-content-title">Edit post</h3>
        <div class="form-group">
          <label for="edit-post-content">Content</label>
          <textarea id="edit-post-content" data-testid="edit-post-content" rows="4">${escapeHtml(item.content)}</textarea>
        </div>
        <div id="edit-post-dropzone-mount"></div>
      `;
    } else if (item.feedType === 'event') {
      const locType = item.locationType === 'online' ? 'online' : 'physical';
      formInner = `
        <h3 id="edit-content-title">Edit event</h3>
        <div class="form-group"><label>Title</label><input data-testid="edit-event-title" value="${escapeHtml(item.title || '')}"></div>
        <div class="form-group"><label>Description</label><textarea data-testid="edit-event-description" rows="3">${escapeHtml(item.content)}</textarea></div>
        <div class="form-group"><label>Start</label><input type="datetime-local" data-testid="edit-event-start" value="${isoToDatetimeLocal(item.startDate || '')}"></div>
        <div class="form-group"><label>End</label><input type="datetime-local" data-testid="edit-event-end" value="${isoToDatetimeLocal(item.endDate || item.startDate || '')}"></div>
        <div class="form-group"><label>Location type</label>
          <select data-testid="edit-event-location-type">
            <option value="physical" ${locType === 'physical' ? 'selected' : ''}>Physical</option>
            <option value="online" ${locType === 'online' ? 'selected' : ''}>Online</option>
          </select>
        </div>
        <div id="edit-event-location-mount" ${locType === 'online' ? 'hidden' : ''}>${locationFieldsHtml('edit-event', item.location)}</div>
        <div id="edit-event-dropzone-mount"></div>
      `;
    } else {
      formInner = `
        <h3 id="edit-content-title">Edit position</h3>
        <div class="form-group"><label>Title</label><input data-testid="edit-position-title" value="${escapeHtml(item.title || '')}"></div>
        <div class="form-group"><label>Description</label><textarea data-testid="edit-position-description" rows="3">${escapeHtml(item.content)}</textarea></div>
        <div class="form-group"><label>Category</label><input data-testid="edit-position-category" value="${escapeHtml(item.category || 'general')}"></div>
        <div class="form-group"><label><input type="checkbox" data-testid="edit-position-remote" ${item.remote ? 'checked' : ''}> Remote</label></div>
        <div id="edit-position-location-mount" ${item.remote ? 'hidden' : ''}>${locationFieldsHtml('edit-position', item.location)}</div>
        <div id="edit-position-dropzone-mount"></div>
      `;
    }

    overlay.innerHTML = `
      <div class="modal modal--scroll edit-content-modal" role="dialog" aria-labelledby="edit-content-title">
        <div class="profile-form edit-content-form">
          ${formInner}
          <div class="confirm-dialog-actions">
            <button type="button" class="btn btn-primary" data-testid="edit-content-submit">Save</button>
            <button type="button" class="btn" data-testid="edit-content-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    /** @type {import('./image-dropzone.js').ImageDropzoneHandle | null} */
    let postDropzone = null;
    /** @type {import('./image-dropzone.js').ImageDropzoneHandle | null} */
    let eventDropzone = null;
    /** @type {number | undefined} */
    const initialPostImageId = item.feedType === 'user_post' || item.feedType === 'org_post'
      ? item.imageFileId
      : undefined;
    let postImageRemoved = false;
    /** @type {number | undefined} */
    const initialPositionImageId = item.feedType === 'position' ? item.imageFileId : undefined;
    let positionImageRemoved = false;
    /** @type {number | undefined} */
    const initialEventImageId = item.feedType === 'event' ? item.imageFileId : undefined;
    let eventImageRemoved = false;

    const submitBtn = overlay.querySelector('[data-testid="edit-content-submit"]');
    const cancelBtn = overlay.querySelector('[data-testid="edit-content-cancel"]');

    const updateSaveDisabled = () => {
      if (submitBtn instanceof HTMLButtonElement) {
        const activeDropzone = eventDropzone ?? postDropzone;
        submitBtn.disabled = activeDropzone?.isUploading() ?? false;
      }
    };

    document.body.appendChild(overlay);

    if (item.feedType === 'user_post' || item.feedType === 'org_post') {
      const mount = overlay.querySelector('#edit-post-dropzone-mount');
      if (mount instanceof HTMLElement) {
        postDropzone = setupImageDropzone(mount, {
          dropzoneTestId: 'edit-post-dropzone',
          fileInputTestId: 'edit-post-file-input',
          previewTestId: 'edit-post-image-preview',
          label: 'Photo — drop here or tap',
          initialFileId: item.imageFileId,
          removeDeletesFile: false,
          onChange: ({ fileId }) => {
            if (initialPostImageId && fileId === null) {
              postImageRemoved = true;
            } else if (fileId !== null) {
              postImageRemoved = false;
            }
            updateSaveDisabled();
          },
        });
      }
    }

    if (item.feedType === 'event') {
      const locTypeSelect = overlay.querySelector('[data-testid="edit-event-location-type"]');
      const locMount = overlay.querySelector('#edit-event-location-mount');
      locTypeSelect?.addEventListener('change', () => {
        if (!(locMount instanceof HTMLElement) || !(locTypeSelect instanceof HTMLSelectElement)) return;
        locMount.hidden = locTypeSelect.value === 'online';
      });
      const evtMount = overlay.querySelector('#edit-event-dropzone-mount');
      if (evtMount instanceof HTMLElement) {
        eventDropzone = setupImageDropzone(evtMount, {
          dropzoneTestId: 'edit-event-dropzone',
          fileInputTestId: 'edit-event-file-input',
          previewTestId: 'edit-event-image-preview',
          label: 'Photo — drop here or tap',
          initialFileId: item.imageFileId,
          removeDeletesFile: false,
          onChange: ({ fileId }) => {
            if (initialEventImageId && fileId === null) {
              eventImageRemoved = true;
            } else if (fileId !== null) {
              eventImageRemoved = false;
            }
            updateSaveDisabled();
          },
        });
      }
    }

    if (item.feedType === 'position') {
      const remoteCheck = overlay.querySelector('[data-testid="edit-position-remote"]');
      const locMount = overlay.querySelector('#edit-position-location-mount');
      remoteCheck?.addEventListener('change', () => {
        if (!(locMount instanceof HTMLElement) || !(remoteCheck instanceof HTMLInputElement)) return;
        locMount.hidden = remoteCheck.checked;
      });
      const posMount = overlay.querySelector('#edit-position-dropzone-mount');
      if (posMount instanceof HTMLElement) {
        postDropzone = setupImageDropzone(posMount, {
          dropzoneTestId: 'edit-position-dropzone',
          fileInputTestId: 'edit-position-file-input',
          previewTestId: 'edit-position-image-preview',
          label: 'Photo — drop here or tap',
          initialFileId: item.imageFileId,
          removeDeletesFile: false,
          onChange: ({ fileId }) => {
            if (initialPositionImageId && fileId === null) {
              positionImageRemoved = true;
            } else if (fileId !== null) {
              positionImageRemoved = false;
            }
            updateSaveDisabled();
          },
        });
      }
    }

    const close = (/** @type {FeedItem | null} */ result) => {
      overlay.remove();
      resolve(result);
    };

    cancelBtn?.addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    submitBtn?.addEventListener('click', async () => {
      if (!(submitBtn instanceof HTMLButtonElement) || submitBtn.disabled) return;
      submitBtn.disabled = true;
      try {
        let apiEntity;
        if (item.feedType === 'user_post' || item.feedType === 'org_post') {
          const contentEl = overlay.querySelector('[data-testid="edit-post-content"]');
          const content = contentEl instanceof HTMLTextAreaElement ? contentEl.value.trim() : '';
          if (!content) {
            api.showToast('Content is required');
            return;
          }
          /** @type {{ content: string, imageFileId?: number | null }} */
          const payload = { content };
          const fileId = postDropzone?.getFileId() ?? null;
          if (postImageRemoved && !fileId) {
            payload.imageFileId = null;
          } else if (fileId && fileId !== initialPostImageId) {
            payload.imageFileId = fileId;
          } else if (postImageRemoved) {
            payload.imageFileId = null;
          }
          apiEntity = await api.updatePost(item.id, payload);
        } else if (item.feedType === 'event') {
          const titleEl = overlay.querySelector('[data-testid="edit-event-title"]');
          const descEl = overlay.querySelector('[data-testid="edit-event-description"]');
          const startEl = overlay.querySelector('[data-testid="edit-event-start"]');
          const endEl = overlay.querySelector('[data-testid="edit-event-end"]');
          const locTypeEl = overlay.querySelector('[data-testid="edit-event-location-type"]');
          const title = titleEl instanceof HTMLInputElement ? titleEl.value.trim() : '';
          const description = descEl instanceof HTMLTextAreaElement ? descEl.value.trim() : '';
          const startVal = startEl instanceof HTMLInputElement ? startEl.value : '';
          const endVal = endEl instanceof HTMLInputElement ? endEl.value : '';
          const locationType = locTypeEl instanceof HTMLSelectElement
            ? /** @type {'physical' | 'online'} */ (locTypeEl.value)
            : 'physical';
          if (!title || !description || !startVal) {
            api.showToast('Title, description, and start date are required');
            return;
          }
          const location = locationType === 'online'
            ? null
            : readLocationFromForm(overlay, 'edit-event');
          /** @type {Partial<VolEvent> & { imageFileId?: number | null }} */
          const eventPayload = {
            title,
            description,
            startDate: datetimeLocalToIso(startVal),
            endDate: endVal ? datetimeLocalToIso(endVal) : datetimeLocalToIso(startVal),
            locationType,
            location,
          };
          const evtFileId = eventDropzone?.getFileId() ?? null;
          if (eventImageRemoved && !evtFileId) {
            eventPayload.imageFileId = null;
          } else if (evtFileId && evtFileId !== initialEventImageId) {
            eventPayload.imageFileId = evtFileId;
          } else if (eventImageRemoved) {
            eventPayload.imageFileId = null;
          }
          apiEntity = await api.updateEvent(item.id, eventPayload);
        } else {
          const titleEl = overlay.querySelector('[data-testid="edit-position-title"]');
          const descEl = overlay.querySelector('[data-testid="edit-position-description"]');
          const catEl = overlay.querySelector('[data-testid="edit-position-category"]');
          const remoteEl = overlay.querySelector('[data-testid="edit-position-remote"]');
          const title = titleEl instanceof HTMLInputElement ? titleEl.value.trim() : '';
          const description = descEl instanceof HTMLTextAreaElement ? descEl.value.trim() : '';
          const category = catEl instanceof HTMLInputElement ? catEl.value.trim() : 'general';
          const remote = remoteEl instanceof HTMLInputElement ? remoteEl.checked : false;
          if (!title || !description) {
            api.showToast('Title and description are required');
            return;
          }
          const location = remote ? null : readLocationFromForm(overlay, 'edit-position');
          /** @type {Partial<Position> & { imageFileId?: number | null }} */
          const payload = {
            title,
            description,
            category,
            remote,
            location,
          };
          const fileId = postDropzone?.getFileId() ?? null;
          if (positionImageRemoved && !fileId) {
            payload.imageFileId = null;
          } else if (fileId && fileId !== initialPositionImageId) {
            payload.imageFileId = fileId;
          } else if (positionImageRemoved) {
            payload.imageFileId = null;
          }
          apiEntity = await api.updatePosition(item.id, payload);
        }
        close(mergeFeedItemFromApi(item, apiEntity));
      } catch (err) {
        api.showToast(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        updateSaveDisabled();
      }
    });
  });
}
