'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DynamicCharts from './DynamicCharts.js';

export default function History({ apiKey }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Clave administrativa activa
  const effectiveKey = apiKey || 'sk_admin_genesis_2026_x99';

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      // 1. Consultar con la clave activa
      let realAudits = await api.listAudits(effectiveKey);
      
      // 2. Si no encuentra nada, intentar con el Tenant por defecto (malla de seguridad)
      if (!realAudits || realAudits.length === 0) {
        const fallbackAudits = await api.listAudits('DEFAULT_TENANT');
        if (fallbackAudits && fallbackAudits.length > 0) {
          realAudits = fallbackAudits;
        }
      }

      setAudits(realAudits || []);
    } catch (err) {
      console.error('Error al cargar historial:', err);
      setErrorMsg(err.message || 'Error al conectar con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400">
        ⏳ Cargando historial de auditorías desde la base de datos...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-slate-900 border border-rose-900/50 p-6 rounded-xl text-center">
        <h3 className="text-rose-400 font-bold mb-2">⚠️ Error al consultar historial</h3>
        <p className="text-slate-400 text-sm mb-4">{errorMsg}</p>
        <button onClick={fetchHistory} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-bold">
          🔄 Reintentar conexión
        </button>
      </div>
    );
  }

  if (!audits || audits.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center">
        <h3 className="text-xl font-bold text-white mb-2">No se encontraron auditorías registradas</h3>
        <p className="text-slate-400 text-sm mb-6">
          Si acabas de procesar un archivo, presiona el botón para actualizar la consulta.
        </p>
        <button onClick={fetchHistory} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-bold transition-colors shadow-lg">
          🔄 Refrescar Historial
        </button>
      </div>
    );
  }

  // Mapeo de resultados para el motor gráfico
  const chartColumns = ['AUDITORIA', 'TOTAL_INGRESOS', 'TOTAL_COSTOS', 'DINERO_EN_RIESGO'];
  const chartData = audits.map((a) => ({
    AUDITORIA: `AUD-${a.id} (${a.filename ? a.filename.substring(0, 12) : 'Archivo'})`,
    TOTAL_INGRESOS: a.financial_results?.totalIngresos || 0,
    TOTAL_COSTOS: a.financial_results?.totalCostos || 0,
    DINERO_EN_RIESGO: a.financial_results?.dineroEnRiesgo || 0,
    CALIDAD_DATOS: a.quality_score || 0
  }));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Historial de Auditorías Reales</h2>
          <p className="text-slate-400 text-sm">
            Se encontraron <strong className="text-emerald-400">{audits.length}</strong> auditorías procesadas en la base de datos SQL.
          </p>
        </div>
        <button onClick={fetchHistory} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-2">
          <span>🔄</span> Actualizar
        </button>
      </div>

      <DynamicCharts 
        columns={chartColumns} 
        data={chartData} 
        yearA="2025" 
        yearB="2026" 
      />
    </div>
  );
}