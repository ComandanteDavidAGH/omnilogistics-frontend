'use client';
import { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function DynamicCharts({ columns, data, yearA, yearB }) {
  const [botApproved, setBotApproved] = useState(false);
  const [botConfig, setBotConfig] = useState({ stage: 1, xAxis: '', enableMath: false });
  const [metricChart1, setMetricChart1] = useState('');
  const [metricChart2, setMetricChart2] = useState('');
  const [activeTab, setActiveTab] = useState('');
  const [c1, setC1] = useState('bar');
  const [c2, setC2] = useState('area');

  const { textCols, numCols, hasSemana, hasCinta, hasYears } = useMemo(() => {
    if (!columns || !data || data.length === 0) return { textCols: [], numCols: [], hasSemana: false, hasCinta: false, hasYears: false };
    
    const tCols = columns.filter(c => !data.some(r => !isNaN(parseFloat(r[c])) && r[c] !== '-'));
    const nCols = columns.filter(c => data.some(r => !isNaN(parseFloat(r[c])) && r[c] !== '-'));
    
    const hSemana = columns.some(c => c.toLowerCase().includes('semana'));
    const hCinta = columns.some(c => c.toLowerCase().includes('cinta'));
    const hYears = columns.some(c => c.includes(yearA)) && columns.some(c => c.includes(yearB));

    return { textCols: tCols.length > 0 ? tCols : columns, numCols: nCols, hasSemana: hSemana, hasCinta: hCinta, hasYears: hYears };
  }, [columns, data, yearA, yearB]);

  useEffect(() => {
    if (hasSemana && hasCinta) {
      setBotConfig({ stage: 4, xAxis: 'FUSION_BANANERA', enableMath: true });
    } else if (hasYears) {
      setBotConfig({ stage: 3, xAxis: textCols[0] || columns[0] || '', enableMath: false });
    } else {
      setBotConfig({ stage: 1, xAxis: textCols[0] || columns[0] || '', enableMath: false });
    }
    setBotApproved(false); 
  }, [columns, hasSemana, hasCinta, hasYears, textCols]);

  const isUltra = botConfig.stage === 4;

  const getBaseName = (rawCol) => {
    if (!rawCol) return '';
    let lower = rawCol.toLowerCase();
    if (lower.includes('acumulado embolse')) return 'Acumulado Embolse';
    if (lower.includes('por hectarea') || lower.includes('por hectárea')) return 'Embolse por Hectárea';
    if (lower.includes('embolse') && !lower.includes('acumulado') && !lower.includes('hecta')) return 'Embolse Semanal';
    let clean = rawCol.split('|').map(p => p.trim()).filter(p => !/^\d{4}$/.test(p)).join(' ');
    return clean.replace(/columna_\d+/gi, '').replace(/\b20\d{2}\b/g, '').replace(/-/g, ' ').trim() || rawCol.trim();
  };

  const ultraMetrics = useMemo(() => {
    if (!isUltra) return [];
    const metrics = new Set();
    numCols.forEach(col => metrics.add(getBaseName(col)));
    return Array.from(metrics).filter(m => m !== '');
  }, [numCols, isUltra]);

  const metricsList = isUltra ? ultraMetrics : numCols;

  useEffect(() => {
    if (botApproved) {
      setMetricChart1(metricsList[0] || '');
      setMetricChart2(metricsList[1] || metricsList[0] || '');
      setActiveTab(metricsList[0] || '');
    }
  }, [botApproved, metricsList]);

  const getExactCol = (metricName, targetYear) => columns.find(col => getBaseName(col) === metricName && col.includes(String(targetYear))) || null;

  const chartData = useMemo(() => {
    if (!botApproved || !data || data.length === 0) return [];
    
    if (isUltra) {
      const dimSemana = columns.find(c => c.toLowerCase().includes('semana')) || '';
      const dimCinta = columns.find(c => c.toLowerCase().includes('cinta')) || '';
      
      let mapped = data.map(row => {
        let fusionName = String(row[dimSemana] || '').trim();
        const vCin = row[dimCinta] || '';
        if (vCin && vCin !== '-') fusionName += ` - ${String(vCin).trim().toUpperCase()}`;
        return { _original: row, name: fusionName || 'N/A', _num: parseInt(String(row[dimSemana]).replace(/\D/g, ''), 10) || 0 };
      }).filter(r => r.name !== 'N/A').sort((a, b) => a._num - b._num);

      let prevAcums = {};
      return mapped.map(item => {
        const newRow = { name: item.name };
        ultraMetrics.forEach(metric => {
          [yearA, yearB].forEach(year => {
            const colKey = `${metric}_${year}`;
            const exactCol = getExactCol(metric, year);
            if (exactCol) {
              newRow[colKey] = Number((parseFloat(item._original[exactCol]) || 0).toFixed(2));
            } else if (botConfig.enableMath) {
              const acumCol = getExactCol(`Acumulado ${metric.replace(' Semanal', '')}`, year);
              if (acumCol) {
                const currentAcum = parseFloat(item._original[acumCol]) || 0;
                let deduced = currentAcum - (prevAcums[colKey] || 0);
                newRow[colKey] = Number(Math.max(0, deduced).toFixed(2));
                prevAcums[colKey] = currentAcum;
              } else newRow[colKey] = 0;
            } else {
              newRow[colKey] = 0;
            }
          });
        });
        return newRow;
      });
    } else {
      const map = {};
      data.forEach(row => {
        const key = String(row[botConfig.xAxis] || 'Sin Asignar').trim();
        if (!map[key]) {
          map[key] = { name: key };
          numCols.forEach(c => map[key][c] = 0);
        }
        numCols.forEach(c => {
          const val = parseFloat(row[c]);
          if (!isNaN(val)) map[key][c] += val;
        });
      });
      return Object.values(map).map(r => {
        numCols.forEach(c => r[c] = Number(r[c].toFixed(2)));
        return r;
      });
    }
  }, [botApproved, data, isUltra, botConfig, ultraMetrics, numCols, yearA, yearB, columns]);

  const { totals, rawInsights } = useMemo(() => {
    if (!chartData || chartData.length === 0) return { totals: {}, rawInsights: [] };
    const insights = [];
    let t = {};
    
    if (isUltra) {
      let t1A = 0, t1B = 0, t2A = 0, t2B = 0;
      let maxM1_B = { name: '', val: -Infinity }, maxM2_B = { name: '', val: -Infinity };

      chartData.forEach(r => {
        t1A += r[`${metricChart1}_${yearA}`] || 0; t1B += r[`${metricChart1}_${yearB}`] || 0;
        t2A += r[`${metricChart2}_${yearA}`] || 0; t2B += r[`${metricChart2}_${yearB}`] || 0;
        if ((r[`${metricChart1}_${yearB}`] || 0) > maxM1_B.val) maxM1_B = { name: r.name, val: r[`${metricChart1}_${yearB}`] || 0 };
        if ((r[`${metricChart2}_${yearB}`] || 0) > maxM2_B.val) maxM2_B = { name: r.name, val: r[`${metricChart2}_${yearB}`] || 0 };
      });
      t = { t1A: Number(t1A.toFixed(2)), t1B: Number(t1B.toFixed(2)), diff1: Number((t1B - t1A).toFixed(2)) };
      const var1Pct = t1A > 0 ? (((t1B - t1A) / t1A) * 100).toFixed(1) : '0';
      if (t1A > 0) insights.push(`RENDIMIENTO GLOBAL: El acumulado en ${yearB} registra un total de ${t.t1B.toLocaleString()} en "${metricChart1}", reflejando una variación del ${var1Pct}% respecto a ${yearA}.`);
      if (maxM1_B.name) insights.push(`PICO MÁXIMO: La mayor concentración de "${metricChart1}" en ${yearB} ocurrió en "${maxM1_B.name}" (${maxM1_B.val.toLocaleString()}).`);
    } else {
      let tM1 = 0; let maxM1 = { name: '', val: -Infinity };
      chartData.forEach(r => {
        tM1 += r[metricChart1] || 0;
        if ((r[metricChart1] || 0) > maxM1.val) maxM1 = { name: r.name, val: r[metricChart1] || 0 };
      });
      if (tM1 > 0) insights.push(`VOLUMEN TOTAL: La métrica "${metricChart1}" suma un valor global de ${tM1.toLocaleString()} procesados.`);
      if (maxM1.name) insights.push(`PUNTO DE CONCENTRACIÓN: El registro "${maxM1.name}" es el líder absoluto en "${metricChart1}" con un valor de ${maxM1.val.toLocaleString()}.`);
    }
    return { totals: t, rawInsights: insights };
  }, [chartData, isUltra, metricChart1, metricChart2, yearA, yearB]);

  if (!botApproved) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl my-6 max-w-4xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5 mb-6">
          <div className="text-5xl bg-slate-800 p-3 rounded-full border border-slate-700">🤖</div>
          <div>
            <h2 className="text-2xl font-bold text-white">Copiloto Analítico OS</h2>
            <p className="text-sm text-blue-400 font-semibold">Escaneo completado. Auto-configuración lista.</p>
          </div>
        </div>
        
        <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 text-slate-300 space-y-4 text-sm leading-relaxed mb-6">
          <p>¡Hola! He analizado los <strong>{data ? data.length : 0}</strong> registros del nuevo archivo.</p>
          
          {botConfig.stage === 4 ? (
            <div className="bg-emerald-950/30 border border-emerald-800/50 p-4 rounded-md text-emerald-200">
              <strong className="text-emerald-400 block mb-1">🍌 Diagnóstico: Operación Agrícola (Etapa 4 - Ultra)</strong>
              He detectado la estructura del reporte bananero (Semanas y Cintas). 
              Propongo encender el motor de <strong>Fusión de Variables</strong> y activar la <strong>Matemática Inversa</strong> para deducir datos semanales a partir de acumulados.
            </div>
          ) : (
            <div className="bg-blue-950/30 border border-blue-800/50 p-4 rounded-md text-blue-200">
              <strong className="text-blue-400 block mb-1">📦 Diagnóstico: Base Estándar (Etapa 1 - Universal)</strong>
              He detectado una base plana de datos (Logística, Inventario o Ventas). 
              He apagado las deducciones bananeras para mantener la integridad de los datos puros.
            </div>
          )}
        </div>

        <div className="bg-slate-900 p-5 rounded-lg border border-slate-700 space-y-4 mb-6">
          <h3 className="text-white font-bold mb-2">⚙️ Confirma tu configuración de Ejes:</h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Eje Principal (X - Agrupación)</label>
              <select 
                value={botConfig.xAxis} 
                onChange={(e) => setBotConfig({...botConfig, xAxis: e.target.value, stage: e.target.value === 'FUSION_BANANERA' ? 4 : 1})}
                className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors"
              >
                {hasSemana && hasCinta && <option value="FUSION_BANANERA" className="font-bold text-emerald-400">🍌 Fusión Automática (Semana + Cinta)</option>}
                {textCols.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => setBotApproved(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 transition-transform transform hover:scale-105">
            <span>✅</span> Generar Tablero Gerencial
          </button>
        </div>
      </div>
    );
  }

  const renderChart = (type, metricKey, colorA, colorB) => {
    const kA = isUltra ? `${metricKey}_${yearA}` : metricKey;
    const kB = isUltra ? `${metricKey}_${yearB}` : metricKey;
    
    switch(type) {
      case 'bar':
        return (
          <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '11px' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar name={isUltra ? `${metricKey} (${yearA})` : metricKey} dataKey={kA} fill={colorA} radius={[4, 4, 0, 0]} />
            {isUltra && <Bar name={`${metricKey} (${yearB})`} dataKey={kB} fill={colorB} radius={[4, 4, 0, 0]} />}
          </BarChart>
        );
      case 'line':
      case 'area':
      default:
        return (
          <AreaChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '11px' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area name={isUltra ? `${metricKey} (${yearA})` : metricKey} type="monotone" dataKey={kA} stroke={colorA} fill={colorA} fillOpacity={0.2} strokeWidth={3} />
            {isUltra && <Area name={`${metricKey} (${yearB})`} type="monotone" dataKey={kB} stroke={colorB} fill={colorB} fillOpacity={0.2} strokeWidth={3} />}
          </AreaChart>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl my-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-500">⚡</span> Motor Analítico OS
          </h3>
          <p className="text-xs text-blue-400 font-semibold uppercase">MODO: {isUltra ? 'AGRÍCOLA ULTRA' : 'ESTÁNDAR'} | EJE: {botConfig.xAxis}</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setBotApproved(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-3 rounded-lg border border-slate-700 transition-all">⚙️ Re-Configurar</button>
        </div>
      </div>

      <div className="bg-indigo-950/30 border border-indigo-500/50 rounded-xl p-5">
        <h4 className="text-sm font-extrabold text-indigo-300 flex items-center gap-2 mb-2">🧠 Observaciones IA</h4>
        <ul className="space-y-1">
          {rawInsights.map((ins, i) => <li key={i} className="text-xs text-slate-300 list-disc ml-5">{ins}</li>)}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
            <select value={metricChart1} onChange={(e) => setMetricChart1(e.target.value)} className="bg-slate-900 text-slate-100 text-[11px] font-bold rounded px-2 py-1 outline-none w-48 truncate border border-slate-700">
              {metricsList.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
            </select>
            <select value={c1} onChange={(e) => setC1(e.target.value)} className="text-[10px] bg-slate-800 border border-slate-600 px-2 py-1 rounded-md text-slate-200 outline-none">
              <option value="area">🌊 Áreas</option><option value="bar">📊 Barras</option>
            </select>
          </div>
          <div className="h-60 w-full"><ResponsiveContainer width="100%" height="100%">{renderChart(c1, metricChart1, '#3b82f6', '#10b981')}</ResponsiveContainer></div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
            <select value={metricChart2} onChange={(e) => setMetricChart2(e.target.value)} className="bg-slate-900 text-slate-100 text-[11px] font-bold rounded px-2 py-1 outline-none w-48 truncate border border-slate-700">
              {metricsList.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
            </select>
            <select value={c2} onChange={(e) => setC2(e.target.value)} className="text-[10px] bg-slate-800 border border-slate-600 px-2 py-1 rounded-md text-slate-200 outline-none">
              <option value="bar">📊 Barras</option><option value="area">🌊 Áreas</option>
            </select>
          </div>
          <div className="h-60 w-full"><ResponsiveContainer width="100%" height="100%">{renderChart(c2, metricChart2, '#f59e0b', '#8b5cf6')}</ResponsiveContainer></div>
        </div>
      </div>

      <div className="mt-8 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        <div className="max-h-80 overflow-y-auto custom-scrollbar p-4 relative">
          <table className="w-full text-[10px] text-left text-slate-300 border-collapse whitespace-nowrap">
            <thead className="uppercase bg-slate-950 text-slate-400 sticky top-0 shadow-md">
              <tr>
                <th className="px-4 py-3 border-b border-slate-700">{isUltra ? 'SEMANA - CINTA' : (botConfig.xAxis || 'Categoría')}</th>
                {numCols.map((c, i) => <th key={i} className="px-4 py-3 border-b border-slate-700 text-blue-400">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-1.5 font-bold text-slate-200">{row.name}</td>
                  {numCols.map((c, idx) => <td key={idx} className="px-4 py-1.5">{row[c] || 0}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}