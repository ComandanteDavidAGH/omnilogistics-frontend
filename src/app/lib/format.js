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