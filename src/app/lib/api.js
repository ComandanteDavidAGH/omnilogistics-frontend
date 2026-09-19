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
        ? 'El análisis tardó demasiado. Prueba con un archivo más pequeño o por periodos.'
        : 'No se pudo conectar con el servidor. Si es el primer uso del día puede estar despertando: espera un minuto e intenta de nuevo.',
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
  me: (apiKey) => request('/api/v1/me', { apiKey }),
  updateConfig: (apiKey, config) => request('/api/v1/config', { method: 'PUT', apiKey, json: config }),

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
  listAudits: (apiKey) => request('/api/v1/audits?limit=50', { apiKey }),
  getAudit: (apiKey, id) => request(`/api/v1/audits/${id}`, { apiKey }),
  deleteAudit: (apiKey, id) => request(`/api/v1/audits/${id}`, { method: 'DELETE', apiKey }),

  listTasks: (apiKey, status) =>
    request(`/api/v1/tasks?limit=200${status ? `&status=${encodeURIComponent(status)}` : ''}`, { apiKey }),
  updateTask: (apiKey, id, patch) => request(`/api/v1/tasks/${id}`, { method: 'PATCH', apiKey, json: patch }),

  async downloadAudit(apiKey, id) {
    const res = await request(`/api/v1/audits/${id}/export`, { apiKey, raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genesis_auditoria_${id}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
```[cite: 2, 27]

> Guarda el archivo con **`Ctrl` + `S`**[cite: 4].

---

### 2. Para el archivo `src/app/lib/format.js`

Abre `src/app/lib/format.js` en Codespaces, borra todo y pega **SOLO este bloque de código**[cite: 2, 4, 26]:

```javascript
export const money = (v) =>
  v === null || v === undefined
    ? 'N/D'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export const num = (v, digits = 0) =>
  v === null || v === undefined ? 'N/D' : Number(v).toLocaleString('es-CO', { maximumFractionDigits: digits });

export const pct = (v) =>
  v === null || v === undefined ? 'N/D' : `${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;

export const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export const SEVERITY_STYLE = {
  ALTA: 'bg-rose-950/50 text-rose-300 border-rose-800/60',
  MEDIA: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
  BAJA: 'bg-slate-800 text-slate-300 border-slate-700',
};

export const ESTADO = {
  OK: { label: 'Resultados confiables', box: 'border-emerald-800/60 bg-emerald-950/20 text-emerald-300' },
  CON_RESERVAS: { label: 'Resultados con reservas', box: 'border-amber-800/60 bg-amber-950/20 text-amber-300' },
  BLOQUEADA: { label: 'Análisis bloqueado', box: 'border-rose-800/60 bg-rose-950/20 text-rose-300' },
};

export const TASK_STATUS = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  DESCARTADA: 'Descartada',
};

export const EVIDENCE_LABEL = {
  DETERMINISTICA: 'Comprobado con los datos',
  ESTADISTICA: 'Estadístico',
  ESTADISTICA_LIMITADA: 'Estadístico (muestra pequeña)',
  ESTIMADA: 'Estimación',
};

const MONEY_KEYS = ['ingreso', 'costo', 'perdida', 'diferencia', 'desviacion', 'mediana_segmento'];
export const isMoneyKey = (k) => MONEY_KEYS.includes(k) || k.startsWith('valor_');
```[cite: 2, 26]

> Guarda el archivo con **`Ctrl` + `S`**[cite: 4].

---

### 3. Enviar a Vercel por la terminal

Abre la terminal abajo en Codespaces y ejecuta estos 3 comandos[cite: 2, 4]:

```bash
git add .
git commit -m "Fix: Add pure code to lib/api.js and format.js"
git push
```[cite: 2, 4]

Al terminar el `push`, Vercel re-compilará automáticamente sin errores[cite: 2, 4].