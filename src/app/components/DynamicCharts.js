'use client';
import { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

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

  // 🧠 MOTOR DE IA EXTRACTIVO (Texto puro para Excel y PDF)
  const rawInsights = useMemo(() => {
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
    const diff = totalM1_B - totalM1_A;
    const pct = totalM1_A > 0 ? ((diff / totalM1_A) * 100).toFixed(1) : 0;
    const trend = diff >= 0 ? 'crecimiento al alza' : 'caída operativa';
    
    if (totalM1_A > 0) {
      insights.push(`RENDIMIENTO GLOBAL: El acumulado en ${yearB} muestra un ${trend} del ${Math.abs(pct)}% en "${metricChart1}" en comparación con ${yearA}.`);
    }
    if (maxM1_B.name) {
      insights.push(`PICO DE PRODUCCIÓN: La máxima intensidad de "${metricChart1}" registrada en ${yearB} ocurrió en ${dimLabel} ${maxM1_B.name} con un valor de ${maxM1_B.val.toLocaleString()}.`);
    }
    if (maxM2_B.name && metricChart1 !== metricChart2) {
      insights.push(`ALERTA DE CRUCE: Se detectó un evento extremo de "${metricChart2}" en ${dimLabel} ${maxM2_B.name}. Se recomienda evaluar si esto provocó un impacto en el rendimiento.`);
    }
    return insights;
  }, [chartData, metricChart1, metricChart2, yearA, yearB, dimLabel]);

  // 📥 EXPORTADOR EXCEL PROFESIONAL (ESTILO GERENCIAL HTML -> XLS)
  const exportToExecutiveExcel = () => {
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          .title { background-color: #1e293b; color: #ffffff; font-size: 18px; font-weight: bold; text-align: center; padding: 10px; }
          .subtitle { background-color: #f1f5f9; color: #0f172a; font-size: 14px; font-weight: bold; padding: 8px; }
          .insight { background-color: #e0f2fe; color: #0369a1; font-size: 12px; padding: 5px; }
          th { background-color: #3b82f6; color: white; border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: bold;}
          td { border: 1px solid #cbd5e1; padding: 6px; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="5" class="title">REPORTE GERENCIAL: ${metricChart1} vs ${metricChart2} (${yearA} - ${yearB})</td></tr>
          <tr><td colspan="5" class="subtitle">Observaciones Generadas por OmniLogistics AI:</td></tr>
          ${rawInsights.map(ins => `<tr><td colspan="5" class="insight">• ${ins}</td></tr>`).join('')}
          <tr><td colspan="5"></td></tr>
          <tr>
            <th>${dimLabel}</th>
            <th>${metricChart1} (${yearA})</th>
            <th>${metricChart1} (${yearB})</th>
            <th>${metricChart2} (${yearA})</th>
            <th>${metricChart2} (${yearB})</th>
          </tr>
          ${chartData.map(row => `
            <tr>
              <td>${row.name}</td>
              <td>${row[`${yearA}_m1`]}</td>
              <td>${row[`${yearB}_m1`]}</td>
              <td>${row[`${yearA}_m2`]}</td>
              <td>${row[`${yearB}_m2`]}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Resumen_Gerencial_${yearA}_${yearB}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🖨️ EXPORTADOR PDF (Vía Ventana de Impresión)
  const exportToPDF = () => {
    window.print();
  };

  if (!data || data.length === 0 || baseMetrics.length === 0) return null;

  const renderChart = (type, metricKey, colorA, colorB, gradientA, gradientB) => {
    switch(type) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar name={`${metricKey} (${yearA})`} dataKey={`${yearA}_${metricKey === metricChart1 ? 'm1' : 'm2'}`} fill={colorA} radius={[4, 4, 0, 0]} />
            <Bar name={`${metricKey} (${yearB})`} dataKey={`${yearB}_${metricKey === metricChart1 ? 'm1' : 'm2'}`} fill={colorB} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line name={`${metricKey} (${yearA})`} type="monotone" dataKey={`${yearA}_${metricKey === metricChart1 ? 'm1' : 'm2'}`} stroke={colorA} strokeWidth={3} dot={{ r: 3 }} />
            <Line name={`${metricKey} (${yearB})`} type="monotone" dataKey={`${yearB}_${metricKey === metricChart1 ? 'm1' : 'm2'}`} stroke={colorB} strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        );
      case 'area':
      default:
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={gradientA} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorA} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={colorA} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id={gradientB} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorB} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={colorB} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area name={`${metricKey} (${yearA})`} type="monotone" dataKey={`${yearA}_${metricKey === metricChart1 ? 'm1' : 'm2'}`} stroke={colorA} fillOpacity={1} fill={`url(#${gradientA})`} strokeWidth={3} dot={false} />
            <Area name={`${metricKey} (${yearB})`} type="monotone" dataKey={`${yearB}_${metricKey === metricChart1 ? 'm1' : 'm2'}`} stroke={colorB} fillOpacity={1} fill={`url(#${gradientB})`} strokeWidth={3} dot={false} />
          </AreaChart>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl my-6 space-y-6 print:bg-white print:text-black print:border-none print:shadow-none">
      
      {/* CABECERA CON BOTONES DE EXPORTACIÓN */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-b-2 print:border-slate-300">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 print:text-slate-800">
            <span className="text-blue-500 print:text-slate-800">⚡</span> Tablero Analítico Multivariable Interanual
          </h3>
          <p className="text-xs text-slate-400 print:text-slate-600">Reporte Gerencial Consolidado</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <label className="text-[10px] font-bold uppercase text-slate-400">Eje X:</label>
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
          
          <button onClick={exportToExecutiveExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg shadow flex items-center gap-2 transition-all">
            <span>📊</span> Excel Ejecutivo
          </button>
          
          <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg shadow flex items-center gap-2 transition-all">
            <span>📄</span> PDF / Imprimir
          </button>
        </div>
      </div>

      {/* 🧠 PANEL DE INTELIGENCIA DE NEGOCIO (IMPRIMIBLE) */}
      <div className="mt-2 bg-indigo-950/30 border border-indigo-500/50 rounded-xl p-5 print:bg-slate-100 print:border-slate-300">
        <h4 className="text-sm font-extrabold text-indigo-300 flex items-center gap-2 mb-3 print:text-slate-800">
          <span>🧠</span> Observaciones Automatizadas para Toma de Decisiones
        </h4>
        <ul className="space-y-2">
          {rawInsights.map((insight, index) => (
            <li key={index} className="text-xs text-slate-300 leading-relaxed print:text-slate-700 list-disc ml-5">
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* GRÁFICOS DUALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        
        {/* GRÁFICO 1 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 print:bg-white print:border-slate-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-400 font-bold uppercase">Métrica 1:</span>
              <select value={metricChart1} onChange={(e) => setMetricChart1(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded px-2 py-1 outline-none">
                {baseMetrics.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
              </select>
            </div>
            <select value={chart1Type} onChange={(e) => setChart1Type(e.target.value)} className="text-[10px] bg-slate-800 border border-slate-600 px-2 py-1 rounded-md text-slate-200 font-bold outline-none">
              <option value="area">🌊 Áreas</option>
              <option value="bar">📊 Barras</option>
              <option value="line">📈 Líneas</option>
            </select>
          </div>
          <h4 className="hidden print:block text-center text-xs font-bold mb-4 text-slate-800 uppercase">{metricChart1}</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(chart1Type, metricChart1, '#3b82f6', '#10b981', 'colorM1A', 'colorM1B')}
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 print:bg-white print:border-slate-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold uppercase">Métrica 2:</span>
              <select value={metricChart2} onChange={(e) => setMetricChart2(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold rounded px-2 py-1 outline-none">
                {baseMetrics.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
              </select>
            </div>
            <select value={chart2Type} onChange={(e) => setChart2Type(e.target.value)} className="text-[10px] bg-slate-800 border border-slate-600 px-2 py-1 rounded-md text-slate-200 font-bold outline-none">
              <option value="bar">📊 Barras</option>
              <option value="area">🌊 Áreas</option>
              <option value="line">📈 Líneas</option>
            </select>
          </div>
          <h4 className="hidden print:block text-center text-xs font-bold mb-4 text-slate-800 uppercase">{metricChart2}</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(chart2Type, metricChart2, '#f59e0b', '#8b5cf6', 'colorM2A', 'colorM2B')}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}