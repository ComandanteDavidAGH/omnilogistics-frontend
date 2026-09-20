'use client';
import { useState } from 'react';

export default function MappingReview({ data, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(data?.sheets_analysis || {});

  const handleConfirm = () => {
    // Le pasamos al backend la estructura tal cual la aprobó el usuario
    onConfirm(mapping);
  };

  if (!data || !data.sheets_analysis) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl max-w-4xl mx-auto">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-emerald-500">🧠</span> Revisión de Inteligencia Artificial
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          La IA analizó {data.total_records} registros en {data.sheets_detected} hojas. Revisa y confirma el emparejamiento de variables.
        </p>
      </div>
      
      <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        {Object.entries(mapping).map(([sheetName, sheetData]) => (
          <div key={sheetName} className="bg-slate-950 p-5 rounded-lg border border-slate-800 shadow-inner">
            <h3 className="text-emerald-400 font-bold mb-4 border-b border-slate-800/60 pb-2 flex items-center justify-between">
              Hoja: {sheetName}
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                {sheetData.records} filas detectadas
              </span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Object.entries(sheetData.fields_mapping).map(([col, mapData]) => (
                <div key={col} className="bg-slate-900 p-3 rounded-md border border-slate-700/50 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate" title={col}>
                    Origen: {col}
                  </span>
                  <span className="text-white font-mono text-sm">
                    ➔ {mapData.canonical}
                  </span>
                </div>
              ))}
            </div>

            {/* ZONA DE CONFLICTOS/AMBIGÜEDADES */}
            {sheetData.ambiguities && sheetData.ambiguities.length > 0 && (
              <div className="mt-5 border border-rose-900/50 bg-rose-950/20 p-4 rounded-lg">
                <h4 className="text-rose-400 text-xs font-bold mb-3 uppercase flex items-center gap-2">
                  <span>⚠️</span> Requiere Decisión Humana
                </h4>
                {sheetData.ambiguities.map((amb, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm bg-slate-900/50 p-3 rounded border border-rose-900/30">
                    <span className="text-slate-300">
                      ¿Qué es la columna <strong className="text-white">{amb.original_column}</strong>?
                    </span>
                    <select 
                      className="bg-slate-950 text-white border border-slate-700 rounded-md px-3 py-1.5 outline-none focus:border-emerald-500 text-xs w-full sm:w-48"
                      onChange={(e) => {
                        const newMapping = { ...mapping };
                        // Convertir la ambigüedad en un mapeo firme
                        newMapping[sheetName].fields_mapping[amb.original_column] = {
                          canonical: e.target.value,
                          confidence: 1,
                          detected_type: amb.detected_type
                        };
                        setMapping(newMapping);
                      }}
                    >
                      <option value="">Seleccionar Destino...</option>
                      <option value="STATUS">Estado Operativo (STATUS)</option>
                      <option value="REVENUE">Ingreso Económico (REVENUE)</option>
                      <option value="COST">Gasto/Costo (COST)</option>
                      <option value="IGNORE">Ignorar esta columna</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
        <button onClick={onCancel} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg font-semibold transition-colors">
          Cancelar
        </button>
        <button onClick={handleConfirm} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg font-semibold transition-colors shadow-lg flex items-center gap-2">
          <span>⚡</span> Ejecutar Auditoría Final
        </button>
      </div>
    </div>
  );
}