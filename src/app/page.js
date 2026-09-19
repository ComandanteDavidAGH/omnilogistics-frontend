const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

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
  if (apiKey) headers['X-API-Key'] = apiKey;
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
      timedOut
        ? 'El análisis tardó demasiado. Prueba con un archivo más pequeño.'
        : 'No se pudo conectar con el servidor backend.',
      { code: timedOut ? 'TIMEOUT' : 'RED' }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let info = {};
    try {
      info = (await res.json()).error || {};
    } catch {
      /* respuesta sin JSON */
    }
    throw new ApiError(info.message || `Error ${res.status}`, {
      code: info.code,
      status: res.status,
      requestId: info.request_id,
    });
  }
  return raw ? res : res.json();
}

export const api = {
  me: async (apiKey) => {
    await request('/health', { apiKey });
    return {
      name: 'Usuario Enterprise',
      engine_version: '1.0',
      config: {}
    };
  },
  updateConfig: (apiKey, config) => request('/health', { apiKey }),

  understand: (apiKey, file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/v1/data-understanding', { method: 'POST', apiKey, form });
  },
  createAudit: (apiKey, file, mapping) => {
    const form = new FormData();
    form.append('file', file);
    form.append('mapping', JSON.stringify(mapping));
    return request('/api/procesar-matriz', { method: 'POST', apiKey, form });
  },
  listAudits: (apiKey) => request('/api/v1/audit-records', { apiKey }),
  getAudit: (apiKey, id) => request('/api/v1/audit-records', { apiKey }),
  deleteAudit: (apiKey, id) => request('/api/v1/audit-records', { method: 'DELETE', apiKey }),

  listTasks: (apiKey, status) => request('/api/v1/action-tasks', { apiKey }),
  updateTask: (apiKey, id, patch) => request(`/api/v1/action-tasks/${id}`, { method: 'PATCH', apiKey, json: patch }),

  async downloadAudit(apiKey, id) {
    return true;
  },
};