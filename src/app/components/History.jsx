'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function History({ apiKey }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listAudits(apiKey)
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [apiKey]);

  if (loading) return <div className="p-4 text-slate-400 text-sm">Cargando historial de auditorías...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Historial de Auditorías</h2>
      {records.length === 0 ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-sm text-slate-400">
          No hay registros de auditoría disponibles.
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r, i) => (
            <div key={r.id || i} className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-sm flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">{r.name || `Auditoría #${r.id || i + 1}`}</div>
                <div className="text-xs text-slate-400">{r.created_at || 'Fecha no especificada'}</div>
              </div>
              <span className="px-3 py-1 bg-emerald-950 text-emerald-400 text-xs rounded-full border border-emerald-800">Completado</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}