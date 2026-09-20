'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import DynamicCharts from './DynamicCharts.js';

export default function History({ apiKey }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        // Consultamos los registros reales guardados en Render/SQL
        const realAudits = await api.listAudits(apiKey);
        setAudits(realAudits || []);
      } catch (err) {
        console.error('Error al cargar historial:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [apiKey]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400">
        ⏳ Cargando historial de auditorías desde el servidor...
      </div>
    );
  }

  if (!audits || audits.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center">
        <h3 className="text-xl font-bold text-white mb-2">No hay auditorías registradas</h3>
        <p className="text-slate-400 text-sm">
          Ejecuta tu primera auditoría en la pestaña "Nueva Auditoría" para ver los resultados reflejados aquí.
        </p>
      </div>
    );
  }

  // Transformamos los registros reales de SQL en el formato que le gusta a los gráficos
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
            Se encontraron <strong className="text-emerald-400">{audits.length}</strong> auditorías procesadas en la base de datos.
          </p>
        </div>
      </div>

      {/* Renderizado de gráficos con datos extraídos de Render */}
      <DynamicCharts 
        columns={chartColumns} 
        data={chartData} 
        yearA="2025" 
        yearB="2026" 
      />
    </div>
  );
}