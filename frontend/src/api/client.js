const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export function getOverview(limit = 500) {
  return request(`/api/graph/overview?limit=${limit}`);
}

export function getNeighbors(nodeId, depth = 1) {
  return request(`/api/nodes/${encodeURIComponent(nodeId)}/neighbors?depth=${depth}`);
}

export function getNode(nodeId) {
  return request(`/api/nodes/${encodeURIComponent(nodeId)}`);
}

export function searchNodes(query) {
  return request(`/api/search?q=${encodeURIComponent(query)}`);
}

export function createNode(payload) {
  return request('/api/nodes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createRelationship(payload) {
  return request('/api/relationships', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function importJson(payload) {
  return request('/api/import/json', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function importCsv(csvText) {
  return request('/api/import/csv', {
    method: 'POST',
    body: JSON.stringify({ csv_text: csvText })
  });
}
