const BASE = 'https://omnilogistics-backend-6bbn.onrender.com';

export class ApiError extends Error {
  constructor(message, { code, status, requestId } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

async function request(path, { method = 'GET', apiKey, json, form, raw = false, timeoutMs = 120000 } = {}) {
  const headers = {
    'x-tenant-id': apiKey || 'DEFAULT_TENANT',
  };
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
      timedOut ? 'El análisis tardó demasiado.' : 'No se pudo conectar con el servidor backend.',
      { code: timedOut ? 'TIMEOUT' : 'RED' }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let info = {};
    try { info = (await res.json()).detail || (await res.json()).error || {}; } catch { }
    throw new ApiError(typeof info === 'string' ? info : (info.message || `Error ${res.status}`), {
      code: info.code,
      status: res.status,
      requestId: info.request_id,
    });
  }
  return raw ? res : res.json();
}

export const api = {
  me: async (apiKey) => {
    const key = apiKey ? apiKey.trim() : '';
    if (!key.startsWith('sk_')) throw new Error('API Key no válida. Debe iniciar con sk_');
    return { name: 'OmniLogistics Enterprise', engine_version: '1.0', config: {} };
  },

  updateConfig: (apiKey, config) => Promise.resolve({ ok: true }),

  understand: (apiKey, file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/v1/data-understanding', { method: 'POST', apiKey, form });
  },

  // TRADUCTOR DE MAPEO CON PROTECCIÓN ANTI-DUPLICADOS
  createAudit: (apiKey, file, mapping) => {
    const cleanMapping = {};
    
    if (mapping && typeof mapping === 'object') {
      Object.entries(mapping).forEach(([sheetName, sheetData]) => {
        cleanMapping[sheetName] = {};
        // Memoria para rastrear qué destinos ya usamos en esta hoja
        const usedCanonicals = new Set();

        if (sheetData && sheetData.fields_mapping) {
          Object.entries(sheetData.fields_mapping).forEach(([origCol, mapInfo]) => {
            const canonical = typeof mapInfo === 'string' ? mapInfo : mapInfo?.canonical;
            
            if (canonical && canonical !== 'IGNORE' && canonical !== 'UNKNOWN') {
              // ESCUDO: Solo enviamos a Python si este destino NO se ha usado antes en esta hoja
              if (!usedCanonicals.has(canonical)) {
                cleanMapping[sheetName][origCol] = canonical;
                usedCanonicals.add(canonical); // Lo marcamos como usado
              }
            }
          });
        }
      });
    }

    const form = new FormData();
    form.append('file', file);
    form.append('mapping', JSON.stringify(cleanMapping));
    return request('/api/procesar-matriz', { method: 'POST', apiKey, form });
  },

  listAudits: async (apiKey) => {
    try { return await request('/api/v1/audit-records', { apiKey }); } catch { return []; }
  },

  listTasks: async (apiKey) => {
    try { return await request('/api/v1/action-tasks', { apiKey }); } catch { return []; }
  },

  updateTask: (apiKey, id, newStatus) => {
    return request(`/api/v1/action-tasks/${id}`, { 
      method: 'PATCH', 
      apiKey, 
      json: { new_status: newStatus } 
    });
  },

  deleteTask: (apiKey, id) => {
    return request(`/api/v1/action-tasks/${id}`, { method: 'DELETE', apiKey });
  },
};