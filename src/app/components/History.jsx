'use client';
import DynamicCharts from './DynamicCharts';

export default function History() {
  // Datos de prueba simulando el resultado de tu backend para que el motor visual arranque
  const sampleData = [
    { ID_OPERACION: 'OP-001', INGRESO_2025: 4500, INGRESO_2026: 5200, GASTO_2025: 3000, GASTO_2026: 3100 },
    { ID_OPERACION: 'OP-002', INGRESO_2025: 3800, INGRESO_2026: 4100, GASTO_2025: 2500, GASTO_2026: 2800 },
    { ID_OPERACION: 'OP-003', INGRESO_2025: 2900, INGRESO_2026: 3500, GASTO_2025: 2000, GASTO_2026: 2200 },
    { ID_OPERACION: 'OP-004', INGRESO_2025: 5500, INGRESO_2026: 6100, GASTO_2025: 3500, GASTO_2026: 3800 },
  ];
  const sampleColumns = ['ID_OPERACION', 'INGRESO_2025', 'INGRESO_2026', 'GASTO_2025', 'GASTO_2026'];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Resultados de Auditoría</h2>
          <p className="text-slate-400 text-sm">Visualización analítica interactiva del último procesamiento.</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-md text-xs font-bold block mb-1">
            ESTADO: COMPLETADO
          </span>
          <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">
            ID: AUDIT-{Math.floor(Math.random() * 10000)}
          </span>
        </div>
      </div>
      
      {/* Aquí inyectamos el motor gráfico que construiste */}
      <DynamicCharts 
        columns={sampleColumns} 
        data={sampleData} 
        yearA="2025" 
        yearB="2026" 
      />
    </div>
  );
}