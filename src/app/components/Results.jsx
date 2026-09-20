'use client';
import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { ESTADO, EVIDENCE_LABEL, SEVERITY_STYLE, dateTime, isMoneyKey, money, num, pct } from '../lib/format';

const MODO = { por_viaje: 'Por viaje', atributos: 'Por atributos', aparte: 'Aparte, por vehículo', sin_cruce: 'No se pudo cruzar' };
const PREFERRED_COLS = ['hoja', 'fila', 'trip_id', 'vehiculo', 'ruta', 'cliente', 'fecha'];

const headerName = (k) => {
  const t = k.replaceAll('_', ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function Kpi({ label, value, hint, tone = 'text-slate-100' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold mt-1 tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

function Reasons({ motivos }) {
  if (!motivos?.length) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {motivos.map((m, i) => (
        <li key={i} className="text-slate-300">{m.mensaje}</li>
      ))}
    </ul>
  );
}

function Quality({ calidad }) {
  const m = calidad.metricas || {};
  const items = [
    ['Calidad de los datos', `${num(calidad.data_quality_score)} / 100`],
    ['Confianza del análisis', `${num(calidad.analytical_confidence)} / 100`],
    ['Filas con ID de viaje', m.cobertura_id_viaje == null ? 'N/D' : pct(m.cobertura_id_viaje)],
    ['Números leídos sin error', pct(m.tasa_lectura_numerica)],
    ['Viajes cruzados con otra hoja', m.cobertura_cruce == null ? 'No aplica' : pct(m.cobertura_cruce)],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map(([k, v]) => (
        <div key={k} className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5">
          <p className="text-xs text-slate-500">{k}</p>
          <p className="text-sm font-medium text-slate-200 mt-0.5 tabular-nums">{v}</p>
        </div>
      ))}
    </div>
  );
}

function Monthly({ rows }) {
  if (!rows?.length) return null;
  const max = Math.max(...rows.map((r) => r.ingresos || 0), 1);
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="font-semibold text-slate-100 mb-3">Ingresos por mes</h3>
      <div className="flex items-end gap-2 h-36 overflow-x-auto pb-1">
        {rows.map((r) => (
          <div key={r.periodo} className="flex flex-col items-center justify-end h-full min-w-[3.25rem] flex-1"
            title={`${r.periodo}: ${money(r.ingresos)} · ${r.viajes} viajes · margen ${pct(r.margen_pct)}`}>
            <span className="text-[11px] text-slate-400 mb-1 tabular-nums">{r.margen_pct == null ? '' : pct(r.margen_pct)}</span>
            <div className="w-full bg-emerald-600/80 rounded-t" style={{ height: `${Math.max(4, ((r.ingresos || 0) / max) * 100)}%` }} />
            <span className="text-[11px] text-slate-400 mt-1">{r.periodo}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-2">Sobre cada barra: margen del mes calculado con los viajes que tienen ingreso y costo.</p>
    </section>
  );
}

function CasesTable({ cases }) {
  const cols = useMemo(() => {
    const all = new Set();
    cases.forEach((c) => Object.keys(c).forEach((k) => all.add(k)));
    const first = PREFERRED_COLS.filter((k) => all.has(k));
    return [...first, ...[...all].filter((k) => !first.includes(k))];
  }, [cases]);
  return (
    <div className="overflow-x-auto border border-slate-800 rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-slate-950 text-slate-400 text-left">
          <tr>{cols.map((c) => <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">{headerName(c)}</th>)}</tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
            <tr key={i} className="border-t border-slate-800">
              {cols.map((k) => (
                <td key={k} className="px-3 py-1.5 whitespace-nowrap tabular-nums text-slate-300">
                  {c[k] === undefined ? '' : typeof c[k] === 'number' ? (isMoneyKey(k) ? money(c[k]) : num(c[k], 2)) : String(c[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Finding({ f }) {
  const [open, setOpen] = useState(false);
  const ev = f.evidencia || {};
  return (
    <article className="bg-slate-950 border border-slate-800 rounded-xl">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="w-full text-left p-4 flex flex-wrap items-start justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">#{f.prioridad} {f.titulo}</span>
            <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_STYLE[f.severidad]}`}>Prioridad {f.severidad.toLowerCase()}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1.5">{f.causa}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-semibold tabular-nums text-slate-100">{money(f.impacto.impacto_directo)}</p>
          <p className="text-xs text-slate-500">{f.impacto.descripcion}</p>
        </div>
      </button>

      <div className="px-4 pb-4 space-y-3">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          <span>Segmento: <strong className="text-slate-200 font-medium">{ev.segmento_analizado}</strong></span>
          <span>Evidencia: <strong className="text-slate-200 font-medium">{EVIDENCE_LABEL[ev.nivel_evidencia] || ev.nivel_evidencia}</strong></span>
          <span>Afecta {num(ev.registros_afectados)} de {num(ev.registros_poblacion)} registros ({pct(ev.pct_poblacion)})</span>
          {f.vehiculos_afectados?.length > 0 && <span>Vehículos con más impacto: <strong className="text-slate-200 font-medium">{f.vehiculos_afectados.join(', ')}</strong></span>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm bg-emerald-950/20 border border-emerald-900/40 rounded-lg px-3 py-2">
          <span className="text-emerald-300"><strong>{f.accion.departamento}:</strong> {f.accion.accion}</span>
          <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_STYLE[f.accion.urgencia]}`}>Urgencia {f.accion.urgencia.toLowerCase()}</span>
        </div>
        {f.impacto.nota && <p className="text-xs text-slate-500">{f.impacto.nota}</p>}

        {open && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-slate-400">
              Método: {ev.metodo}{ev.umbral != null ? ` (umbral ${ev.umbral})` : ''}. Mostrando {f.casos.length} de {num(f.casos_total)} casos
              {f.casos_guardados < f.casos_total ? ` (se guardan los ${num(f.casos_guardados)} de mayor impacto)` : ''}. El Excel trae todos los guardados.
            </p>
            <CasesTable cases={f.casos} />
          </div>
        )}
        {!open && f.casos.length > 0 && (
          <button type="button" onClick={() => setOpen(true)} className="text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
            Ver los casos concretos
          </button>
        )}
      </div>
    </article>
  );
}

export default function Results({ audit, apiKey, onNew }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const est = ESTADO[audit.estado] || ESTADO.CON_RESERVAS;
  const fin = audit.financials;
  const cal = audit.calidad;
  const det = fin?.dineroEnRiesgoDetalle || {};
  const joins = audit.merge_report?.joins || [];

  async function download() {
    setBusy(true);
    setErr(null);
    try {
      await api.downloadAudit(apiKey, audit.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-4 ${est.box}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{est.label}</h2>
            <p className="text-xs opacity-80 mt-0.5">
              {audit.filename} · {dateTime(audit.timestamp)}{audit.reutilizado ? ' · Mismo archivo ya analizado: se muestra el resultado anterior' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {audit.estado !== 'BLOQUEADA' && (
              <button type="button" onClick={download} disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
                {busy ? 'Preparando…' : 'Descargar Excel'}
              </button>
            )}
            {onNew && (
              <button type="button" onClick={onNew} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm px-4 py-2 rounded-lg">
                Nueva auditoría
              </button>
            )}
          </div>
        </div>
        {audit.estado === 'BLOQUEADA' && (
          <p className="text-sm mt-3">No se muestran cifras porque los datos no permiten calcularlas con confianza. Corrige lo siguiente y vuelve a intentarlo:</p>
        )}
        {audit.estado !== 'OK' && <Reasons motivos={cal.motivos} />}
        {err && <p role="alert" className="text-sm text-rose-300 mt-2">{err}</p>}
      </div>

      {audit.estado !== 'BLOQUEADA' && fin && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Ingresos" value={money(fin.totalIngresos)}
              hint={`${num(fin.filasNetas)} registros${fin.duplicadosExactos ? ` (sin ${num(fin.duplicadosExactos)} copias exactas)` : ''}${fin.ivaExcluido ? ' · sin IVA' : ''}`} />
            <Kpi label="Costos" value={money(fin.totalCostos)}
              hint={fin.costosIncluidos?.length ? `Incluye: ${fin.costosIncluidos.join(', ')}` : 'No hay columnas de costos'} />
            <Kpi label="Margen" value={pct(fin.margenGlobal)} tone="text-sky-300"
              hint={fin.margenGlobal == null ? 'No se pudo calcular' : `Sobre ${num(fin.filasConMargen)} ${fin.nivelVehiculo ? 'vehículos' : 'viajes'} con ingreso y costo`} />
            <Kpi label="Dinero en riesgo" value={money(fin.dineroEnRiesgo)} tone="text-rose-300"
              hint={`Duplicados: ${money(det.sobrefacturacion_potencial)} · Pérdida directa: ${money(det.perdida_directa)}`} />
          </div>
          <Quality calidad={cal} />
        </>
      )}

      {audit.advertencias?.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-300 mb-2">Observaciones sobre los datos</h3>
          <ul className="space-y-1 text-sm text-amber-200/90 list-disc pl-5">
            {audit.advertencias.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {joins.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="font-semibold text-slate-100 mb-2">Cómo se combinaron las hojas</h3>
          <p className="text-xs text-slate-500 mb-2">Hoja base: {audit.merge_report.base}</p>
          <ul className="text-sm text-slate-300 space-y-1">
            {joins.map((j, i) => (
              <li key={i}>
                <strong className="font-medium">{j.tabla}</strong> — {MODO[j.modo] || j.modo}
                {j.pct_base_con_match != null && ` · ${pct(j.pct_base_con_match)} de los viajes tienen registro aquí`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {audit.estado !== 'BLOQUEADA' && <Monthly rows={audit.monthly} />}

      {audit.estado !== 'BLOQUEADA' && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-slate-100">Hallazgos y plan de acción</h3>
          {audit.findings.length === 0 ? (
            <p className="text-sm text-slate-400">No se encontraron hallazgos con las reglas y umbrales actuales.</p>
          ) : (
            audit.findings.map((f) => <Finding key={f.id} f={f} />)
          )}
        </section>
      )}
    </div>
  );
}