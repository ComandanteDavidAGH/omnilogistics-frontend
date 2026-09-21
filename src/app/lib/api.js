const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, { code, status, requestId } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

async function request(path, { method = 'GET', apiKey, json, form, raw = false, timeoutMs = 120000 } = {}) {
  const headers = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body, signal: controller.signal });
  } catch (e) {
    const timedOut = e && e.name === 'AbortError';
    throw new ApiError(
      timedOut ? 'El análisis tardó demasiado tiempo.' : 'No se pudo conectar con el servidor backend.',
      { code: timedOut ? 'TIMEOUT' : 'RED' }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    const info = payload.detail || payload.error || {};
    const msg = typeof info === 'string' ? info : (info.message || `Error ${res.status}`);
    throw new ApiError(msg, {
      code: info.code,
      status: res.status,
      requestId: payload.request_id || info.request_id,
    });
  }

  if (raw) return res;
  return res.json();
}

export const api = {
  me: (apiKey) => request('/api/v1/me', { apiKey }),

  updateConfig: (apiKey, config) =>
    request('/api/v1/config', { method: 'PUT', apiKey, json: config }),

  understand: (apiKey, file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/v1/data-understanding', { method: 'POST', apiKey, form });
  },

  createAudit: (apiKey, file, mapping) => {
    const form = new FormData();
    form.append('file', file);
    form.append('mapping', JSON.stringify(mapping));
    return request('/api/v1/audits', { method: 'POST', apiKey, form });
  },

  listAudits: (apiKey) => request('/api/v1/audits', { apiKey }),

  getAudit: (apiKey, id) => request(`/api/v1/audits/${id}`, { apiKey }),

  deleteAudit: (apiKey, id) => request(`/api/v1/audits/${id}`, { method: 'DELETE', apiKey }),

  downloadAudit: async (apiKey, id) => {
    const res = await request(`/api/v1/audits/${id}/export`, { apiKey, raw: true });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Auditoria_${id}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  listTasks: (apiKey, status = '') => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/api/v1/tasks${q}`, { apiKey });
  },

  updateTask: (apiKey, id, body) =>
    request(`/api/v1/tasks/${id}`, { method: 'PATCH', apiKey, json: body }),
};