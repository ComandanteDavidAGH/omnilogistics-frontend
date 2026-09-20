'use client';
import { pct } from '../lib/format';

export const keyOf = (sheet, col) => JSON.stringify([sheet, col]);

// Construye las decisiones iniciales a partir del análisis del servidor.
export function initialDecisions(analysis) {
  const d = {};
  for (const [sheet, a] of Object.entries(analysis.sheets_analysis)) {
    d[sheet] = {};
    for (const [col, m] of Object.entries(a.fields_mapping)) d[sheet][col] = m.canonical;
    for (const amb of a.ambiguities) d[sheet][amb.original_column] = amb.requires_decision ? amb.possible_match : 'UNKNOWN';
  }
  return d;
}

// Campos asignados a más de una columna dentro de la misma hoja.
export function findDuplicates(decisions) {
  const dups = {};
  for (const [sheet, cols] of Object.entries(decisions)) {
    const seen = {};
    for (const canonical of Object.values(cols)) {
      if (canonical && canonical !== 'UNKNOWN') seen[canonical] = (seen[canonical] || 0) + 1;
    }
    dups[sheet] = new Set(Object.keys(seen).filter((c) => seen[c] > 1));
  }
  return dups;
}

function buildRows(a) {
  const rows = [];
  for (const [col, m] of Object.entries(a.fields_mapping)) {
    rows.push({
      col, type: m.detected_type, samples: m.sample_values || [],
      kind: m.source === 'memoria' ? 'memoria' : 'auto', confidence: m.confidence,
    });
  }
  for (const amb of a.ambiguities) {
    rows.push({
      col: amb.original_column, type: amb.detected_type, samples: amb.sample_values || [],
      kind: amb.requires_decision ? 'confirmar' : 'ignorada', confidence: amb.confidence,
      note: amb.note, collision: amb.collision_warning,
    });
  }
  const order = { confirmar: 0, auto: 1, memoria: 1, ignorada: 2 };
  return rows.sort((x, y) => order[x.kind] - order[y.kind]);
}

const BADGE = {
  auto: ['Detectada', 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'],
  memoria: ['Recordada', 'bg-blue-950/40 text-blue-300 border-blue-800/50'],
  confirmar: ['Confirma esta', 'bg-amber-950/40 text-amber-300 border-amber-800/50'],
  confirmada: ['Confirmada', 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'],
  ignorada: ['Se ignora', 'bg-slate-800 text-slate-400 border-slate-700'],
};

export default function MappingReview({ analysis, decisions, setDecisions, confirmed, setConfirmed, duplicates }) {
  const fields = analysis.canonical_fields;

  const confirm = (sheet, col) => setConfirmed((prev) => new Set(prev).add(keyOf(sheet, col)));
  const setValue = (sheet, col, value) => {
    setDecisions((prev) => ({ ...prev, [sheet]: { ...prev[sheet], [col]: value } }));
    confirm(sheet, col);
  };

  return (
    <div className="space-y-5">
      {Object.entries(analysis.sheets_analysis).map(([sheet, a]) => (
        <section key={sheet} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="font-semibold text-slate-100">Hoja «{sheet}»</h3>
            <span className="text-xs text-slate-400">
              {a.records.toLocaleString('es-CO')} filas · encabezados en la fila {a.header_row + 1}
            </span>
            {a.from_memory && <span className="text-xs text-blue-300">Formato reconocido de un archivo anterior</span>}
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Columna del archivo</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2 font-medium">Significa</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {buildRows(a).map((r) => {
                  const value = decisions[sheet]?.[r.col] ?? 'UNKNOWN';
                  const isConfirmed = confirmed.has(keyOf(sheet, r.col));
                  const needs = r.kind === 'confirmar' && !isConfirmed;
                  const dup = duplicates[sheet]?.has(value);
                  let badge;
                  if (needs) badge = BADGE.confirmar;
                  else if (value === 'UNKNOWN') badge = BADGE.ignorada;
                  else if (r.kind === 'memoria') badge = BADGE.memoria;
                  else if (r.kind === 'auto') badge = BADGE.auto;
                  else badge = BADGE.confirmada;
                  const [badgeText, badgeCls] = badge;
                  return (
                    <tr key={r.col} className="border-t border-slate-800 align-top">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-200">{r.col}</div>
                        <div className="text-xs text-slate-500 max-w-xs truncate">
                          {r.samples.length ? `Ej.: ${r.samples.join(' · ')}` : 'Sin valores'}
                        </div>
                        {r.note && <div className="text-xs text-slate-500 mt-0.5">{r.note}</div>}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded border ${badgeCls}`}>{badgeText}</span>
                        {(r.kind === 'auto' || needs) && (
                          <span className="text-xs text-slate-500 ml-2">{pct(r.confidence * 100)}</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <select
                          aria-label={`Significado de la columna ${r.col}`}
                          value={value}
                          onChange={(e) => setValue(sheet, r.col, e.target.value)}
                          className={`bg-slate-950 border rounded-lg px-2 py-1.5 text-sm w-56 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${dup ? 'border-rose-600' : 'border-slate-700'}`}
                        >
                          <option value="UNKNOWN">No usar esta columna</option>
                          {fields.map((f) => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </select>
                        {dup && <div role="alert" className="text-xs text-rose-400 mt-1">Ya asignaste este campo a otra columna.</div>}
                      </td>
                      <td className="px-2 py-2.5">
                        {needs && (
                          <button type="button" onClick={() => confirm(sheet, r.col)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-1.5">
                            Confirmar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}