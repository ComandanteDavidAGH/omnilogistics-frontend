'use client';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function DynamicCharts({ columns, data, yearA, yearB }) {
  // Limpiador semántico universal para nombres de variables
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

    let parts = rawCol.split('|').map(p => p.trim());
    parts = parts.filter(p => !/^\d{4}$/.test(p));
    let clean = parts.join(' ').replace(/columna_\d+/gi, '').trim();
    clean = clean.replace(/\b20\d{2}\b/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    return clean || 'Métrica';
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
      if (isNumeric) {
        metrics.add(getBaseName(col));
      }
    });
    return Array.from(metrics).filter(m => m !== '');
  }, [columns, data, dimensionCols]);

  const [selectedDimension, setSelectedDimension] = useState(dimensionCols[0] || columns?.[0] || '');
  const [selectedBaseMetric, setSelectedBaseMetric] = useState(baseMetrics[0] || '');

  const { colYearA, colYearB } = useMemo(() => {
    let colA = null, colB = null;
    if (!selectedBaseMetric || !columns) return { colYearA: null, colYearB: null };

    columns.forEach(col => {
      if (getBaseName(col) === selectedBaseMetric) {
        if (col.includes(yearA)) colA = col;
        if (col.includes(yearB)) colB = col;
        if (!col.includes(yearA) && !col.includes(yearB) && !colA) colA = col;
      }
    });
    return { colYearA: colA, colYearB: colB };
  }, [columns, selectedBaseMetric, yearA, yearB]);

  const chartData = useMemo(() => {
    if (!data || !selectedDimension) return [];
    const map = {};

    data.forEach(row => {
      const key = String(row[selectedDimension] || 'N/A').trim();
      if (!key || key === '-') return;

      if (!map[key]) map[key] = { name: key, valA: 0, valB: 0 };

      if (colYearA) {
        const v = parseFloat(row[colYearA]);
        if (!isNaN(v)) map[key].valA += v;
      }
      if (colYearB) {
        const v = parseFloat(row[colYearB]);
        if (!isNaN(v)) map[key].valB += v;
      }
    });

    return Object.values(map).slice(0, 40).map(item => ({
      name: item.name,
      [yearA]: Math.round(item.valA * 100) / 100,
      [yearB]: Math.round(item.valB * 100) / 100
    }));
  }, [data, selectedDimension, colYearA, colYearB, yearA, yearB]);

  if (!data || data.length === 0 || baseMetrics.length === 0) return null;

  const dimLabel = getBaseName(selectedDimension).toUpperCase();
  const metLabel = selectedBaseMetric.toUpperCase();

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl my-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>📊</span> Comparativa Interanual: {yearA} vs {yearB}
          </h3>
          <p className="text-xs text-slate-400">Analítica gerencial depurada</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Dimensión (Eje X):</label>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none"
            >
              {dimensionCols.map((col, idx) => (
                <option key={idx} value={col}>{getBaseName(col)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Variable (Eje Y):</label>
            <select
              value={selectedBaseMetric}
              onChange={(e) => setSelectedBaseMetric(e.target.value)}
              className="bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 font-bold text-xs rounded-lg px-3 py-1.5 outline-none"
            >
              {baseMetrics.map((met, idx) => (
                <option key={idx} value={met}>{met}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="mb-3 text-center">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {metLabel} POR {dimLabel}
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                {colYearA && <Bar dataKey={yearA} fill="#3b82f6" radius={[4, 4, 0, 0]} />}
                {colYearB && <Bar dataKey={yearB} fill="#10b981" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="mb-3 text-center">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              TENDENCIA DE {metLabel}
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                {colYearA && <Area type="monotone" dataKey={yearA} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />}
                {colYearB && <Area type="monotone" dataKey={yearB} stroke="#10b981" fill="#10b981" fillOpacity={0.1} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}