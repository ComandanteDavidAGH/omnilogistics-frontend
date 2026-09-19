'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Tasks({ apiKey }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listTasks(apiKey)
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [apiKey]);

  if (loading) return <div className="p-4 text-slate-400 text-sm">Cargando tareas...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Tareas de Acción</h2>
      {tasks.length === 0 ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-sm text-slate-400">
          No hay tareas pendientes asignadas.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t, i) => (
            <div key={t.id || i} className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-sm flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">{t.title || `Tarea #${t.id || i + 1}`}</div>
                <div className="text-xs text-slate-400">{t.description || 'Sin descripción'}</div>
              </div>
              <span className="px-3 py-1 text-xs rounded-full bg-slate-800 text-slate-300 border border-slate-700">{t.status || 'Pendiente'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}