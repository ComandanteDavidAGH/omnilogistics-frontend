'use client';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function DynamicCharts({ columns, data, yearA, yearB }) {
  const getBaseName = (rawCol) => {
    if (!rawCol) return '';
    const lower = rawCol.toLowerCase();
    
    if (lower.includes('semana')) return 'Semana';
    if (lower.includes('cinta')) return 'Cinta';
    if (lower.includes('resiembra')) return 'Resiembras';
    if (lower.includes('lluvia')) return 'Lluvias';
    if (lower.includes('manos')) return 'Manos';
    if (lower.includes('embolse')) return 'Embolse';
    if (lower.includes('hectárea') || lower.includes('hectarea')) return 'Hectáreas';

    let clean = rawCol.split('|').map(p => p.trim()).filter(p => !/^\d{4}$/.test(p)).join(' ');
    clean = clean
      .replace(/columna_\d+/gi, '')
      .replace(/\b20\d{2}\b/g, '')
      .replace(/-/g, ' ')
      .replace(/\s*[|._-]?\s*\b\d+\b\s*$/g, '') 
      .replace(/\s+/g, ' ')
      .trim();
      
    return clean || rawCol.trim();
  };

  const dimensionCols = useMemo(() => {
    if (!columns) return [];
    return columns.filter(c => {
      const name = c.toLowerCase();
      return name.includes('semana') || name.includes('cinta') || name.includes('finca') || name.includes('fecha');
    });
  }, [columns]);

  const baseMetrics = useMemo(() => {
    if (!columns || !data) return [];
    const metrics = new Set();
    columns.forEach(col => {
      if (dimensionCols.includes(col)) return;
      const isNumeric = data.some(row => !isNaN(parseFloat(row[col])) && row[col] !== '-');
      if (isNumeric) metrics.add(getBaseName(col));
    });
    return Array.from(metrics).filter(m => m !== '');
  }, [columns, data, dimensionCols]);

  const [selectedDimension, setSelectedDimension] = useState(dimensionCols[0] || columns?.[0] || '');
  const [metricChart1, setMetricChart1] = useState(baseMetrics[0] || '');
  const [metricChart2, setMetricChart2] = useState(baseMetrics[1] || baseMetrics[0] || '');
  const [chart1Type, setChart1Type] = useState('line'); // 'line' | 'bar'
  const [chart2Type, setChart2Type] = useState('bar');  // 'line' | 'bar'

  // Mapeo dinámico de columnas por año para Métrica 1 y Métrica 2
  const getColsForMetric = (metricName) => {
    if (!metricName || !columns) return { colA: null, colB: null };
    const matching = columns.filter(col => getBaseName(col) === metricName);
    let colA = null, colB = null;
    matching.forEach(col => {
      if (col.includes(yearA)) colA = col;
      if (col.includes(yearB)) colB = col;
    });
    if (!colA && matching.length > 0) colA = matching[0];
    if (!colB && matching.length > 1) colB = matching[1];
    return { colA, colB };
  };

  const m1Cols = useMemo(() => getColsForMetric(metricChart1), [columns, metricChart1, yearA, yearB]);
  const m2Cols = useMemo(() => getColsForMetric(metricChart2), [columns, metricChart2, yearA, yearB]);

  const chartData = useMemo(() => {
    if (!data || !selectedDimension) return [];
    const map = {};

    data.forEach(row => {
      const key = String(row[selectedDimension] || 'N/A').trim();
      if (!key || key === '-') return;
      if (!map[key]) map[key] = { name: key, m1_A: 0, m1_B: 0, m2_A: 0, m2_B: 0 };

      if (m1Cols.colA) { const v = parseFloat(row[m1Cols.colA]); if (!isNaN(v)) map[key].m1_A += v; }
      if (m1Cols.colB) { const v = parseFloat(row[m1Cols.colB]); if (!isNaN(v)) map[key].m1_B += v; }
      if (m2Cols.colA) { const v = parseFloat(row[m2Cols.colA]); if (!isNaN(v)) map[key].m2_A += v; }
      if (m2Cols.colB) { const v = parseFloat(row[m2Cols.colB]); if (!isNaN(v)) map[key].m2_B += v; }
    });

    return Object.values(map).slice(0, 40).map(item => ({
      name: item.name,
      [`${yearA}_m1`]: Math.round(item.m1_A * 100) / 100,
      [`${yearB}_m1`]: Math.round(item.m1_B * 100) / 100,
      [`${yearA}_m2`]: Math.round(item.m2_A * 100) / 100,
      [`${yearB}_m2`]: Math.round(item.m2_B * 100) / 100,
    }));
  }, [data, selectedDimension, m1Cols, m2Cols, yearA, yearB]);

  if (!data || data.length === 0 || baseMetrics.length === 0) return null;

  const tooltipStyle = { backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' };
  const tooltipItemStyle = { color: '#f8fafc', fontWeight: 'bold' };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl my-6 space-y-6">
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>⚡</span> Tablero Analítico Multivariable Interanual
          </h3>
          <p className="text-xs text-slate-400">Compara dos métricas independientes de forma simultánea</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold uppercase text-slate-400">Agrupar Eje X:</label>
          <select
            value={selectedDimension}
            onChange={(e) => setSelectedDimension(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-100 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-blue-500"
          >
            {dimensionCols.map((col, idx) => (
              <option key={idx} value={col}>{getBaseName(col)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* REJILLA DE GRÁFICOS INDEPENDIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICO 1: MÉTRICA A */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-400 font-bold">Métrica 1:</span>
              <select
                value={metricChart1}
                onChange={(e) => setMetricChart1(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded px-2 py-1 outline-none"
              >
                {baseMetrics.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setChart1Type(chart1Type === 'line' ? 'bar' : 'line')}
              className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-300 font-semibold"
            >
              {chart1Type === 'line' ? '📈 Líneas' : '📊 Barras'}
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chart1Type === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line name={`${metricChart1} (${yearA})`} type="monotone" dataKey={`${yearA}_m1`} stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} />
                  <Line name={`${metricChart1} (${yearB})`} type="monotone" dataKey={`${yearB}_m1`} stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar name={`${metricChart1} (${yearA})`} dataKey={`${yearA}_m1`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar name={`${metricChart1} (${yearB})`} dataKey={`${yearB}_m1`} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: MÉTRICA B (CRUZADA) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold">Métrica 2 (Cruze):</span>
              <select
                value={metricChart2}
                onChange={(e) => setMetricChart2(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded px-2 py-1 outline-none"
              >
                {baseMetrics.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setChart2Type(chart2Type === 'line' ? 'bar' : 'line')}
              className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-1 rounded text-slate-300 font-semibold"
            >
              {chart2Type === 'line' ? '📈 Líneas' : '📊 Barras'}
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chart2Type === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar name={`${metricChart2} (${yearA})`} dataKey={`${yearA}_m2`} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar name={`${metricChart2} (${yearB})`} dataKey={`${yearB}_m2`} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line name={`${metricChart2} (${yearA})`} type="monotone" dataKey={`${yearA}_m2`} stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                  <Line name={`${metricChart2} (${yearB})`} type="monotone" dataKey={`${yearB}_m2`} stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}