'use client';

import { useState } from 'react';
import { api } from '../lib/api.js';

export default function NewAudit({ apiKey }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.understand(apiKey, file);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Nueva Auditoría</h2>
      <form onSubmit={handleUpload} className="space-y-4 max-w-xl bg-slate-900 p-6 border border-slate-800 rounded-xl">
        <div>
          <label htmlFor="auditFileInput" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Seleccionar archivo Excel / CSV
          </label>
          <input
            id="auditFileInput"
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
          />
        </div>

        {error && <div className="p-3 bg-rose-950/50 border border-rose-800 text-xs text-rose-300 rounded-lg">{error}</div>}

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg"
        >
          {loading ? 'Analizando archivo...' : 'Comenzar Auditoría'}
        </button>
      </form>

      {result && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <h3 className="font-bold text-emerald-400 text-sm">Resultado del Análisis</h3>
          <pre className="text-xs text-slate-300 overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}