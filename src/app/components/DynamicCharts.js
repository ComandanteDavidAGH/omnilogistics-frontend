'use client';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function DynamicCharts({ columns, data }) {
  if (!data || data.length === 0 || !columns || columns.length === 0) return null;

  // 1. Detectar Columna Categórica (Eje X)
  const catColumn = columns.find(c => {
    const name = c.toLowerCase();
    return name.includes('semana') || name.includes('finca') || name.includes('producto') || name.includes('cliente') || name.includes('fecha');
  }) || columns[0];

  // 2. Detectar Columnas Numéricas (Ejes Y / Series)
  const numericColumns = columns.filter(col => {
    if (col === catColumn) return false;
    return data.some(row => !isNaN(parseFloat(row[col])) && row[col] !== '-');
  }).slice(0, 2);

  if (numericColumns.length === 0) return null;

  // 3. Agrupar y Agregar Datos para el Gráfico
  const chartMap = {};
  data.forEach(row => {
    const rawKey = String(row[catColumn] || 'N/A').trim();
    if (!rawKey || rawKey === '-') return;

    if (!chartMap[rawKey]) {
      chartMap[rawKey] = { name: rawKey };
      numericColumns.forEach(numCol => chartMap[rawKey][numCol] = 0);
    }

    numericColumns.forEach(numCol => {
      const val = parseFloat(row[numCol]);
      if (!isNaN(val)) chartMap[rawKey][numCol] += val;
    });
  });

  const chartData = Object.values(chartMap).slice(0, 30);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
      {/* Gráfico 1: Comparativa en Barras */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Comparativa de Volumen por {catColumn.split('|').pop().trim()}
          </h4>
          <p className="text-xs text-slate-400">Distribución de métricas principales</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={numericColumns[0]} fill="#3b82f6" name={numericColumns[0].split('|').pop().trim()} radius={[4, 4, 0, 0]} />
              {numericColumns[1] && (
                <Bar dataKey={numericColumns[1]} fill="#10b981" name={numericColumns[1].split('|').pop().trim()} radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Tendencia de Área */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Tendencia Temporal / Comportamiento
          </h4>
          <p className="text-xs text-slate-400">Proyección acumulada de desempeño</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
              <Area type="monotone" dataKey={numericColumns[0]} stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name={numericColumns[0].split('|').pop().trim()} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}