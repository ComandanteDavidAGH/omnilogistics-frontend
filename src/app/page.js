'use client';
import { useState } from 'react';

export default function Home() {
  const [yearA, setYearA] = useState('2024');
  const [yearB, setYearB] = useState('2025');
  
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [freezePanes, setFreezePanes] = useState(true);
  
  // NUEVO: Estado para el buscador
  const [searchTerm, setSearchTerm] = useState('');

  const handleFileUpload = async () => {
    if (!file) {
      alert("Selecciona un archivo Excel primero.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const BACKEND_URL = "https://omnilogistics-backend-6bbn.onrender.com/api/procesar-matriz"; 
      
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("El servidor rechazó el archivo");

      const data = await response.json();
      setMatrixData(data);
    } catch (error) {
      console.error("Error al procesar matriz:", error);
      alert("Hubo un fallo de conexión con el Backend de Render.");
    } finally {
      setIsLoading(false);
    }
  };

  // NUEVO: Función para exportar a CSV
  const exportToCSV = () => {
    if (!matrixData || filteredRows.length === 0) return;
    const cols = matrixData.columnas;
    const header = cols.join(',');
    const csvRows = filteredRows.map(row => {
      return cols.map(col => {
        let cellData = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
        // Limpiar saltos de línea o comas internas
        cellData = cellData.replace(/"/g, '""');
        return `"${cellData}"`;
      }).join(',');
    });
    
    const csvContent = [header, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `OmniLogistics_Reporte_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatValue = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val.toLocaleString('en-US') : val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (typeof val === 'string' && !isNaN(val) && val.trim() !== '') {
      const num = parseFloat(val);
      return Number.isInteger(num) ? num.toLocaleString('en-US') : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val;
  };

  const renderHeaderTitle = (title) => {
    if (!title) return '';
    const parts = title.split('|').map(p => p.trim());
    if (parts.length > 1) {
      return (
        <div className="flex flex-col items-center justify-center text-center leading-tight py-1 min-w-[120px]">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-normal">{parts[0]}</span>
          <span className="text-[10px] uppercase font-semibold text-slate-200 mt-0.5">{parts[1]}</span>
          {parts[2] && <span className="text-[11px] font-bold text-blue-400 mt-0.5">{parts[2]}</span>}
        </div>
      );
    }
    return <span className="text-[11px] font-semibold text-slate-200">{title}</span>;
  };

  const rowList = matrixData 
    ? (matrixData.filas || matrixData.datos || matrixData.matriz || matrixData.data || [])
    : [];

  // NUEVO: Filtro de filas dinámico
  const filteredRows = rowList.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return matrixData.columnas.some(col => 
      String(row[col] || '').toLowerCase().includes(term)
    );
  });

  // El motor analítico ahora usa "filteredRows" para que se actualice si buscas algo
  const colStats = {};
  if (matrixData && filteredRows.length > 0) {
    matrixData.columnas.forEach(col => {
      let sum = 0, count = 0;
      filteredRows.forEach(row => {
        const val = parseFloat(row[col]);
        if (!isNaN(val)) { sum += val; count++; }
      });
      if (count > 0) { colStats[col] = { avg: sum / count }; }
    });
  }

  const getKPIs = () => {
    if (!matrixData || filteredRows.length === 0) return null;
    const cols = matrixData.columnas;
    
    const colEmbolse = cols.find(c => c.toUpperCase().includes('EMBOLSE AÑOS') && c.includes(yearB)) 
                    || cols.find(c => c.toUpperCase().includes('EMBOLSE AÑOS'));
    
    const colEmbolseHa = cols.find(c => c.toUpperCase().includes('POR HECTAREA') && c.includes(yearB)) 
                    || cols.find(c => c.toUpperCase().includes('POR HECTAREA'));

    let totalEmbolse = 0;
    filteredRows.forEach(row => {
      if (colEmbolse && !isNaN(parseFloat(row[colEmbolse]))) {
         totalEmbolse += parseFloat(row[colEmbolse]);
      }
    });

    return {
      totalSemanas: filteredRows.length,
      totalEmbolse: totalEmbolse,
      avgEmbolseHa: colEmbolseHa && colStats[colEmbolseHa] ? colStats[colEmbolseHa].avg : 0,
      labelEmbolse: colEmbolse ? colEmbolse.split('|').pop().trim() : yearB,
      labelEmbolseHa: colEmbolseHa ? colEmbolseHa.split('|').pop().trim() : yearB,
    };
  };

  const getCellColor = (val, colName) => {
    if (colName.toUpperCase().includes('SEMANA') || colName.toUpperCase().includes('CINTA')) return 'text-slate-300';
    if (colName.toUpperCase().includes('ACUMULADO')) return 'text-slate-300 font-mono';

    const num = parseFloat(val);
    if (isNaN(num) || !colStats[colName]) return 'text-slate-300';
    
    const avg = colStats[colName].avg;
    if (avg === 0) return 'text-slate-300';
    
    const ratio = num / avg;
    if (ratio > 1.15) return 'text-emerald-400 font-bold bg-emerald-950/30'; 
    if (ratio < 0.85) return 'text-rose-400 font-bold bg-rose-950/30';       
    
    return 'text-slate-300';
  };

  const kpis = getKPIs();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white font-bold p-2 rounded-lg text-xs tracking-wider">OL</div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">OmniLogistics OS</h1>
            <p className="text-xs text-slate-400">Plataforma SaaS de Análisis Logístico B2B</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-300 font-mono">Backend Render: Conectado</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap gap-6 items-center justify-between shadow-lg">
          <div className="flex items-center space-x-4 bg-slate-950 p-3 rounded-lg border border-slate-800 w-full md:w-auto">
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-900/50 file:text-blue-300 hover:file:bg-blue-800/50 cursor-pointer"
            />
            <button 
              onClick={handleFileUpload}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-md"
            >
              {isLoading ? 'Analizando...' : 'Procesar Excel'}
            </button>
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-300 hover:bg-slate-800 transition-colors">
              <input 
                type="checkbox"
                checked={freezePanes}
                onChange={(e) => setFreezePanes(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-600 cursor-pointer"
              />
              <span className="font-medium">Inmovilizar Paneles</span>
            </label>

            <div className="flex items-center space-x-3">
              <select value={yearA} onChange={(e) => setYearA(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none">
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
              <span className="text-slate-500 text-sm">vs</span>
              <select value={yearB} onChange={(e) => setYearB(e.target.value)} className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none">
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        </div>

        {matrixData ? (
          <div className="space-y-4">
            {kpis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center space-x-4 shadow-sm">
                  <div className="p-3 bg-blue-900/30 text-blue-400 rounded-lg border border-blue-900/50 text-xl">🗓️</div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Registros</p>
                    <h4 className="text-2xl font-bold text-slate-100 font-mono">{kpis.totalSemanas}</h4>
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center space-x-4 shadow-sm">
                  <div className="p-3 bg-emerald-900/30 text-emerald-400 rounded-lg border border-emerald-900/50 text-xl">📦</div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Embolse ({kpis.labelEmbolse})</p>
                    <h4 className="text-2xl font-bold text-slate-100 font-mono">{formatValue(kpis.totalEmbolse)}</h4>
                  </div>
                </div>

                <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex items-center space-x-4 shadow-sm">
                  <div className="p-3 bg-purple-900/30 text-purple-400 rounded-lg border border-purple-900/50 text-xl">🌱</div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ritmo Embolse/Ha ({kpis.labelEmbolseHa})</p>
                    <h4 className="text-2xl font-bold text-slate-100 font-mono">{formatValue(kpis.avgEmbolseHa)}</h4>
                    <p className="text-[9px] text-slate-500 mt-1 font-mono tracking-tight">*Densidad referencial (variable según marco de siembra y terreno)</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-950 p-4 rounded-t-lg border-b border-slate-800 gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {matrixData.archivo}
                  </h3>
                  <span className="bg-emerald-900/40 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-800 hidden md:inline-block">
                    Semáforo Activo 🚥
                  </span>
                </div>
                
                {/* NUEVO: Controles de Búsqueda y Exportación */}
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Filtrar por cinta (ej. ROJA)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-3 py-2 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <button 
                    onClick={exportToCSV}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span>📥</span> Exportar
                  </button>
                </div>
              </div>

              <div className="overflow-auto rounded-b-lg max-h-[50vh] relative">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-800 text-slate-200 sticky top-0 z-20">
                    <tr>
                      {matrixData.columnas?.map((col, idx) => {
                        const isFirst = idx === 0 && freezePanes;
                        return (
                          <th 
                            key={idx} 
                            className={`p-2 border-b border-slate-700 whitespace-nowrap bg-slate-800 font-semibold text-center ${
                              isFirst ? 'sticky left-0 z-30 border-r border-slate-700 bg-slate-800 shadow-md' : ''
                            }`}
                          >
                            {renderHeaderTitle(col)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950 font-mono">
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-900/80 transition-colors">
                          {matrixData.columnas.map((col, colIndex) => {
                            const isFirst = colIndex === 0 && freezePanes;
                            const cellClass = isFirst 
                                ? 'sticky left-0 z-10 bg-slate-950 border-r border-slate-800 shadow-md font-bold text-blue-300' 
                                : getCellColor(row[col], col);

                            return (
                              <td 
                                key={colIndex} 
                                className={`p-2 text-center whitespace-nowrap border-r border-slate-900 text-[11px] ${cellClass}`}
                              >
                                {formatValue(row[col])}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={matrixData.columnas?.length || 1} className="p-8 text-center text-slate-400">
                          No se encontraron resultados para "{searchTerm}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl min-h-[400px] flex flex-col items-center justify-center py-20 text-center shadow-lg">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 text-slate-400 text-xl">🚀</div>
            <h3 className="text-slate-200 font-semibold text-base mb-1">Esperando Datos</h3>
            <p className="text-slate-400 text-sm max-w-md">Sube el archivo Excel para que el servidor Render procese la matriz y despliegue el tablero.</p>
          </div>
        )}
      </main>
    </div>
  );
}