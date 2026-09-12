'use client';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';

export default function DynamicCharts({ columns, data, yearA, yearB }) {
  const [isOpenMetrics, setIsOpenMetrics] = useState(false);

  // Limpiador agresivo (Destruye los sufijos " 1" de Pandas)
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
  const [selectedMetric, setSelectedMetric] = useState(baseMetrics[0] || '');

  // Conexión Inteligente de Años
  const { colYearA, colYearB } = useMemo(() => {
    if (!selectedMetric || !columns) return { colYearA: null, colYearB: null };
    const matchingCols = columns.filter(col => getBaseName(col) === selectedMetric);
    
    let colA = null, colB = null;
    let foundByYear = false;

    matchingCols.forEach(col => {
      if (col.includes(yearA)) { colA = col; foundByYear = true; }
      if (col.includes(yearB)) { colB = col; foundByYear = true; }
    });

    if (!foundByYear && matchingCols.length > 0) {
      colA = matchingCols[0];
      if (matchingCols.length > 1) colB = matchingCols[1];
    }
    return { colYearA: colA, colYearB: colB };
  }, [columns, selectedMetric, yearA, yearB]);

  const isInterannualMode = Boolean(colYearA && colYearB && colYearA !== colYearB);
  const secondaryMetric = baseMetrics.find(m => m !== selectedMetric) || null;
  const isMultiMetricMode = Boolean(!isInterannualMode && secondaryMetric);

  // Procesamiento Matemático del Motor
  const chartData = useMemo(() => {
    if (!data || !selectedDimension) return [];
    const map = {};

    data.forEach(row => {
      const key = String(row[selectedDimension] || 'N/A').trim();
      if (!key || key === '-') return;
      if (!map[key]) map[key] = { name: key, valA: 0, valB: 0, valSecondary: 0 };

      if (colYearA) {
        const v = parseFloat(row[colYearA]);
        if (!isNaN(v)) map[key].valA += v;
      }
      if (colYearB) {
        const v = parseFloat(row[colYearB]);
        if (!isNaN(v)) map[key].valB += v;
      }
      if (isMultiMetricMode) {
        const colSec = columns.find(c => getBaseName(c) === secondaryMetric);
        if (colSec) {
          const vSec = parseFloat(row[colSec]);
          if (!isNaN(vSec)) map[key].valSecondary += vSec;
        }
      }
    });

    return Object.values(map).slice(0, 40).map(item => {
      const vA = Math.round(item.valA * 100) / 100;
      const vB = Math.round(item.valB * 100) / 100;
      const vSec = Math.round(item.valSecondary * 100) / 100;

      return {
        name: item.name,
        [yearA]: vA,
        [yearB]: vB,
        [selectedMetric]: vA,
        [secondaryMetric || 'Métrica 2']: vSec,
        'Variación Neta': Math.round((vB - vA) * 100) / 100 // LA MAGIA DEL BALANCE
      };
    });
  }, [data, selectedDimension, colYearA, colYearB, yearA, yearB, isMultiMetricMode, secondaryMetric, selectedMetric, columns]);

  if (!data || data.length === 0 || baseMetrics.length === 0) return null;

  const dimLabel = getBaseName(selectedDimension).toUpperCase();
  const metLabel = selectedMetric.toUpperCase();
  const showSecondChart = isInterannualMode || isMultiMetricMode;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl my-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>📊</span> Tablero de Inteligencia {isInterannualMode ? `(${yearA} vs ${yearB})` : ''}
          </h3>
          <p className="text-xs text-slate-400">
            {isInterannualMode ? "Modo Ultra: Tendencia Histórica vs. Balance Neto" : "Modo Básico"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Eje X (Agrupar por):</label>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-100 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-blue-500 shadow-inner"
            >
              {dimensionCols.map((col, idx) => (
                <option key={idx} value={col} className="bg-slate-900 text-slate-100 py-1">
                  {getBaseName(col)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col relative">
            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Variable Activa (Eje Y):</label>
            <button
              onClick={() => setIsOpenMetrics(!isOpenMetrics)}
              className="bg-slate-950 border border-slate-700 text-emerald-400 font-bold text-xs rounded-lg px-4 py-2 flex items-center justify-between gap-2 min-w-[200px] shadow-inner"
            >
              <span className="truncate max-w-[180px] text-left">{selectedMetric}</span>
              <span className="text-[10px] text-slate-400">{isOpenMetrics ? '▲' : '▼'}</span>
            </button>

            {isOpenMetrics && (
              <div className="absolute top-14 right-0 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 w-72 max-h-60 overflow-y-auto space-y-1">
                {baseMetrics.map((met, idx) => (
                  <label
                    key={idx}
                    className="flex items-center space-x-3 px-3 py-2 hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-medium text-slate-200 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMetric === met}
                      onChange={() => {
                        setSelectedMetric(met);
                        setIsOpenMetrics(false);
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-blue-500 cursor-pointer"
                    />
                    <span className="truncate">{met}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${showSecondChart ? 'lg:grid-cols-2' : ''} gap-6`}>
        
        {/* GRÁFICO 1: TENDENCIA EN LÍNEAS (Para Interanual) o BARRAS (Para simple) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="mb-3 text-center">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate px-2">
              {isInterannualMode ? `TENDENCIA: ${metLabel}` : `VOLUMEN: ${metLabel}`}
            </h4>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {isInterannualMode ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                  <Line type="monotone" dataKey={yearA} stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', stroke: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey={yearB} stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981', stroke: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                  <Bar dataKey={selectedMetric} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: BALANCE NETO CON COLORES INTELIGENTES (Verde/Rojo) */}
        {showSecondChart && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="mb-3 text-center">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate px-2">
                {isInterannualMode 
                  ? `BALANCE NETO: ${yearB} VS ${yearA}`
                  : `TENDENCIA: ${(secondaryMetric || '').toUpperCase()}`}
              </h4>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {isInterannualMode ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    {/* MAGIA VERDE/ROJO: Si la diferencia es positiva, verde. Si perdimos, rojo */}
                    <Bar dataKey="Variación Neta" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry['Variación Neta'] >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                    <Line type="monotone" dataKey={secondaryMetric} stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b', stroke: '#1e293b', strokeWidth: 2 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}