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
  const [auditHistory, setAuditHistory] = useState([]);
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);
  const BACKEND_URL_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "https://omnilogistics-backend-6bbn.onrender.com";

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

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL_BASE}/api/v1/audit-records`);
      if (res.ok) {
        const data = await res.json();
        setAuditHistory(data);
      }
    } catch (e) {
      console.error("Error cargando historial:", e);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchHistory();
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
      await fetchHistory();
      showToast("💾 Auditoría completada y registrada");
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
        showToast(`💾 Estado guardado: ${newStatus.replace('_', ' ')}`);
      } else {
        showToast("❌ Error al guardar en base de datos", "error");
      }
    } catch (e) {
      showToast("❌ Error de conexión", "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`${BACKEND_URL_BASE}/api/v1/action-tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
        showToast(`🗑️ Tarea #${taskId} eliminada`);
      }
    } catch (e) {
      showToast("❌ Error al eliminar tarea", "error");
    }
  };

  const handleClearAllTasks = async () => {
    if (!confirm("¿Está seguro de eliminar todas las tareas guardadas?")) return;
    try {
      const res = await fetch(`${BACKEND_URL_BASE}/api/v1/action-tasks`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
        showToast("🧹 Bandeja purgada por completo");
      }
    } catch (e) {
      showToast("❌ Error al purgar tareas", "error");
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

  // EXPORTADOR NATIVO A EXCEL CON FORMATO EJECUTIVO (HTML TABULAR .XLS)
  const exportToExcel = () => {
    if (!genesisResults?.findings) return;

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Hallazgos de Auditoría</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; }
          .header-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
          .header-sub { font-size: 11px; color: #475569; margin-bottom: 15px; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 10px; border: 1px solid #1e293b; text-align: left; font-size: 12px; }
          td { padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; color: #1e293b; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .num-impact { color: #b91c1c; font-weight: bold; }
          .dept-tag { color: #0369a1; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">GENESIS CORE B2B — REPORTE DE AUDITORÍA ECONÓMICA</div>
        <div class="header-sub"><b>Fecha de Emisión:</b> ${new Date().toLocaleDateString('es-CO')} | <b>Calidad de Datos:</b> ${genesisResults.calidad_datos?.data_quality_score}% | <b>Confianza:</b> ${genesisResults.calidad_datos?.analytical_confidence}%</div>
        <table>
          <thead>
            <tr>
              <th width="80">Prioridad</th>
              <th width="220">Título del Hallazgo</th>
              <th width="320">Causa Raíz Detectada</th>
              <th width="140">Masa Monetaria en Riesgo</th>
              <th width="160">Departamento Asignado</th>
              <th width="300">Acción Requerida</th>
            </tr>
          </thead>
          <tbody>
    `;

    genesisResults.findings.forEach(f => {
      tableHtml += `
        <tr>
          <td class="text-center"><b>#${f.prioridad}</b></td>
          <td><b>${f.titulo || ''}</b></td>
          <td>${f.causa || ''}</td>
          <td class="text-right num-impact">$ ${new Intl.NumberFormat('es-CO').format(f.impacto?.impacto_directo || 0)}</td>
          <td class="dept-tag">[${f.accion?.departamento || ''}]</td>
          <td>${f.accion?.accion || ''}</td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GENESIS_Reporte_Auditoria_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("📊 Reporte de Excel exportado con éxito");
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
            <h1 className="text-base font-bold text-white tracking-tight">OMNI CORE v1.0.4 (Enterprise Dashboard)</h1>
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

        {/* RESULTADOS DE AUDITORÍA ACTUAL */}
        {genesisResults && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg space-y-6">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-4 gap-4">
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">📊 Resumen de Auditoría Económica</h3>
              <div className="flex gap-3 text-xs items-center">
                <span className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded text-slate-300">
                  Calidad: <strong className="text-emerald-400">{genesisResults.calidad_datos?.data_quality_score}%</strong>
                </span>
                <span className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded text-slate-300">
                  Confianza: <strong className="text-blue-400">{genesisResults.calidad_datos?.analytical_confidence}%</strong>
                </span>
                <button onClick={exportToExcel} className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg shadow-md transition-colors flex items-center gap-2 font-bold">
                  📊 Exportar Excel
                </button>
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

        {/* HISTORIAL DE AUDITORÍAS REGISTRADAS (POSTGRESQL) */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>📈</span> HISTORIAL DE AUDITORÍAS REGISTRADAS
            </h3>
            <span className="bg-blue-950 text-blue-400 text-xs px-2.5 py-1 rounded-full border border-blue-800 font-bold">
              {auditHistory.length} Registros
            </span>
          </div>

          {auditHistory.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No hay historial de auditorías registrado en PostgreSQL.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Archivo</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Calidad</th>
                    <th className="p-3">Ingresos Total</th>
                    <th className="p-3">Dinero en Riesgo</th>
                    <th className="p-3">Anomalías</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono text-slate-500">#{rec.id}</td>
                      <td className="p-3 font-bold text-slate-200">{rec.filename}</td>
                      <td className="p-3 text-slate-400">{new Date(rec.timestamp).toLocaleString('es-CO')}</td>
                      <td className="p-3"><span className="text-emerald-400 font-bold">{rec.quality_score}%</span></td>
                      <td className="p-3 font-mono text-emerald-400">{formatMoney(rec.financial_results?.totalIngresos)}</td>
                      <td className="p-3 font-mono text-rose-400">{formatMoney(rec.financial_results?.dineroEnRiesgo)}</td>
                      <td className="p-3 font-bold">{rec.anomalies_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* BANDEJA DE TAREAS PERSISTENTES */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <span>🗄️</span> BANDEJA DE ACCIÓN OPERATIVA (PostgreSQL)
            </h3>
            <div className="flex items-center gap-3">
              <span className="bg-emerald-950 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-800 font-bold">
                {persistentTasks.length} Tareas Persistidas
              </span>
              {persistentTasks.length > 0 && (
                <button onClick={handleClearAllTasks} className="bg-rose-950/50 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs px-3 py-1 rounded-lg font-bold transition-colors">
                  🧹 Limpiar Bandeja
                </button>
              )}
            </div>
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
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 border transition-colors outline-none cursor-pointer ${
                        t.status === 'RESUELTO' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                        t.status === 'EN_INVESTIGACION' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                        'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="EN_INVESTIGACION">EN INVESTIGACIÓN</option>
                      <option value="RESUELTO">RESUELTO</option>
                    </select>

                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 p-1.5 rounded-lg transition-colors text-xs"
                      title="Eliminar tarea"
                    >
                      🗑️
                    </button>
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