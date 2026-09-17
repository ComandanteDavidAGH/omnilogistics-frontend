'use client';
import { useState, useRef } from 'react';

export default function Page() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [semanticData, setSemanticData] = useState(null);
  const [genesisResults, setGenesisResults] = useState(null);
  
  const fileInputRef = useRef(null);
  const BACKEND_URL_BASE = "https://omnilogistics-backend-6bbn.onrender.com";

  const handleFileSelection = (e) => {
    setFile(e.target.files[0]);
    setGenesisResults(null);
    setSemanticData(null);
  };

  // 🧠 FASE 1: DATA UNDERSTANDING
  const handleSemanticCheck = async () => {
    if (!file) return;
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL_BASE}/api/v1/data-understanding`, { method: "POST", body: formData });
      if (!response.ok) throw new Error("El servidor rechazó la lectura semántica");
      
      const data = await response.json();
      setSemanticData(data);
    } catch (error) {
      console.error("Error semántico:", error);
      alert("❌ Fallo en FASE 1:\n" + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 💸 FASE 2: CÁLCULO ECONÓMICO (Legacy)
  const handleFullAudit = async () => {
    if (!file) return;
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL_BASE}/api/procesar-matriz`, { method: "POST", body: formData });
      if (!response.ok) throw new Error("El servidor rechazó el cálculo");
      
      const data = await response.json();
      setGenesisResults(data);
    } catch (error) {
      console.error("Error cálculo:", error);
      alert("❌ Fallo en FASE 2:\n" + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setGenesisResults(null);
    setSemanticData(null);
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  };

  const formatMoney = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white font-bold p-2 rounded-lg text-xs tracking-wider">GENESIS</div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">OMNI CORE v0.4 (Enterprise)</h1>
            <p className="text-xs text-slate-400">Motor de Inteligencia & Data Quality</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">
        
        {/* PANEL DE INGESTA */}
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
                {!semanticData && (
                  <button 
                    onClick={handleSemanticCheck}
                    disabled={isLoading || !file}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-md"
                  >
                    {isLoading ? 'Analizando Semántica...' : 'Paso 1: Comprensión de Datos'}
                  </button>
                )}

                {semanticData && !genesisResults && (
                  <button 
                    onClick={handleFullAudit}
                    disabled={isLoading || semanticData?.ambiguities?.length > 0}
                    className={`${semanticData?.ambiguities?.length > 0 ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600 hover:bg-emerald-500'} text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-md text-white`}
                  >
                    {isLoading ? 'Calculando...' : 'Paso 2: Calcular Impacto Económico'}
                  </button>
                )}

                {(genesisResults || semanticData || file) && (
                  <button onClick={handleClear} className="bg-slate-800 hover:bg-rose-900/80 text-slate-300 border border-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                    ✕ Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 🧠 CHECKPOINT: RESULTADOS SEMÁNTICOS */}
        {semanticData && !genesisResults && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg animate-fade-in">
            <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">🧠 Checkpoint: Comprensión Semántica</h3>
                <p className="text-xs text-slate-400">GENESIS analizó {semanticData.dataset?.columns} columnas y mapeó los tipos de datos.</p>
              </div>
            </div>

            {/* Mapeos Exitosos */}
            <div className="mb-6">
              <h4 className="text-xs uppercase font-bold text-slate-500 mb-3">Mapeo de Alta Confianza</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(semanticData.fields_mapping || {}).map(([col, data], idx) => (
                  <div key={idx} className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg">
                    <p className="text-[10px] text-slate-400 mb-1">Columna original: <span className="text-slate-300 font-bold">{col}</span></p>
                    <p className="text-sm font-mono text-emerald-400 font-bold">{data.canonical}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded text-slate-500 border border-slate-800 uppercase">{data.detected_type}</span>
                      <span className="text-[10px] text-emerald-500">{data.confidence * 100}% Confianza</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ambigüedades / Guardarraíl */}
            {semanticData.ambiguities && semanticData.ambiguities.length > 0 && (
              <div className="bg-rose-950/20 border border-rose-900/50 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-2">⚠️ Acción Requerida: Ambigüedad Detectada</h4>
                <p className="text-xs text-slate-400 mb-4">El motor no pudo clasificar las siguientes columnas con suficiente confianza por cruce de tipos de datos o nombres imprecisos. Valida antes de calcular economía.</p>
                
                <div className="space-y-2">
                  {semanticData.ambiguities.map((amb, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded flex justify-between items-center border border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-slate-200">{amb.original_column}</span>
                        <span className="text-[10px] text-slate-500 ml-2 uppercase">({amb.detected_type})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">Posible match: </span>
                        <span className="text-xs font-mono text-amber-500 font-bold">{amb.possible_match}</span>
                        <span className="text-[10px] text-rose-500 ml-3">({Math.round(amb.confidence * 100)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 💸 RESULTADOS DE GENESIS (Legacy - solo se muestra tras pasar FASE 2) */}
        {genesisResults && (
           <div className="bg-slate-900 p-6 rounded-xl border border-emerald-900/30 text-center animate-fade-in shadow-lg">
              <span className="text-4xl mb-3 block">✅</span>
              <h3 className="text-lg font-bold text-slate-100 mb-2">Auditoría Financiera Ejecutada</h3>
              <p className="text-sm text-slate-400 mb-4">GENESIS calculó un ingreso operativo de {formatMoney(genesisResults.analisis.totalIngresos)} y detectó {genesisResults.analisis.totalHallazgos} hallazgos.</p>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                 <div className="bg-slate-950 p-4 rounded border border-slate-800"><p className="text-[10px] uppercase text-slate-500">Ingreso Operativo</p><p className="text-xl font-mono text-emerald-400">{formatMoney(genesisResults.analisis.totalIngresos)}</p></div>
                 <div className="bg-slate-950 p-4 rounded border border-slate-800"><p className="text-[10px] uppercase text-slate-500">Margen Global</p><p className="text-xl font-mono text-blue-400">{genesisResults.analisis.margenGlobal}%</p></div>
                 <div className="bg-rose-950/20 p-4 rounded border border-rose-900/30"><p className="text-[10px] uppercase text-rose-500">Exposición</p><p className="text-xl font-mono text-rose-400">{formatMoney(genesisResults.analisis.dineroEnRiesgo)}</p></div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
}