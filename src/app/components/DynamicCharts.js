'use client';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

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
  const [chart1Type, setChart1Type] = useState('area'); 
  const [chart2Type, setChart2Type] = useState('bar');

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

  const dimLabel = getBaseName(selectedDimension);

  // 🧠 MOTOR DE IA: GENERADOR DE OBSERVACIONES EJECUTIVAS
  const aiInsights = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    let totalM1_A = 0, totalM1_B = 0;
    let maxM1_B = { name: '', val: -Infinity };
    let maxM2_B = { name: '', val: -Infinity };

    chartData.forEach(d => {
      const vM1_A = d[`${yearA}_m1`] || 0;
      const vM1_B = d[`${yearB}_m1`] || 0;
      const vM2_B = d[`${yearB}_m2`] || 0;

      totalM1_A += vM1_A;
      totalM1_B += vM1_B;

      if (vM1_B > maxM1_B.val) maxM1_B = { name: d.name, val: vM1_B };
      if (vM2_B > maxM2_B.val) maxM2_B = { name: d.name, val: vM2_B };
    });

    const insights = [];
    
    // 1. Rendimiento Global
    const diff = totalM1_B - totalM1_A;
    const pct = totalM1_A > 0 ? ((diff / totalM1_A) * 100).toFixed(1) : 0;
    const trend = diff >= 0 ? 'crecimiento al alza' : 'caída operativa';
    const color = diff >= 0 ? 'text-emerald-400' : 'text-red-400';
    
    if (totalM1_A > 0) {
      insights.push(
        <span key="1">📊 <strong>Rendimiento {metricChart1}:</strong> El acumulado en {yearB} muestra un <span className={`${color} font-bold`}>{trend} del {Math.abs(pct)}%</span> en comparación con {yearA}.</span>
      );
    }

    // 2. Punto Crítico Métrica 1
    if (maxM1_B.name) {
      insights.push(
        <span key="2">🎯 <strong>Pico de {metricChart1}:</strong> La máxima intensidad registrada en {yearB} ocurrió en la {dimLabel} <strong>{maxM1_B.name}</strong> ({maxM1_B.val.toLocaleString()}).</span>
      );
    }

    // 3. Inferencia de Cruce Estratégico (Métrica 1 vs Métrica 2)
    if (maxM2_B.name && metricChart1 !== metricChart2) {
      insights.push(
        <span key="3">💡 <strong>Alerta de Correlación:</strong> Se detectó un evento extremo de <strong>{metricChart2}</strong> en la {dimLabel} <strong>{maxM2_B.name}</strong>. Se recomienda a Gerencia evaluar si esto provocó un impacto en {metricChart1} durante esa semana o las inmediatamente posteriores.</span>
      );
    }

    return insights;
  }, [chartData, metricChart1, metricChart2, yearA, yearB, dimLabel]);

  if (!data || data.length === 0 || baseMetrics.length === 0) return null;

  const tooltipStyle = { backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' };
  const tooltipItemStyle = { color: '#f8fafc', fontWeight: 'bold' };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl my-6 space-y-6">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-500">⚡</span> Tablero Analítico Multivariable Interanual
          </h3>
          <p className="text-xs text-slate-400">Motor de cruce de datos con IA heurística integrada</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800 shadow-inner">
          <label className="text-[10px] font-bold uppercase text-slate-400">Agrupar Eje X:</label>
          <select
            value={selectedDimension}
            onChange={(e) => setSelectedDimension(e.target.value)}
            className="bg-transparent text-emerald-400 text-xs font-bold outline-none cursor-pointer"
          >
            {dimensionCols.map((col, idx) => (
              <option key={idx} value={col} className="bg-slate-900">{getBaseName(col)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GRÁFICOS DUALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRÁFICO 1: MÉTRICA A */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-400 font-bold uppercase">Métrica 1:</span>
              <select
                value={metricChart1}
                onChange={(e) => setMetricChart1(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded px-2 py-1 outline-none cursor-pointer"
              >
                {baseMetrics.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setChart1Type(chart1Type === 'area' ? 'bar' : 'area')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 font-bold transition-all"
            >
              {chart1Type === 'area' ? '🌊 Cambiar a Barras' : '📊 Cambiar a Áreas'}
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chart1Type === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorM1A" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorM1B" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area name={`${metricChart1} (${yearA})`} type="monotone" dataKey={`${yearA}_m1`} stroke="#3b82f6" fillOpacity={1} fill="url(#colorM1A)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area name={`${metricChart1} (${yearB})`} type="monotone" dataKey={`${yearB}_m1`} stroke="#10b981" fillOpacity={1} fill="url(#colorM1B)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
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
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold uppercase">Métrica 2 (Cruce):</span>
              <select
                value={metricChart2}
                onChange={(e) => setMetricChart2(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded px-2 py-1 outline-none cursor-pointer"
              >
                {baseMetrics.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setChart2Type(chart2Type === 'area' ? 'bar' : 'area')}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-md text-slate-200 font-bold transition-all"
            >
              {chart2Type === 'area' ? '🌊 Cambiar a Barras' : '📊 Cambiar a Áreas'}
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chart2Type === 'bar' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar name={`${metricChart2} (${yearA})`} dataKey={`${yearA}_m2`} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar name={`${metricChart2} (${yearB})`} dataKey={`${yearB}_m2`} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorM2A" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorM2B" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area name={`${metricChart2} (${yearA})`} type="monotone" dataKey={`${yearA}_m2`} stroke="#f59e0b" fillOpacity={1} fill="url(#colorM2A)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Area name={`${metricChart2} (${yearB})`} type="monotone" dataKey={`${yearB}_m2`} stroke="#8b5cf6" fillOpacity={1} fill="url(#colorM2B)" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🧠 PANEL DE INTELIGENCIA DE NEGOCIO (IA HEURÍSTICA) */}
      <div className="mt-6 bg-indigo-950/30 border border-indigo-500/50 rounded-xl p-5 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
        <h4 className="text-sm font-extrabold text-indigo-300 flex items-center gap-2 mb-4">
          <span>🧠</span> Observaciones Automatizadas para Toma de Decisiones
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiInsights.map((insight, index) => (
            <div key={index} className="bg-slate-900/80 border border-indigo-500/20 p-4 rounded-lg text-xs text-slate-300 leading-relaxed shadow-inner">
              {insight}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}