/**
 * Shared location label/lat/lng fields for event and position forms.
 */

/**
 * Escape HTML for safe insertion into form markup.
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
 * HTML for optional location fields.
 *
 * @param {string} prefix test id prefix (e.g. edit-event, event-create)
 * @param {GeoLocation | null | undefined} location
 * @returns {string}
 */
export function locationFieldsHtml(prefix, location) {
  return `
    <div class="form-group">
      <label>Location label</label>
      <input type="text" data-testid="${prefix}-location-label" value="${escapeHtml(location?.label || '')}">
    </div>
    <div class="form-group">
      <label>Latitude</label>
      <input type="number" step="any" data-testid="${prefix}-lat" value="${location?.lat ?? ''}">
    </div>
    <div class="form-group">
      <label>Longitude</label>
      <input type="number" step="any" data-testid="${prefix}-lng" value="${location?.lng ?? ''}">
    </div>
  `;
}

/**
 * Read location fields from a form root element.
 *
 * @param {HTMLElement} root
 * @param {string} prefix
 * @returns {GeoLocation | null}
 */
export function readLocationFromForm(root, prefix) {
  const labelEl = root.querySelector(`[data-testid="${prefix}-location-label"]`);
  const latEl = root.querySelector(`[data-testid="${prefix}-lat"]`);
  const lngEl = root.querySelector(`[data-testid="${prefix}-lng"]`);
  const label = labelEl instanceof HTMLInputElement ? labelEl.value.trim() : '';
  if (!label) return null;
  const lat = latEl instanceof HTMLInputElement ? parseFloat(latEl.value) : 0;
  const lng = lngEl instanceof HTMLInputElement ? parseFloat(lngEl.value) : 0;
  return {
    label,
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
  };
}

/**
 * Wire location type select to show/hide physical location fields.
 *
 * @param {HTMLElement} root
 * @param {string} locationTypeTestId
 * @param {HTMLElement} locationMount
 */
export function bindLocationTypeToggle(root, locationTypeTestId, locationMount) {
  const locTypeSelect = root.querySelector(`[data-testid="${locationTypeTestId}"]`);
  if (!(locTypeSelect instanceof HTMLSelectElement) || !(locationMount instanceof HTMLElement)) {
    return;
  }
  const sync = () => {
    locationMount.hidden = locTypeSelect.value === 'online';
  };
  locTypeSelect.addEventListener('change', sync);
  sync();
}
