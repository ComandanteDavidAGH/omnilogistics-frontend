'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ESTADO, dateTime, money, pct } from '../lib/format';
import { ErrorBox } from './NewAudit';
import Results from './Results';

export default function History({ apiKey }) {
  const [items, setItems] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems((await api.listAudits(apiKey)).items);
    } catch (e) {
      setError(e);
    }
  }, [apiKey]);

  useEffect(() => { load(); }, [load]);

  async function open(id) {
    setError(null);
    try {
      setSelected(await api.getAudit(apiKey, id));
    } catch (e) {
      setError(e);
    }
  }

  async function remove(id) {
    if (!window.confirm('Se eliminará esta auditoría, sus hallazgos y sus tareas. ¿Continuar?')) return;
    try {
      await api.deleteAudit(apiKey, id);
      setSelected(null);
      load();
    } catch (e) {
      setError(e);
    }
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-300 hover:text-white underline underline-offset-2">← Volver al historial</button>
          <button type="button" onClick={() => remove(selected.id)} className="text-sm text-rose-400 hover:text-rose-300 underline underline-offset-2">Eliminar esta auditoría</button>
        </div>
        <Results audit={selected} apiKey={apiKey} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ErrorBox error={error} />
      {items === null && !error && <p className="text-sm text-slate-400">Cargando…</p>}
      {items?.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-400">
          Aún no hay auditorías. Sube tu primer archivo en «Nueva auditoría».
        </div>
      )}
      {items?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Archivo</th>
                <th className="px-3 py-2.5 font-medium">Fecha</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5 font-medium text-right">Margen</th>
                <th className="px-3 py-2.5 font-medium text-right">Dinero en riesgo</th>
                <th className="px-3 py-2.5 font-medium text-right">Hallazgos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={() => open(a.id)} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 text-left">{a.filename}</button>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{dateTime(a.timestamp)}</td>
                  <td className="px-3 py-2.5 text-slate-300">{(ESTADO[a.estado] || {}).label || a.estado}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{pct(a.margenGlobal)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(a.dineroEnRiesgo)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{a.totalHallazgos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}