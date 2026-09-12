'use client';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function DynamicCharts({ columns, data }) {
  // Función para extraer un título limpio sin ruido de Excel (ej: "SEMANA-CAJAS -EMBOLSE | 2025" -> "Embolse 2025")
  const cleanTitle = (rawCol) => {
    if (!rawCol) return '';
    const parts = rawCol.split('|').map(p => p.trim());
    if (parts.length > 1) {
      // Tomar los últimos dos niveles jerárquicos significativos
      return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`.replace(/columna_\d+/gi, '').trim();
    }
    return rawCol.replace(/columna_\d+/gi, '').trim();
  };

  // 1. Identificar dimensiones categóricas posibles (Eje X: Semana, Cinta, Finca, Producto, etc.)
  const dimensionCols = useMemo(() => {
    if (!columns) return [];
    return columns.filter(c => {
      const name = c.toLowerCase();
      return name.includes('semana') || name.includes('cinta') || name.includes('finca') || name.includes('producto') || name.includes('cliente') || name.includes('fecha');
    });
  }, [columns]);

  // 2. Identificar métricas numéricas acumulables (Eje Y: Embolse, Cajas, Hectáreas, Ventas)
  const metricCols = useMemo(() => {
    if (!columns || !data || data.length === 0) return [];
    return columns.filter(col => {
      if (dimensionCols.includes(col)) return false;
      return data.some(row => !isNaN(parseFloat(row[col])) && row[col] !== '-');
    });
  }, [columns, data, dimensionCols]);

  // Estado para filtros interactivos del gráfico
  const [selectedDimension, setSelectedDimension] = useState(dimensionCols[0] || columns?.[0] || '');
  const [selectedMetric, setSelectedMetric] = useState(metricCols[0] || '');

  // 3. Agrupar y Calcular Datos Dinámicos
  const chartData = useMemo(() => {
    if (!data || !selectedDimension || !selectedMetric) return [];

    const map = {};
    data.forEach(row => {
      const key = String(row[selectedDimension] || 'N/A').trim();
      if (!key || key === '-') return;

      const val = parseFloat(row[selectedMetric]);
      const numericVal = isNaN(val) ? 0 : val;

      if (!map[key]) {
        map[key] = { name: key, valor: 0, conteo: 0 };
      }
      map[key].valor += numericVal;
      map[key].conteo += 1;
    });

    // Devuelve ordenado por semana/categoría (máximo 40 ítems para legibilidad)
    return Object.values(map).slice(0, 40).map(item => ({
      name: item.name,
      [cleanTitle(selectedMetric)]: Math.round(item.valor * 100) / 100,
      promedio: Math.round((item.valor / (item.conteo || 1)) * 100) / 100
    }));
  }, [data, selectedDimension, selectedMetric]);

  if (!data || data.length === 0 || metricCols.length === 0) return null;

  const metricLabel = cleanTitle(selectedMetric || metricCols[0]);
  const dimensionLabel = cleanTitle(selectedDimension || dimensionCols[0]);

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl my-6 space-y-6">
      {/* BARRA DE FILTROS INTERACTIVOS DEL GRÁFICO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>📈</span> Analítica de Desempeño Agronómico / Logístico
          </h3>
          <p className="text-xs text-slate-400">Interactúa con los selectores para mutar las curvas de análisis</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Selector de Dimensión (Eje X) */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Agrupar por (Eje X):</label>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
            >
              {dimensionCols.map((col, idx) => (
                <option key={idx} value={col}>{cleanTitle(col)}</option>
              ))}
            </select>
          </div>

          {/* Selector de Métrica (Eje Y) */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Métrica (Eje Y):</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-blue-500"
            >
              {metricCols.map((col, idx) => (
                <option key={idx} value={col}>{cleanTitle(col)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* REJILLA DE GRÁFICOS INTERACTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Barras de Volumen Acumulado */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Volumen Total de {metricLabel} por {dimensionLabel}
            </h4>
            <p className="text-[11px] text-slate-500">Acumulado total según filtro activo</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={metricLabel} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Curva de Tendencia y Comportamiento */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Tendencia de {metricLabel}
            </h4>
            <p className="text-[11px] text-slate-500">Comportamiento continuo entre periodos</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }} />
                <Area type="monotone" dataKey={metricLabel} stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}