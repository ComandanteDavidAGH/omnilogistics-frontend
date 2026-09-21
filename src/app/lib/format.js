export const SEVERITY_STYLE = {
  ALTA: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
  MEDIA: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
  BAJA: 'bg-blue-950/40 text-blue-300 border-blue-800/50',
};

export const TASK_STATUS = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  DESCARTADA: 'Descartada',
};

export const EVIDENCE_LABEL = {
  DETERMINISTICA: 'Regla directa comprobada',
  ESTADISTICA: 'Desviación estadística',
  ESTADISTICA_LIMITADA: 'Muestra pequeña',
  ESTIMADA: 'Estimación matemática',
};

export const ESTADO = {
  OK: { label: 'Completada con éxito', box: 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200' },
  CON_RESERVAS: { label: 'Completada con advertencias', box: 'bg-amber-950/30 border-amber-800/50 text-amber-200' },
  BLOQUEADA: { label: 'Bloqueada por datos insuficientes', box: 'bg-rose-950/30 border-rose-200' },
};

export function money(v) {
  if (v == null || isNaN(v)) return 'N/D';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);
}

export function pct(v) {
  if (v == null || isNaN(v)) return 'N/D';
  return `${Number(v).toFixed(1)}%`;
}

export function num(v, decimals = 0) {
  if (v == null || isNaN(v)) return 'N/D';
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: decimals,
  }).format(v);
}

export function dateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function isMoneyKey(key) {
  const k = String(key).toLowerCase();
  const MONEY_KEYS = ['ingreso', 'costo', 'flete', 'valor', 'impacto', 'riesgo', 'perdida', 'diferencia', 'desviacion', 'mediana_segmento'];
  return MONEY_KEYS.some((mk) => k.includes(mk)) || k.startsWith('valor_');
}