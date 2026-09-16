'use client';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

export default function Page() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [matrixData, setMatrixData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbook, setWorkbook] = useState(null);
  
  const [subTables, setSubTables] = useState([]);
  const [selectedSubTableIndex, setSelectedSubTableIndex] = useState(null);

  const fileInputRef = useRef(null);

  // ESCÁNER DE ARCHIPIÉLAGOS (INTACTO)
  const selectSheetAndDetectTables = (wb, sheetName) => {
    setSelectedSheet(sheetName);
    setMatrixData(null);
    setSubTables([]);
    setSelectedSubTableIndex(null);

    const ws = wb.Sheets[sheetName];
    const rawAoA = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let islands = [];
    let inIsland = false;
    let currentIsland = null;
    let emptyCount = 0;

    for (let i = 0; i < rawAoA.length; i++) {
      const row = rawAoA[i] || [];
      const filledCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
      const filledCount = filledCells.length;

      if (filledCount > 0) {
        emptyCount = 0;
        if (!inIsland) {
          inIsland = true;
          currentIsland = { start: i, end: i, name: `Matriz ${islands.length + 1}` };
          if (filledCount <= 4) {
            currentIsland.name = String(filledCells[0]).replace(/ /g, '').trim();
          }
        } else {
          currentIsland.end = i;
          if (currentIsland.start === i - 1 && filledCount <= 4 && currentIsland.name.startsWith('Matriz')) {
            currentIsland.name = String(filledCells[0]).replace(/ /g, '').trim();
          }
        }
      } else {
        emptyCount++;
        if (emptyCount >= 1 && inIsland) {
          islands.push({ ...currentIsland });
          inIsland = false;
        }
      }
    }
    if (inIsland && currentIsland) islands.push({ ...currentIsland });
    islands = islands.filter(isl => (isl.end - isl.start) >= 2);

    setSubTables(islands);
    if (islands.length === 1) {
      setSelectedSubTableIndex(0);
    }
  };

  const handleFileSelection = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMatrixData(null);
    setSheetNames([]);
    setSelectedSheet('');
    setWorkbook(null);
    setSubTables([]);
    setSelectedSubTableIndex(null);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        
        if (wb.SheetNames.length === 1) {
          selectSheetAndDetectTables(wb, wb.SheetNames[0]);
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleFileUpload = async () => {
    if (!file) { return; }
    setIsLoading(true);
    const formData = new FormData();
    let fileToSend = file;

    if (workbook && selectedSheet) {
      const ws = workbook.Sheets[selectedSheet];
      const rawAoA = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      let matrixToProcess = rawAoA;

      if (subTables.length > 0 && selectedSubTableIndex !== null) {
        const island = subTables[selectedSubTableIndex];
        matrixToProcess = rawAoA.slice(island.start, island.end + 1);
      }

      let absoluteMaxCols = 0;
      for (let i = 0; i < Math.min(30, matrixToProcess.length); i++) {
        const row = matrixToProcess[i] || [];
        const filledCols = row.filter(cell => cell && String(cell).trim() !== '').length;
        if (filledCols > absoluteMaxCols) absoluteMaxCols = filledCols;
      }

      let headerRowIdx = 0;
      const densityThreshold = Math.max(2, Math.floor(absoluteMaxCols * 0.75));
      for (let i = 0; i < Math.min(30, matrixToProcess.length); i++) {
        const row = matrixToProcess[i] || [];
        const filledCols = row.filter(cell => cell && String(cell).trim() !== '').length;
        if (filledCols >= densityThreshold) { headerRowIdx = i; break; }
      }

      const cleanedAoA = matrixToProcess.slice(headerRowIdx);
      const cleanedWs = XLSX.utils.aoa_to_sheet(cleanedAoA);
      
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, cleanedWs, selectedSheet);
      const wbout = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      fileToSend = new File([blob], file.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    formData.append("file", fileToSend);

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
    setSheetNames([]); 
    setSelectedSheet('');
    setSubTables([]);
    setSelectedSubTableIndex(null);
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  // =====================================================================
  // ⚡ GENESIS CORE v0.1: MOTOR DE REGLAS Y DETECCIÓN ECONÓMICA
  // =====================================================================
  const runGenesisCore = (rows) => {
    if (!rows || rows.length === 0) return null;

    let totalIngresos = 0;
    let totalCostos = 0;
    let dineroEnRiesgo = 0;
    let hallazgos = [];

    rows.forEach((row, index) => {
      // Helper para buscar columnas aunque tengan espacios o nombres parecidos
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

      // REGLA 1: MARGEN DESTRUIDO (Viajes a pérdida)
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
          vehiculo: vehiculo
        });
      }

      // REGLA 2: HUACHICOL O INEFICIENCIA (Rendimiento < 2.25 km/L)
      if (km && litros) {
        const rendimientoReal = km / litros;
        const rendimientoEsperado = 2.6; // Patrón base ficticio
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
              causa: `Rendimiento de ${rendimientoReal.toFixed(2)} km/L (Desviación severa del patrón de ${rendimientoEsperado} km/L).`,
              impacto: impactoCombustible,
              vehiculo: vehiculo
            });
          }
        }
      }
    });

    // Ordenar hallazgos de mayor a menor dinero perdido
    hallazgos.sort((a, b) => b.impacto - a.impacto);
    
    // Limitar a los 10 peores hallazgos para no saturar al gerente
    const topHallazgos = hallazgos.slice(0, 10);

    const margenGlobal = totalIngresos > 0 ? ((totalIngresos - totalCostos) / totalIngresos) * 100 : 0;

    return { 
      totalIngresos, 
      totalCostos, 
      margenGlobal, 
      dineroEnRiesgo, 
      hallazgos: topHallazgos,
      totalHallazgos: hallazgos.length
    };
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
        
        {/* PANEL DE INGESTA DE DATOS */}
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
                  disabled={isLoading || !file || (sheetNames.length > 1 && !selectedSheet) || (subTables.length > 1 && selectedSubTableIndex === null)}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-colors shadow-md"
                >
                  {isLoading ? 'Analizando...' : 'Ejecutar Diagnóstico'}
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

          {/* MENÚS DE SELECCIÓN DE HOJAS Y TABLAS */}
          {sheetNames.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
              <span className="text-[11px] font-semibold text-slate-400">Seleccionar Fuente:</span>
              <div className="flex flex-wrap gap-2">
                {sheetNames.map((sheet, idx) => (
                  <button key={idx} onClick={() => selectSheetAndDetectTables(workbook, sheet)} className={`text-[10px] px-3 py-1 rounded-full border transition-all ${selectedSheet === sheet ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                    📄 {sheet}
                  </button>
                ))}
              </div>
            </div>
          )}
          {subTables.length > 1  && (
            <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-3">
              <span className="text-[11px] font-semibold text-emerald-400">Bloques Detectados:</span>
              <div className="flex flex-wrap gap-2">
                {subTables.map((table, idx) => (
                  <button key={idx} onClick={() => setSelectedSubTableIndex(idx)} className={`text-[10px] px-3 py-1 rounded-full border transition-all ${selectedSubTableIndex === idx ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    📊 {table.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* LA PANTALLA DE GENESIS: EL RADAR ECONÓMICO */}
        {/* ========================================================= */}
        {genesisResults ? (
          <div className="space-y-6 animate-fade-in">
            
            {/* CABECERA FINANCIERA */}
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

            {/* LISTA DE HALLAZGOS (EL VENENO) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Hallazgos Prioritarios</h3>
                  <p className="text-xs text-slate-400">GENESIS identificó {genesisResults.totalHallazgos} desviaciones que erosionan la rentabilidad.</p>
                </div>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider">
                  Top 10 Fugas
                </span>
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
                        <p className="text-xs text-slate-400">{hallazgo.causa}</p>
                      </div>

                      <div className="text-left sm:text-right bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 w-full sm:w-auto">
                        <p className="text-[10px] uppercase text-slate-500 font-bold mb-0.5">Impacto Estimado</p>
                        <p className="text-lg font-bold font-mono text-rose-400">
                          -{formatMoney(hallazgo.impacto)}
                        </p>
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
            <p className="text-slate-400 text-sm max-w-md">Carga el laboratorio de datos para que el motor identifique las fugas de dinero y rentabilidad oculta.</p>
          </div>
        )}
      </main>
    </div>
  );
}