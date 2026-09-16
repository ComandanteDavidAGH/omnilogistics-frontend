'use client';
import { useState, useRef } from 'react';

export default function Page() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileSelection = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMatrixData(null);
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    
    // ⚡ INGESTA OMNI: Enviamos el archivo original COMPLETO, sin cortarlo.
    const formData = new FormData();
    formData.append("file", file);

    try {
      const BACKEND_URL = "https://omnilogistics-backend-6bbn.onrender.com/api/procesar-matriz"; 
      const response = await fetch(BACKEND_URL, { method: "POST", body: formData });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "El servidor rechazó el archivo");
      }
      
      const data = await response.json();
      setMatrixData(data);
    } catch (error) {
      console.error("Error al procesar:", error);
      alert("❌ Fallo en el Servidor:\n" + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setMatrixData(null);
    setSearchTerm('');
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  // =====================================================================
  // ⚡ GENESIS CORE v0.1: MOTOR DE REGLAS (Se mantiene táctico en frontend por ahora)
  // =====================================================================
  const runGenesisCore = (rows) => {
    if (!rows || rows.length === 0) return null;

    let totalIngresos = 0;
    let totalCostos = 0;
    let dineroEnRiesgo = 0;
    let hallazgos = [];

    rows.forEach((row, index) => {
      const getVal = (keyStr) => {
        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyStr.toLowerCase()));
        return key ? parseFloat(row[key]) : null;
      };
      const getString = (keyStr) => {
        const key = Object.keys(row).find(k => k.toLowerCase().includes(keyStr.toLowerCase()));
        return key ? row[key] : null;
      };

      const viaje = getString('Viaje') || getString('ID') || `Fila ${index + 1}`;
      const vehiculo = getString('Vehiculo') || getString('Unidad') || 'N/A';
      
      const ingreso = getVal('Ingreso') || getVal('Venta') || 0;
      const costo = getVal('Costo_Total') || getVal('Costo') || 0;
      const margen = getVal('Margen');
      const margenPct = getVal('Margen_%') || getVal('Margen %');
      
      const km = getVal('Km') || getVal('Kilometros');
      const litros = getVal('Litros_Diesel') || getVal('Combustible');
      const precioDiesel = getVal('Precio_Diesel') || 25.0; 
      const otrosCostos = getVal('Otros_Costos') || getVal('Extra') || 0;

      if (!isNaN(ingreso)) totalIngresos += ingreso;
      if (!isNaN(costo)) totalCostos += costo;

      // REGLA 1: MARGEN DESTRUIDO
      if (margenPct !== null && margenPct <= 0) {
        const impacto = Math.abs(margen || (ingreso - costo));
        dineroEnRiesgo += impacto;
        hallazgos.push({
          id: `F1-${viaje}`,
          prioridad: 1,
          tipo: 'MARGEN_CRITICO',
          titulo: `Pérdida Operativa - Viaje ${viaje}`,
          causa: otrosCostos > 1000 ? `Impacto severo por Costos Extraordinarios detectados (${formatMoney(otrosCostos)})` : 'El costo total superó los ingresos generados.',
          impacto: impacto,
          vehiculo: vehiculo,
          accion: `Auditar justificación de costos extraordinarios y retener pago de comisión al operador hasta aclarar.`
        });
      }

      // REGLA 2: HUACHICOL O INEFICIENCIA
      if (km && litros) {
        const rendimientoReal = km / litros;
        const rendimientoEsperado = 2.6; 
        if (rendimientoReal > 0 && rendimientoReal < 2.25) {
          const litrosDesperdiciados = litros - (km / rendimientoEsperado);
          const impactoCombustible = litrosDesperdiciados > 0 ? litrosDesperdiciados * precioDiesel : 0;
          
          if (impactoCombustible > 0) {
            dineroEnRiesgo += impactoCombustible;
            hallazgos.push({
              id: `F2-${viaje}`,
              prioridad: 2,
              tipo: 'FUGA_COMBUSTIBLE',
              titulo: `Consumo Anormal de Combustible - Viaje ${viaje}`,
              causa: `Rendimiento de ${rendimientoReal.toFixed(2)} km/L (Desviación del patrón de ${rendimientoEsperado} km/L).`,
              impacto: impactoCombustible,
              vehiculo: vehiculo,
              accion: `Cruzar bitácora de carga de diésel con telemetría GPS del motor para descartar extracción no autorizada.`
            });
          }
        }
      }
    });

    hallazgos.sort((a, b) => b.impacto - a.impacto);
    const topHallazgos = hallazgos.slice(0, 10);
    const margenGlobal = totalIngresos > 0 ? ((totalIngresos - totalCostos) / totalIngresos) * 100 : 0;

    return { totalIngresos, totalCostos, margenGlobal, dineroEnRiesgo, hallazgos: topHallazgos, totalHallazgos: hallazgos.length };
  };

  const rowList = matrixData ? (matrixData.filas || matrixData.datos || matrixData.matriz || matrixData.data || []) : [];
  const filteredRows = rowList.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return matrixData.columnas.some(col => String(row[col] || '').toLowerCase().includes(term));
  });

  const genesisResults = runGenesisCore(filteredRows);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white font-bold p-2 rounded-lg text-xs tracking-wider">GENESIS</div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">OMNI CORE v0.1</h1>
            <p className="text-xs text-slate-400">Motor de Inteligencia Económica Operacional</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-300 font-mono">Radar Económico: Activo</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
        
        {/* PANEL DE INGESTA CERO-CLICK */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-4 w-full md:w-auto">
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv"
                ref={fileInputRef} 
                onChange={handleFileSelection}
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
              />
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleFileUpload}
                  disabled={isLoading || !file}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-md"
                >
                  {isLoading ? 'Analizando...' : 'Ejecutar Auditoría Completa'}
                </button>

                {(matrixData || file) && (
                  <button onClick={handleClear} className="bg-slate-800 hover:bg-rose-900/80 text-slate-300 border border-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                    ✕ Limpiar
                  </button>
                )}
              </div>
            </div>

            {matrixData && (
              <div className="relative w-full md:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">🔍</span>
                <input 
                  type="text" 
                  placeholder="Filtrar cliente o vehículo..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* RADAR ECONÓMICO */}
        {genesisResults ? (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Operaciones Analizadas</p>
                <h4 className="text-2xl font-bold text-slate-100 font-mono">{filteredRows.length}</h4>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ingreso Operativo</p>
                <h4 className="text-2xl font-bold text-emerald-400 font-mono">{formatMoney(genesisResults.totalIngresos)}</h4>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Margen Global</p>
                <h4 className="text-2xl font-bold text-blue-400 font-mono">{genesisResults.margenGlobal.toFixed(2)}%</h4>
              </div>
              <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-900/50 shadow-md">
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">⚠️ Fuga Detectada</p>
                <h4 className="text-2xl font-bold text-rose-500 font-mono">{formatMoney(genesisResults.dineroEnRiesgo)}</h4>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Hallazgos Prioritarios</h3>
                  <p className="text-xs text-slate-400">GENESIS identificó {genesisResults.totalHallazgos} desviaciones que erosionan la rentabilidad.</p>
                </div>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider">Top 10 Fugas</span>
              </div>

              {genesisResults.hallazgos.length > 0 ? (
                <div className="space-y-4">
                  {genesisResults.hallazgos.map((hallazgo, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${hallazgo.prioridad === 1 ? 'bg-rose-950/20 border-rose-900/50' : 'bg-amber-950/10 border-amber-900/40'}`}>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hallazgo.prioridad === 1 ? 'bg-rose-900/50 text-rose-400' : 'bg-amber-900/50 text-amber-500'}`}>
                            {hallazgo.prioridad === 1 ? 'CRÍTICO' : 'ALTO'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Unidad: {hallazgo.vehiculo}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 mb-1">{hallazgo.titulo}</h4>
                        <p className="text-xs text-slate-400 mb-2">{hallazgo.causa}</p>
                        
                        {/* ⚡ NUEVO: ACCIÓN RECOMENDADA */}
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-800/80 inline-block">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <span>⚡</span> Acción Sugerida:
                          </p>
                          <p className="text-xs text-slate-300 mt-0.5">{hallazgo.accion}</p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 w-full sm:w-auto mt-3 sm:mt-0">
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Impacto Estimado</p>
                        <p className="text-lg font-bold font-mono text-rose-400">-{formatMoney(hallazgo.impacto)}</p>
                      </div>
                      
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center flex flex-col items-center justify-center">
                  <span className="text-4xl mb-3">✅</span>
                  <h4 className="text-slate-200 font-bold">Operación Saludable</h4>
                  <p className="text-sm text-slate-400 mt-1">GENESIS no detectó fugas críticas en este conjunto de datos.</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl min-h-[400px] flex flex-col items-center justify-center py-20 text-center shadow-lg">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 text-2xl">🧠</div>
            <h3 className="text-slate-200 font-semibold text-base mb-2">Motor GENESIS Inactivo</h3>
            <p className="text-slate-400 text-sm max-w-md">Carga el laboratorio de datos. El motor procesará todas las pestañas de forma simultánea.</p>
          </div>
        )}
      </main>
    </div>
  );
}