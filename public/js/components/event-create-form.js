/**
 * Shared create-event form markup and submit handler.
 */

import * as api from '../api.js';
import { setupImageDropzone } from './image-dropzone.js';
import { bindLocationTypeToggle, locationFieldsHtml, readLocationFromForm } from './location-fields.js';

/**
 * Mount the create-event form into a container.
 *
 * @param {HTMLElement} mount
 * @param {{
 *   onSuccess: () => Promise<void> | void,
 *   formTestId?: string,
 * }} options
 */
export function mountEventCreateForm(mount, options) {
  const formTestId = options.formTestId ?? 'event-form';
  mount.innerHTML = `
    <div class="profile-form" data-testid="${formTestId}">
      <h3>Create event</h3>
      <div class="form-group"><label>Title</label><input id="evt-title" data-testid="event-title"></div>
      <div class="form-group"><label>Description</label><textarea id="evt-desc" data-testid="event-description"></textarea></div>
      <div class="form-group"><label>Start date</label><input type="datetime-local" id="evt-start" data-testid="event-start"></div>
      <div class="form-group"><label>End date (optional)</label><input type="datetime-local" id="evt-end" data-testid="event-end"></div>
      <div class="form-group"><label>Location type</label>
        <select id="evt-loc-type" data-testid="event-location-type">
          <option value="physical">Physical</option>
          <option value="online">Online</option>
        </select>
      </div>
      <div id="evt-location-mount">${locationFieldsHtml('event-create', null)}</div>
      <div id="event-create-dropzone-mount"></div>
      <button type="button" class="btn btn-primary" data-testid="event-submit">Create</button>
    </div>
  `;

  const formRoot = mount.querySelector(`[data-testid="${formTestId}"]`);
  if (!(formRoot instanceof HTMLElement)) return;

  const locMount = formRoot.querySelector('#evt-location-mount');
  if (locMount instanceof HTMLElement) {
    bindLocationTypeToggle(formRoot, 'event-location-type', locMount);
  }

  const dropzoneMount = formRoot.querySelector('#event-create-dropzone-mount');
  /** @type {import('./image-dropzone.js').ImageDropzoneHandle | null} */
  let dropzone = null;
  if (dropzoneMount instanceof HTMLElement) {
    dropzone = setupImageDropzone(dropzoneMount, {
      dropzoneTestId: 'event-create-dropzone',
      fileInputTestId: 'event-create-file-input',
      previewTestId: 'event-create-image-preview',
      label: 'Photo — drop here or tap',
    });
  }

  formRoot.querySelector('[data-testid="event-submit"]')?.addEventListener('click', async () => {
    if (dropzone?.isUploading()) {
      api.showToast('Wait for the image upload to finish');
      return;
    }
    const title = /** @type {HTMLInputElement} */ (document.getElementById('evt-title')).value.trim();
    const description = /** @type {HTMLTextAreaElement} */ (document.getElementById('evt-desc')).value.trim();
    const startRaw = /** @type {HTMLInputElement} */ (document.getElementById('evt-start')).value;
    const endRaw = /** @type {HTMLInputElement} */ (document.getElementById('evt-end')).value;
    const locationType = /** @type {'physical' | 'online'} */ (
      /** @type {HTMLSelectElement} */ (document.getElementById('evt-loc-type')).value
    );
    if (!title || !description || !startRaw) {
      api.showToast('Title, description, and start date are required');
      return;
    }
    const location = locationType === 'online' ? null : readLocationFromForm(formRoot, 'event-create');
    const fileId = dropzone?.getFileId();
    /** @type {Partial<VolEvent> & { imageFileId?: number }} */
    const payload = {
      title,
      description,
      startDate: new Date(startRaw).toISOString(),
      endDate: endRaw ? new Date(endRaw).toISOString() : new Date(startRaw).toISOString(),
      locationType,
      location,
    };
    if (fileId) {
      payload.imageFileId = fileId;
    }
    try {
      await api.createEvent(payload);
      api.showToast('Event created!');
      mount.innerHTML = '';
      dropzone?.release();
      await options.onSuccess();
    } catch (err) {
      api.showToast(err instanceof Error ? err.message : 'Failed to create event');
    }
  });
}
