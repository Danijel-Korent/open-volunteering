const API_BASE = 'api';

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

export async function getUsers() {
  return request('users');
}

export async function getUser(id) {
  return request(`users/${id}`);
}

export async function getPositions() {
  return request('positions');
}

export async function createPosition(data) {
  return request('positions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getComments(positionId) {
  return request(`positions/${positionId}/comments`);
}

export async function createComment(positionId, data) {
  return request(`positions/${positionId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
