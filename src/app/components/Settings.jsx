'use client';

import { useState } from 'react';

export default function Settings({ me }) {
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Reglas de la Empresa</h2>
      <form onSubmit={handleSave} className="space-y-4 max-w-xl bg-slate-900 p-6 border border-slate-800 rounded-xl text-sm">
        <div>
          <label htmlFor="companyNameInput" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Organización
          </label>
          <input
            id="companyNameInput"
            type="text"
            defaultValue={me?.name || 'OmniLogistics Enterprise'}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium"
          />
        </div>

        {saved && <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 rounded-lg">Configuración guardada correctamente.</div>}

        <button
          type="submit"
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
        >
          Guardar Cambios
        </button>
      </form>
    </div>
  );
}