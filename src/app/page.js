'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import DynamicCharts from './components/DynamicCharts';

export default function Dashboard() {
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      // Si solo hay una hoja, procesarla directamente
      if (wb.SheetNames.length === 1) {
        processSheet(wb, wb.SheetNames[0]);
      } else {
        // Limpiar datos previos si hay múltiples hojas para que el bot pregunte
        setFileData(null);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    // Convertir a matriz de matrices (Array of Arrays)
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    // --- OMNIPARSER: EL CEREBRO DE VISIÓN ESPACIAL ---
    
    // 1. Limpiar filas completamente vacías
    const cleanAoA = aoa.filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));
    if (cleanAoA.length < 2) {
        setFileData([]);
        return;
    }

    // 2. RASTREO TÉRMICO: Buscar la verdadera fila de Títulos (Ignorar títulos flotantes)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, cleanAoA.length); i++) {
        let colsWithData = cleanAoA[i].filter(c => c !== undefined && String(c).trim() !== '').length;
        if (colsWithData > 1) {
            headerRowIndex = i;
            // Si la fila de abajo tiene números, esta es definitivamente la cabecera
            if (cleanAoA[i+1] && cleanAoA[i+1].some(c => !isNaN(parseFloat(c)))) {
                break;
            }
        }
    }

    const colHeaders = cleanAoA[headerRowIndex];
    const dataRows = cleanAoA.slice(headerRowIndex + 1);

    // 3. DETECCIÓN DE GRAVEDAD: ¿Es una Matriz (Textos en Y y X, números al centro)?
    let numCount = 0;
    let cellCount = 0;
    for(let i = 0; i < Math.min(5, dataRows.length); i++) {
        for(let j = 1; j < dataRows[i].length; j++) {
            if (dataRows[i][j] !== undefined && String(dataRows[i][j]).trim() !== '') {
                cellCount++;
                if (!isNaN(parseFloat(dataRows[i][j]))) numCount++;
            }
        }
    }

    // Si más del 60% de la zona de datos son números, la IA deduce que es una Matriz
    const isMatrix = cellCount > 0 && (numCount / cellCount) > 0.6; 

    let finalData = [];
    
    if (isMatrix) {
        // 4A. APLANAMIENTO UNIVERSAL (Metamorfosis T-1000)
        for (let i = 0; i < dataRows.length; i++) {
            const rowHeader = dataRows[i][0] || `Fila_${i}`; // El texto de la izquierda (Ej. EMBOLSE)
            for (let j = 1; j < dataRows[i].length; j++) {
                const val = dataRows[i][j];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    finalData.push({
                        "Categoria_Y": String(rowHeader).trim(),
                        "Atributo_X": String(colHeaders[j] || `Col_${j}`).trim(),
                        "Valor_Numerico": isNaN(parseFloat(val)) ? val : parseFloat(val)
                    });
                }
            }
        }
    } else {
        // 4B. TABLA PLANA ESTÁNDAR
        const headers = colHeaders.map((h, i) => h || `Columna_${i}`);
        for (let i = 0; i < dataRows.length; i++) {
            let rowObj = {};
            headers.forEach((h, j) => {
                rowObj[h] = dataRows[i][j];
            });
            finalData.push(rowObj);
        }
    }
    
    setFileData(finalData);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABECERA Y PUERTA DE ENTRADA */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="text-blue-500">⚡</span> OmniLogistics OS
            </h1>
            <p className="text-emerald-400 font-bold text-sm">Cerebro OmniParser Activo (Visión Espacial)</p>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold cursor-pointer transition-colors shadow-lg">
              📂 Subir Archivo
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
            {fileData && (
              <button onClick={() => {setFileData(null); setWorkbook(null); setSheetNames([]);}} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg font-bold border border-slate-700">
                Limpiar Memoria
              </button>
            )}
          </div>
        </div>

        {/* INTERFAZ MULTI-PESTAÑA (La intuición de profundidad) */}
        {sheetNames.length > 1 && !fileData && (
          <div className="bg-indigo-950/40 border border-indigo-500/50 p-8 rounded-xl shadow-2xl text-center animate-fade-in">
            <div className="text-5xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-white mb-2">¡He detectado múltiples dimensiones!</h2>
            <p className="text-indigo-200 mb-6">Este archivo de Excel contiene {sheetNames.length} ecosistemas (Hojas) diferentes. ¿Cuál quieres que aplane y analice hoy?</p>
            <div className="flex flex-wrap justify-center gap-3">
              {sheetNames.map((sheet, idx) => (
                <button 
                  key={idx} 
                  onClick={() => processSheet(workbook, sheet)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-full shadow-lg border border-indigo-400 transition-transform transform hover:scale-105"
                >
                  📄 {sheet}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RENDER DEL TABLERO PERFECTO */}
        {fileData && fileData.length > 0 && (
          <DynamicCharts 
            columns={Object.keys(fileData[0])} 
            data={fileData} 
            yearA="2025" 
            yearB="2026" 
          />
        )}

      </div>
    </div>
  );
}