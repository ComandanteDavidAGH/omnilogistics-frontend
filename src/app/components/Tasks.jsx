'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SEVERITY_STYLE, TASK_STATUS, money } from '../lib/format';
import { ErrorBox } from './NewAudit';

function TaskRow({ task, apiKey, onChange }) {
  const [comment, setComment] = useState(task.comment || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const dirty = comment !== (task.comment || '');

  async function patch(body) {
    setSaving(true);
    setError(null);
    try {
      onChange(await api.updateTask(apiKey, task.id, body));
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{task.title}</p>
          <p className="text-sm text-slate-400 mt-1"><strong className="text-slate-300 font-medium">{task.department}:</strong> {task.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-semibold tabular-nums text-slate-100">{money(task.financial_impact)}</p>
          {task.urgency && <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_STYLE[task.urgency]}`}>Urgencia {task.urgency.toLowerCase()}</span>}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <label className="text-xs text-slate-400">
          Estado
          <select value={task.status} disabled={saving} onChange={(e) => patch({ status: e.target.value })}
            className="block mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            {Object.entries(TASK_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400 flex-1 min-w-[16rem]">
          Comentario
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={2000}
            className="block w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" />
        </label>
        {dirty && (
          <button type="button" disabled={saving} onClick={() => patch({ comment })}
            className="self-end text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg">
            Guardar comentario
          </button>
        )}
      </div>
      <ErrorBox error={error} />
    </li>
  );
}

export default function Tasks({ apiKey }) {
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.listTasks(apiKey, status));
    } catch (e) {
      setError(e);
    }
  }, [apiKey, status]);

  useEffect(() => { load(); }, [load]);

  const replace = (updated) => setData((d) => ({ ...d, items: d.items.map((t) => (t.id === updated.id ? updated : t)) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-300" htmlFor="statusFilter">Mostrar</label>
        <select id="statusFilter" value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <option value="">Todas</option>
          {Object.entries(TASK_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {data && <span className="text-xs text-slate-500">{data.total} tarea(s), de mayor a menor impacto</span>}
      </div>
      <ErrorBox error={error} />
      {data?.items.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-400">No hay tareas en este estado.</div>
      )}
      <ul className="space-y-3">
        {data?.items.map((t) => <TaskRow key={t.id} task={t} apiKey={apiKey} onChange={replace} />)}
      </ul>
    </div>
  );
}