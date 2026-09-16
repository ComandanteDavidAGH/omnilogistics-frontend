'use client';
import { useState, useRef } from 'react';

export default function Page() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // Reemplazamos la matriz vieja por los resultados inteligentes del backend
  const [genesisResults, setGenesisResults] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileSelection = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setGenesisResults(null);
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    
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
      
      // ⚡ EL TRASPLANTE: La pantalla recibe la inteligencia procesada desde el servidor
      setGenesisResults({
        analisis: data.analisis,
        hallazgos: data.hallazgos
      });
      
    } catch (error) {
      console.error("Error al procesar:", error);
      alert("❌ Fallo en el Servidor:\n" + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setGenesisResults(null);
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white font-bold p-2 rounded-lg text-xs tracking-wider">GENESIS</div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">OMNI CORE v0.2</h1>
            <p className="text-xs text-slate-400">Motor de Inteligencia Económica Multi-Capa</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-slate-300 font-mono">Radar Económico: Conectado</span>
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
                  {isLoading ? 'Analizando 5 Capas...' : 'Ejecutar Auditoría Multi-Pestaña'}
                </button>

                {(genesisResults || file) && (
                  <button onClick={handleClear} className="bg-slate-800 hover:bg-rose-900/80 text-slate-300 border border-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                    ✕ Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RADAR ECONÓMICO DIRECTO DEL BACKEND */}
        {genesisResults ? (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Operaciones Analizadas</p>
                <h4 className="text-2xl font-bold text-slate-100 font-mono">{genesisResults.analisis.filasAnalizadas}</h4>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ingreso Operativo</p>
                <h4 className="text-2xl font-bold text-emerald-400 font-mono">{formatMoney(genesisResults.analisis.totalIngresos)}</h4>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Margen Global</p>
                <h4 className="text-2xl font-bold text-blue-400 font-mono">{genesisResults.analisis.margenGlobal.toFixed(2)}%</h4>
              </div>
              <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-900/50 shadow-md">
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">⚠️ Fuga Detectada</p>
                <h4 className="text-2xl font-bold text-rose-500 font-mono">{formatMoney(genesisResults.analisis.dineroEnRiesgo)}</h4>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Hallazgos Prioritarios</h3>
                  <p className="text-xs text-slate-400">GENESIS identificó {genesisResults.analisis.totalHallazgos} desviaciones auditando todas las pestañas.</p>
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
                  <p className="text-sm text-slate-400 mt-1">GENESIS no detectó fugas críticas en este conjunto de datos cruzado.</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl min-h-[400px] flex flex-col items-center justify-center py-20 text-center shadow-lg">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 text-2xl">🧠</div>
            <h3 className="text-slate-200 font-semibold text-base mb-2">Motor GENESIS v0.2 Inactivo</h3>
            <p className="text-slate-400 text-sm max-w-md">Carga el laboratorio de datos. El motor procesará todas las pestañas simultáneamente desde el servidor.</p>
          </div>
        )}
      </main>
    </div>
  );
}