import * as api from './api.js';

/** Leaflet map instance (recreated on each visit to the map page). @type {LMap | null} */
let mapInstance = null;

/** Marker dot colours by entity type. @type {Record<string, string>} */
const MARKER_COLORS = {
  organization: '#22c55e',
  volunteer: '#3b82f6',
  position: '#f59e0b',
  event: '#8b5cf6',
};

/**
 * Render map page with Leaflet.
 *
 * @param {HTMLElement} container
 */
export async function renderMap(container) {
  container.innerHTML = `
    <h1 class="page-title">Map</h1>
    <div class="map-legend">
      <span class="map-legend-item"><span class="map-legend-dot" style="background:#22c55e"></span> Organizations</span>
      <span class="map-legend-item"><span class="map-legend-dot" style="background:#3b82f6"></span> Volunteers</span>
      <span class="map-legend-item"><span class="map-legend-dot" style="background:#f59e0b"></span> Positions</span>
      <span class="map-legend-item"><span class="map-legend-dot" style="background:#8b5cf6"></span> Events</span>
    </div>
    <div id="map-container" data-testid="map-container"></div>
  `;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  const mapEl = document.getElementById('map-container');
  if (!mapEl || typeof L === 'undefined') {
    if (mapEl) mapEl.innerHTML = '<p class="empty-state">Map library failed to load.</p>';
    return;
  }

  mapInstance = L.map('map-container').setView([45.815, 15.9819], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapInstance);

  try {
    const markers = await api.getMapMarkers();

    if (markers.length === 0) {
      api.showToast('No locations to display');
      return;
    }

    const bounds = [];

    markers.forEach((m) => {
      const color = MARKER_COLORS[m.type] || '#666';
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      let link = `#/profile/${m.id}`;
      if (m.type === 'position') link = '#/positions';
      else if (m.type === 'event') link = '#/calendar';

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(mapInstance);
      marker.bindPopup(`
        <strong>${escapeHtml(m.name)}</strong><br>
        <span style="text-transform:capitalize">${m.type}</span>
        ${m.label ? `<br>${escapeHtml(m.label)}` : ''}
        <br><a href="${link}">View</a>
      `);
      bounds.push([m.lat, m.lng]);
    });

    if (bounds.length > 1) {
      mapInstance.fitBounds(bounds, { padding: [30, 30] });
    }
  } catch (err) {
    api.showToast(err instanceof Error ? err.message : 'Failed to load markers');
  }

  setTimeout(() => mapInstance?.invalidateSize(), 100);
}

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
