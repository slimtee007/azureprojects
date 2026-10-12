/**
 * Tiny fetch wrapper for the AzureDrop API.
 * VITE_API_BASE_URL: empty string = same origin (production / Nginx),
 * otherwise the backend base URL (default http://localhost:5001).
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5001';

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path, { token, headers, body, ...opts } = {}) {
  const init = {
    ...opts,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }
  const res = await fetch(apiUrl(path), init);
  if (res.status === 204) return { ok: true, status: 204, data: null };
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  return {
    ok: res.ok,
    status: res.status,
    data,
    message: data?.error?.message || (res.ok ? null : `Request failed (${res.status})`),
  };
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}
