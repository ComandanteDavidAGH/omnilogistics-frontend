'use client';
import { useState, useRef, useEffect } from 'react';

const CANONICAL_LABELS = {
  "TRIP_ID": "ID de Viaje / Folio",
  "TRIP_DATE": "Fecha del Viaje",
  "DISTANCE_KM": "Distancia (Km)",
  "VEHICLE_ID": "Vehículo / Placa",
  "DRIVER_ID": "Conductor",
  "ROUTE_NAME": "Ruta / Trayecto",
  "CUSTOMER_NAME": "Cliente",
  "REVENUE": "Ingreso / Flete Facturado",
  "COST_FUEL": "Costo de Combustible",
  "COST_TOLL": "Costo de Peajes",
  "COST_MAINT": "Costo de Mantenimiento",
  "COST_DRIVER": "Costo de Conductor / Viáticos",
  "COST_OTHER": "Otros Costos Directos",
  "COST_TOTAL": "Costo Total Operacional",
  "VOLUME_LTS": "Volumen Combustible (Lts)",
  "VOLUME_GAL": "Volumen Combustible (Gal)",
  "UNKNOWN": "Ignorar Campo"
};

function ChecklistBar({ steps }) {
  const doneCount = steps.filter(s => s.done).length;
  const currentIndex = steps.findIndex(s => !s.done);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">GENESIS CONTROL CHECKLIST</span>
        <span className="text-[11px] text-slate-500">{doneCount}/{steps.length} Pasos Completados</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentIndex;
          const isDone = step.done;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${isDone ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400' :
                  isCurrent ? 'bg-blue-950/30 border-blue-800/50 text-blue-300' :
                  'bg-slate-950 border-slate-800 text-slate-500'}`}
            >
              <span>{isDone ? '✅' : isCurrent ? '🔵' : '⚪'}</span>
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [semanticData, setSemanticData] = useState(null);
  const [manualResolutions, setManualResolutions] = useState({});
  const [genesisResults, setGenesisResults] = useState(null);
  const [persistentTasks, setPersistentTasks] = useState([]);
  
  // NUEVO ESTADO: Alertas Flotantes (Toasts)
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);
  const BACKEND_URL_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "https://omnilogistics-backend-6bbn.onrender.com";

  // Función para mostrar notificaciones temporalmente (3 segundos)
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${BACKEND_URL_BASE}/api/v1/action-tasks`);
      if (res.ok) {
        const data = await res.json();
        setPersistentTasks(data);
      }
    } catch (e) {
      console.error("Error cargando tareas:", e);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleFileSelection = (e) => {
    setFile(e.target.files[0]);
    setGenesisResults(null);
    setSemanticData(null);
    setManualResolutions({});
    setErrorMsg(null);
  };

  const handleSemanticCheck = async () => {
    if (!file) return;
    setIsLoading(true);
    setErrorMsg(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL_BASE}/api/v1/data-understanding`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Error en escaneo");
      setSemanticData(data);
      showToast("✅ Archivo escaneado correctamente");
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllAmbiguities = () => {
    let all = [];
    if (semanticData?.sheets_analysis) {
      Object.entries(semanticData.sheets_analysis).forEach(([sheetName, sheet]) => {
        (sheet.ambiguities || []).forEach(amb => {
          all.push({ ...amb, sheetName, resolutionKey: `${sheetName}::${amb.original_column}` });
        });
      });
    }
    return all;
  };

  const allAmbiguities = getAllAmbiguities();
  const pendingAmbiguities = allAmbiguities.filter(amb => amb.requires_decision && !manualResolutions[amb.resolutionKey]);

  const handleResolveAmbiguity = (resolutionKey, canonicalValue) => {
    setManualResolutions(prev => ({ ...prev, [resolutionKey]: canonicalValue }));
  };

  const buildFinalMapping = () => {
    const mapping = {};
    if (semanticData?.sheets_analysis) {
      Object.entries(semanticData.sheets_analysis).forEach(([sheetName, sheet]) => {
        mapping[sheetName] = mapping[sheetName] || {};
        Object.entries(sheet.fields_mapping || {}).forEach(([col, data]) => {
          mapping[sheetName][col] = data.canonical;
        });
      });
    }
    Object.entries(manualResolutions).forEach(([key, canonical]) => {
      const [sheetName, col] = key.split("::");
      if (canonical && canonical !== "UNKNOWN") {
        mapping[sheetName] = mapping[sheetName] || {};
        mapping[sheetName][col] = canonical;
      }
    });
    return mapping;
  };

  const handleFullAudit = async () => {
    if (!file || !semanticData) return;
    setIsLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(buildFinalMapping()));

    try {
      const response = await fetch(`${BACKEND_URL_BASE}/api/procesar-matriz`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Error al procesar");
      setGenesisResults(data);
      await fetchTasks();
      showToast("💾 Auditoría completada y guardada en base de datos");
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`${BACKEND_URL_BASE}/api/v1/action-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus })
      });
      if (res.ok) {
        fetchTasks();
        // Disparador visual inmediato del éxito en base de datos
        showToast(`💾 Estado guardado en PostgreSQL: ${newStatus.replace('_', ' ')}`);
      } else {
        showToast("❌ Error al guardar en base de datos", "error");
      }
    } catch (e) {
      console.error("Error:", e);
      showToast("❌ Error de conexión", "error");
    }
  };

  const handleClear = () => {
    setFile(null);
    setGenesisResults(null);
    setSemanticData(null);
    setManualResolutions({});
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatMoney = (val) =>
    val === null || val === undefined ? 'N/D' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const steps = [
    { id: 'upload', label: '1. Ingesta', done: !!file },
    { id: 'analyze', label: '2. Entendimiento', done: !!semanticData },
    { id: 'resolve', label: '3. Mapeo Canónico', done: !!semanticData && pendingAmbiguities.length === 0 },
    { id: 'calculate', label: '4. Motor Económico', done: !!genesisResults },
    { id: 'review', label: '5. Plan de Acción', done: persistentTasks.length > 0 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* COMPONENTE TOAST (Notificación Flotante) */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl font-bold text-sm z-50 flex items-center gap-3 transition-all duration-300 border
          ${toast.type === 'error' ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-emerald-950 text-emerald-300 border-emerald-800'}
        `}>
          <span>{toast.message}</span>
        </div>
      )}

      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white font-bold p-2 rounded-lg text-xs tracking-wider">GENESIS</div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">OMNI CORE v1.0.3 (Enterprise UX)</h1>
            <p className="text-xs text-slate-400">Plataforma de Inteligencia y Auditoría Logística Persistente</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl w-full mx-auto space-y-6">

        <ChecklistBar steps={steps} />

        {/* CONTENEDOR DE INGESTA */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileSelection}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer" />
            <div className="flex items-center space-x-2">
              {!semanticData && (
                <button onClick={handleSemanticCheck} disabled={isLoading || !file}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md">
                  {isLoading ? 'Escaneando...' : 'Escanear Archivo'}
                </button>
              )}
              {semanticData && !genesisResults && (
                <button onClick={handleFullAudit} disabled={isLoading || pendingAmbiguities.length > 0}
                  className={`${pendingAmbiguities.length > 0 ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'} text-xs font-bold px-5 py-2 rounded-lg shadow-md text-white`}>
                  {isLoading ? 'Auditando...' : 'Ejecutar Auditoría Económica'}
                </button>
              )}
              {(genesisResults || semanticData || file) && (
                <button onClick={handleClear} className="bg-slate-800 hover:bg-rose-900/80 text-slate-300 border border-slate-700 text-xs font-medium px-4 py-2 rounded-lg">✕ Limpiar</button>
              )}
            </div>
          </div>
          {errorMsg && <div className="text-rose-400 text-xs font-medium">❌ {errorMsg}</div>}
        </div>

        {/* DATA UNDERSTANDING */}
        {semanticData && !genesisResults && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">🧠 Estructura y Entidades Detectadas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div><p className="text-[10px] text-slate-500 uppercase">Hojas Detectadas</p><p className="text-xl font-mono text-slate-200">{semanticData.sheets_detected}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase">Total Registros</p><p className="text-xl font-mono text-slate-200">{semanticData.total_records?.toLocaleString('es-CO')}</p></div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 uppercase mb-1">Entidades Identificadas</p>
                <div className="flex gap-2 flex-wrap">
                  {semanticData.global_entities?.map(ent => (
                    <span key={ent} className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded text-xs font-bold">{ent}</span>
                  ))}
                </div>
              </div>
            </div>

            {allAmbiguities.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Confirmación Manual de Campos</h4>
                <div className="space-y-2">
                  {allAmbiguities.map((amb, idx) => (
                    <div key={idx} className="p-3 rounded-lg flex flex-wrap gap-3 justify-between items-center bg-slate-900 border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase mr-2">[{amb.sheetName}]</span>
                        <span className="text-xs font-bold text-slate-200">{amb.original_column}</span>
                      </div>
                      <select
                        value={manualResolutions[amb.resolutionKey] || (amb.possible_match !== "UNKNOWN" ? amb.possible_match : "")}
                        onChange={(e) => handleResolveAmbiguity(amb.resolutionKey, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 w-64"
                      >
                        <option value="" disabled>Seleccionar campo canónico...</option>
                        {Object.entries(CANONICAL_LABELS).map(([id, label]) => (
                          <option key={id} value={id}>{label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULTADOS DE AUDITORÍA */}
        {genesisResults && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">📊 Resumen de Auditoría Económica</h3>
              <div className="flex gap-3 text-xs">
                <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded text-slate-300">
                  Calidad de Datos: <strong className="text-emerald-400">{genesisResults.calidad_datos?.data_quality_score}%</strong>
                </span>
                <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded text-slate-300">
                  Confianza Analítica: <strong className="text-blue-400">{genesisResults.calidad_datos?.analytical_confidence}%</strong>
                </span>
              </div>
            </div>

            {genesisResults.financials && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500">Ingreso Operativo Neto</p>
                  <p className="text-xl font-mono text-emerald-400 font-bold">{formatMoney(genesisResults.financials.totalIngresos)}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500">Costo Operacional</p>
                  <p className="text-xl font-mono text-slate-300 font-bold">{formatMoney(genesisResults.financials.totalCostos)}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500">Margen Global</p>
                  <p className="text-xl font-mono text-blue-400 font-bold">{genesisResults.financials.margenGlobal !== null ? `${genesisResults.financials.margenGlobal}%` : 'N/D'}</p>
                </div>
                <div className="bg-rose-950/20 p-4 rounded-lg border border-rose-900/30">
                  <p className="text-[10px] uppercase text-rose-500">Masa Monetaria en Riesgo</p>
                  <p className="text-xl font-mono text-rose-400 font-bold">{formatMoney(genesisResults.financials.dineroEnRiesgo)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BANDEJA DE TAREAS PERSISTENTES */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>🗄️</span> BANDEJA DE ACCIÓN OPERATIVA (PostgreSQL)
            </h3>
            <span className="bg-emerald-950 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-800 font-bold">
              {persistentTasks.length} Tareas Persistidas
            </span>
          </div>

          {persistentTasks.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No hay tareas registradas en la base de datos.</p>
          ) : (
            <div className="space-y-3">
              {persistentTasks.map((t) => (
                <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-wrap justify-between items-center gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50">
                        Task #{t.id}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{t.title}</span>
                      <span className="text-xs text-emerald-400 font-mono font-bold">[{t.department}]</span>
                    </div>
                    <p className="text-xs text-slate-400">{t.description}</p>
                    <p className="text-[10px] text-slate-500">Impacto: {formatMoney(t.financial_impact)} | Creado: {new Date(t.created_at).toLocaleString('es-CO')}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={t.status}
                      onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors outline-none ${
                        t.status === 'RESUELTO' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                        t.status === 'EN_INVESTIGACION' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                        'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="EN_INVESTIGACION">EN INVESTIGACIÓN</option>
                      <option value="RESUELTO">RESUELTO</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}