import * as api from '../api.js';

/**
 * @typedef {object} ImageDropzoneOptions
 * @property {string} dropzoneTestId
 * @property {string} fileInputTestId
 * @property {string} [previewTestId]
 * @property {string} [label]
 * @property {(state: { fileId: number | null, uploading: boolean }) => void} [onChange]
 */

/**
 * @typedef {object} ImageDropzoneHandle
 * @property {() => number | null} getFileId
 * @property {() => boolean} isUploading
 * @property {() => Promise<void>} clear
 * @property {() => void} release Clear local state without deleting the server file
 */

/**
 * Mount a drag-and-drop / tap-to-pick image upload zone.
 *
 * @param {HTMLElement} container
 * @param {ImageDropzoneOptions} opts
 * @returns {ImageDropzoneHandle}
 */
export function setupImageDropzone(container, opts) {
  /** @type {number | null} */
  let fileId = null;
  let uploading = false;
  /** @type {string | null} */
  let localPreviewUrl = null;

  const label = opts.label ?? 'Drop an image or tap to choose';

  container.innerHTML = `
    <div class="image-dropzone" data-testid="${opts.dropzoneTestId}" tabindex="0" role="button" aria-label="${label}">
      <input type="file" accept="image/jpeg,image/png,image/webp" class="image-dropzone-input" data-testid="${opts.fileInputTestId}" hidden>
      <span class="image-dropzone-label">${label}</span>
      ${opts.previewTestId ? `<div class="image-dropzone-preview-wrap" hidden>
        <img class="image-dropzone-preview" data-testid="${opts.previewTestId}" alt="">
        <button type="button" class="btn btn-sm image-dropzone-remove">Remove</button>
      </div>` : ''}
    </div>
  `;

  const dropzone = /** @type {HTMLElement} */ (container.querySelector('.image-dropzone'));
  const input = /** @type {HTMLInputElement} */ (container.querySelector('.image-dropzone-input'));
  const previewWrap = /** @type {HTMLElement | null} */ (container.querySelector('.image-dropzone-preview-wrap'));
  const previewImg = /** @type {HTMLImageElement | null} */ (container.querySelector('.image-dropzone-preview'));
  const removeBtn = container.querySelector('.image-dropzone-remove');

  const notify = () => {
    opts.onChange?.({ fileId, uploading });
  };

  const setUploading = (value) => {
    uploading = value;
    dropzone.classList.toggle('is-uploading', uploading);
    notify();
  };

  const showPreview = (src) => {
    if (!previewWrap || !previewImg) return;
    previewImg.src = src;
    previewWrap.hidden = false;
    dropzone.querySelector('.image-dropzone-label')?.classList.add('is-hidden');
  };

  const hidePreview = () => {
    if (!previewWrap || !previewImg) return;
    previewImg.removeAttribute('src');
    previewWrap.hidden = true;
    dropzone.querySelector('.image-dropzone-label')?.classList.remove('is-hidden');
  };

  const revokeLocalPreview = () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      localPreviewUrl = null;
    }
  };

  /**
   * @param {File} file
   */
  const handleFile = async (file) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      api.showToast('Use JPEG, PNG, or WebP');
      return;
    }

    revokeLocalPreview();
    localPreviewUrl = URL.createObjectURL(file);
    showPreview(localPreviewUrl);

    const previousId = fileId;
    fileId = null;
    notify();

    setUploading(true);
    try {
      const stored = await api.uploadFile(file);
      if (previousId) {
        await api.deleteFile(previousId).catch(() => {});
      }
      fileId = stored.id;
      showPreview(api.fileContentUrl(stored.id));
      revokeLocalPreview();
    } catch (err) {
      hidePreview();
      revokeLocalPreview();
      api.showToast(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  dropzone.addEventListener('click', (e) => {
    if (e.target instanceof HTMLElement && e.target.closest('.image-dropzone-remove')) return;
    input.click();
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) void handleFile(file);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) void handleFile(file);
  });

  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    void clear();
  });

  const clear = async () => {
    if (fileId) {
      await api.deleteFile(fileId).catch(() => {});
    }
    release();
  };

  const release = () => {
    fileId = null;
    hidePreview();
    revokeLocalPreview();
    notify();
  };

  return {
    getFileId: () => fileId,
    isUploading: () => uploading,
    clear,
    release,
  };
}

/**
 * Render avatar markup: image when file id is set, otherwise initials.
 *
 * @param {{ avatarFileId?: number, name: string }} user
 * @param {string} className
 * @returns {string}
 */
export function renderAvatarHtml(user, className = 'post-card-avatar') {
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

  if (user.avatarFileId) {
    const src = api.fileContentUrl(user.avatarFileId);
    return `<img class="${className} ${className}--img" src="${src}" alt="">`;
  }
  return `<div class="${className}" aria-hidden="true">${initials}</div>`;
}
