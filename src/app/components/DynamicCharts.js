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
    clean = clean.replace(/columna_\d+/gi, '').replace(/\b20\d{2}\b/g, '').replace(/-/g, ' ').replace(/\s*[|._-]?\s*\b\d+\b\s*$/g, '').replace(/\s+/g, ' ').trim();
    return clean || rawCol.trim();
  };

  const dimensionCols = useMemo(() => {
    if (!columns) return [];
    return columns.filter(c => c.toLowerCase().includes('semana') || c.toLowerCase().includes('cinta') || c.toLowerCase().includes('finca') || c.toLowerCase().includes('fecha'));
  }, [columns]);

  const baseMetrics = useMemo(() => {
    if (!columns || !data) return [];
    const metrics = new Set();
    columns.forEach(col => {
      if (dimensionCols.includes(col)) return;
      if (data.some(row => !isNaN(parseFloat(row[col])) && row[col] !== '-')) metrics.add(getBaseName(col));
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
      if (m1Cols.colB) { const v = parseFloat(row[m1Cols.colB]); if (!isNaN(v)) map[key].m2_B += v; }
      if (m2Cols.colA) { const v = parseFloat(row[m2Cols.colA]); if (!isNaN(v)) map[key].m2_A += v; }
      if (m2Cols.colB) { const v = parseFloat(row[m2Cols.colB]); if (!isNaN(v)) map[key].m2_B += v; }
    });
    return Object.values(map).slice(0, 52).map(item => ({
      name: item.name,
      [`${yearA}_m1`]: Math.round(item.m1_A * 100) / 100,
      [`${yearB}_m1`]: Math.round(item.m1_B * 100) / 100,
      [`${yearA}_m2`]: Math.round(item.m2_A * 100) / 100,
      [`${yearB}_m2`]: Math.round(item.m2_B * 100) / 100,
    }));
  }, [data, selectedDimension, m1Cols, m2Cols, yearA, yearB]);

  const dimLabel = getBaseName(selectedDimension);

  // Totales calculados para la fila final de resumen
  const totals = useMemo(() => {
    let t1A = 0, t1B = 0, t2A = 0, t2B = 0;
    chartData.forEach(r => {
      t1A += r[`${yearA}_m1`] || 0;
      t1B += r[`${yearB}_m1`] || 0;
      t2A += r[`${yearA}_m2`] || 0;
      t2B += r[`${yearB}_m2`] || 0;
    });
    return {
      t1A: Math.round(t1A * 100) / 100,
      t1B: Math.round(t1B * 100) / 100,
      t2A: Math.round(t2A * 100) / 100,
      t2B: Math.round(t2B * 100) / 100,
      diff1: Math.round((t1B - t1A) * 100) / 100,
      var1Pct: t1A > 0 ? (((t1B - t1A) / t1A) * 100).toFixed(1) : '0'
    };
  }, [chartData, yearA, yearB]);

  // Motor Heurístico de IA
  const rawInsights = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    let maxM1_B = { name: '', val: -Infinity };
    let maxM2_B = { name: '', val: -Infinity };

    chartData.forEach(d => {
      if ((d[`${yearB}_m1`] || 0) > maxM1_B.val) maxM1_B = { name: d.name, val: d[`${yearB}_m1`] || 0 };
      if ((d[`${yearB}_m2`] || 0) > maxM2_B.val) maxM2_B = { name: d.name, val: d[`${yearB}_m2`] || 0 };
    });

    const insights = [];
    const trend = totals.diff1 >= 0 ? 'crecimiento al alza' : 'caída en producción';
    
    if (totals.t1A > 0) {
      insights.push(`RENDIMIENTO GLOBAL: El acumulado en ${yearB} registra un volumen total de ${totals.t1B.toLocaleString()} en "${metricChart1}", reflejando un ${trend} del ${Math.abs(totals.var1Pct)}% respecto a ${yearA} (${totals.t1A.toLocaleString()}).`);
    }
    if (maxM1_B.name) {
      insights.push(`PICO MÁXIMO DE OPERACIÓN: La mayor concentración de "${metricChart1}" en el período ${yearB} ocurrió en ${dimLabel} ${maxM1_B.name} con un total de ${maxM1_B.val.toLocaleString()} unidades.`);
    }
    if (maxM2_B.name && metricChart1 !== metricChart2) {
      insights.push(`ANÁLISIS DE CRUCE: Se identificó un evento crítico en la variable secundaria "${metricChart2}" durante la ${dimLabel} ${maxM2_B.name} (${maxM2_B.val.toLocaleString()}). Se sugiere evaluar el comportamiento diferido en la métrica principal.`);
    }
    return insights;
  }, [chartData, metricChart1, metricChart2, yearA, yearB, dimLabel, totals]);

  // 📥 GENERADOR DE INFORME EXCEL GERENCIAL FORMATEADO (.XLS)
  const exportToExecutiveExcel = () => {
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; }
          .title-hdr { background-color: #0f172a; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; padding: 14px; }
          .subtitle-hdr { background-color: #1e293b; color: #38bdf8; font-size: 10pt; text-align: center; padding: 6px; font-weight: bold; }
          .sec-header { background-color: #334155; color: #ffffff; font-size: 11pt; font-weight: bold; padding: 8px; }
          .ai-box { background-color: #f0f9ff; color: #0369a1; font-size: 10pt; padding: 8px; border: 1px solid #bae6fd; }
          th { background-color: #1e3a8a; color: #ffffff; font-size: 10pt; font-weight: bold; border: 1px solid #64748b; padding: 8px; text-align: center; }
          td { border: 1px solid #cbd5e1; font-size: 10pt; padding: 6px; text-align: center; }
          .row-even { background-color: #f8fafc; }
          .row-odd { background-color: #ffffff; }
          .totals-row { background-color: #e2e8f0; font-weight: bold; font-size: 11pt; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="5" class="title-hdr">INFORME EJECUTIVO DE OPERACIONES - OMNILOGISTICS OS</td></tr>
          <tr><td colspan="5" class="subtitle-hdr">ANÁLISIS COMPARATIVO INTERANUAL: ${yearA} VS ${yearB} | FILTRADO POR: ${dimLabel.toUpperCase()}</td></tr>
          <tr><td colspan="5"></td></tr>

          <tr><td colspan="5" class="sec-header">💡 OBSERVACIONES Y HALLAZGOS ESTRATÉGICOS (IA AUTÓNOMA)</td></tr>
          ${rawInsights.map(ins => `<tr><td colspan="5" class="ai-box">• ${ins}</td></tr>`).join('')}
          <tr><td colspan="5"></td></tr>

          <tr><td colspan="5" class="sec-header">📋 TABLA DE DATOS CONSOLIDADOS Y VARIACIÓN</td></tr>
          <tr>
            <th>${dimLabel}</th>
            <th>${metricChart1} (${yearA})</th>
            <th>${metricChart1} (${yearB})</th>
            <th>${metricChart2} (${yearA})</th>
            <th>${metricChart2} (${yearB})</th>
          </tr>
          ${chartData.map((row, idx) => `
            <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
              <td style="font-weight: bold;">${row.name}</td>
              <td>${row[`${yearA}_m1`]}</td>
              <td>${row[`${yearB}_m1`]}</td>
              <td>${row[`${yearA}_m2`]}</td>
              <td>${row[`${yearB}_m2`]}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td>TOTALES ACUMULADOS</td>
            <td>${totals.t1A.toLocaleString()}</td>
            <td>${totals.t1B.toLocaleString()}</td>
            <td>${totals.t2A.toLocaleString()}</td>
            <td>${totals.t2B.toLocaleString()}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Informe_Ejecutivo_${metricChart1}_${yearA}_${yearB}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => window.print();

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
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl my-6 space-y-6 print:bg-white print:text-black print:border-none print:shadow-none print:m-0 print:p-0">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800 print:border-b-2 print:border-slate-300">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 print:text-slate-900">
            <span className="text-blue-500 print:text-blue-700">⚡</span> Reporte Ejecutivo: Análisis Multivariable Interanual
          </h3>
          <p className="text-xs text-slate-400 print:text-slate-600">Período de comparación: {yearA} vs {yearB}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <label className="text-[10px] font-bold uppercase text-slate-400">Eje X:</label>
            <select value={selectedDimension} onChange={(e) => setSelectedDimension(e.target.value)} className="bg-transparent text-emerald-400 text-xs font-bold outline-none cursor-pointer">
              {dimensionCols.map((col, idx) => <option key={idx} value={col} className="bg-slate-900">{getBaseName(col)}</option>)}
            </select>
          </div>
          <button onClick={exportToExecutiveExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-all">
            <span>📊</span> Excel Ejecutivo
          </button>
          <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-all">
            <span>📄</span> Imprimir PDF
          </button>
        </div>
      </div>

      {/* 🧠 OBSERVACIONES DE IA */}
      <div className="mt-2 bg-indigo-950/30 border border-indigo-500/50 rounded-xl p-5 print:bg-slate-50 print:border-slate-300 print:shadow-none">
        <h4 className="text-sm font-extrabold text-indigo-300 flex items-center gap-2 mb-3 print:text-slate-800">
          <span>🧠</span> Hallazgos Heurísticos y Observaciones
        </h4>
        <ul className="space-y-2">
          {rawInsights.map((insight, index) => (
            <li key={index} className="text-xs text-slate-300 leading-relaxed print:text-slate-700 list-disc ml-5">
              {insight}
            </li>
          ))}
        </ul>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 print:bg-white print:border-slate-300 print:shadow-none">
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

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 print:bg-white print:border-slate-300 print:shadow-none">
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

      {/* 📋 TABLA GERENCIAL CON TOTALES */}
      <div className="mt-8 overflow-x-auto bg-slate-950 p-4 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
        <h4 className="text-sm font-bold text-slate-100 mb-4 print:text-slate-800">📋 Tabla de Datos Consolidados</h4>
        <table className="w-full text-[10px] text-left text-slate-300 print:text-slate-800">
          <thead className="uppercase bg-slate-900 text-slate-400 print:bg-slate-200 print:text-slate-900 border-b border-slate-700 print:border-slate-400">
            <tr>
              <th className="px-4 py-2">{dimLabel}</th>
              <th className="px-4 py-2 text-blue-400 print:text-blue-800">{metricChart1} ({yearA})</th>
              <th className="px-4 py-2 text-emerald-400 print:text-emerald-800">{metricChart1} ({yearB})</th>
              <th className="px-4 py-2 text-amber-400 print:text-amber-800">{metricChart2} ({yearA})</th>
              <th className="px-4 py-2 text-purple-400 print:text-purple-800">{metricChart2} ({yearB})</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i} className="border-b border-slate-800/50 print:border-slate-300 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-1.5 font-bold text-slate-200 print:text-black">{row.name}</td>
                <td className="px-4 py-1.5">{row[`${yearA}_m1`]}</td>
                <td className="px-4 py-1.5">{row[`${yearB}_m1`]}</td>
                <td className="px-4 py-1.5">{row[`${yearA}_m2`]}</td>
                <td className="px-4 py-1.5">{row[`${yearB}_m2`]}</td>
              </tr>
            ))}
            <tr className="bg-slate-900 font-extrabold text-slate-100 print:bg-slate-200 print:text-black border-t-2 border-slate-700">
              <td className="px-4 py-2 uppercase">TOTALES ACUMULADOS</td>
              <td className="px-4 py-2 text-blue-400 print:text-blue-900">{totals.t1A.toLocaleString()}</td>
              <td className="px-4 py-2 text-emerald-400 print:text-emerald-900">{totals.t1B.toLocaleString()}</td>
              <td className="px-4 py-2 text-amber-400 print:text-amber-900">{totals.t2A.toLocaleString()}</td>
              <td className="px-4 py-2 text-purple-400 print:text-purple-900">{totals.t2B.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}