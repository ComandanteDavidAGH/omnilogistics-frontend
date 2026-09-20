'use client';
import { useState } from 'react';
import { api } from '../lib/api';
import MappingReview from './MappingReview';

export default function NewAudit({ apiKey }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [iaData, setIaData] = useState(null);

  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStart = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.understand(apiKey, file);
      setIaData(res);
    } catch (err) {
      alert('Error al analizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (mapping) => {
    setLoading(true);
    try {
      await api.createAudit(apiKey, file, mapping);
      alert('¡Auditoría procesada con éxito!');
      setIaData(null);
      setFile(null);
    } catch (err) {
      alert('Error al procesar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (iaData) {
    return (
      <MappingReview 
        data={iaData} 
        onConfirm={handleConfirm} 
        onCancel={() => { setIaData(null); setFile(null); }} 
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-white mb-6">Nueva Auditoría</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              SELECCIONAR ARCHIVO EXCEL / CSV
            </label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg">
                <span>Seleccionar archivo</span>
                <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFile} />
              </label>
              <span className="text-sm text-slate-400">
                {file ? file.name : 'Ningún archivo seleccionado'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleStart} 
            disabled={!file || loading}
            className="w-full py-3 px-4 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 disabled:bg-slate-800 text-emerald-400 disabled:text-slate-500 font-bold rounded-lg text-sm transition-colors border border-emerald-800/50 shadow-inner"
          >
            {loading ? '⏳ Analizando archivo con IA (Puede tardar unos segundos)...' : 'Comenzar Auditoría'}
          </button>
        </div>
      </div>
    </div>
  );
}