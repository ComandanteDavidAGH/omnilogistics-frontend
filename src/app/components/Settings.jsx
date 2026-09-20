'use client';
import { useState } from 'react';
import { api } from '../lib/api';
import { ErrorBox } from './NewAudit';

function Field({ id, label, help, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-slate-200">{label}</label>
      {children}
      {help && <p className="text-xs text-slate-500 max-w-md">{help}</p>}
    </div>
  );
}

const inputCls = 'w-32 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

export default function Settings({ apiKey, me, onSaved }) {
  const [cfg, setCfg] = useState(me.config);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => { setSaved(false); setCfg((c) => ({ ...c, [k]: v })); };

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const updated = await api.updateConfig(apiKey, {
        min_margin_percent: Number(cfg.min_margin_percent),
        z_score_threshold: Number(cfg.z_score_threshold),
        allow_negative_margin: !!cfg.allow_negative_margin,
        revenue_includes_vat: !!cfg.revenue_includes_vat,
        vat_rate: Number(cfg.vat_rate),
        outlier_min_group: Number(cfg.outlier_min_group),
        reconciliation_tolerance_pct: Number(cfg.reconciliation_tolerance_pct),
      });
      setCfg(updated);
      setSaved(true);
      onSaved?.(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 max-w-2xl">
      <div>
        <h2 className="font-semibold text-slate-100">Reglas de tu empresa</h2>
        <p className="text-sm text-slate-400 mt-1">Estos valores se aplican a todas las auditorías nuevas de {me.name}. Si los cambias, un mismo archivo se vuelve a calcular con las reglas nuevas.</p>
      </div>

      <Field id="minm" label="Margen mínimo aceptable (%)" help="Los viajes con margen positivo pero menor a este valor se reportan como «margen bajo».">
        <input id="minm" type="number" step="0.5" min="0" max="100" className={inputCls} value={cfg.min_margin_percent} onChange={(e) => set('min_margin_percent', e.target.value)} />
      </Field>

      <Field id="iva" label="Los ingresos del archivo incluyen IVA" help="Actívalo si el valor facturado trae IVA: se divide antes de calcular el margen para compararlo con costos sin IVA.">
        <div className="flex items-center gap-3">
          <input id="iva" type="checkbox" className="h-4 w-4 accent-emerald-500" checked={!!cfg.revenue_includes_vat} onChange={(e) => set('revenue_includes_vat', e.target.checked)} />
          <label htmlFor="rate" className="text-sm text-slate-400">Tarifa de IVA</label>
          <input id="rate" type="number" step="0.01" min="0" max="0.5" className={inputCls} value={cfg.vat_rate} onChange={(e) => set('vat_rate', e.target.value)} disabled={!cfg.revenue_includes_vat} />
        </div>
      </Field>

      <Field id="neg" label="Permitir viajes con margen negativo" help="Actívalo solo si tu operación acepta perder en algunos viajes (por ejemplo, retornos en vacío). Se dejan de reportar como pérdida.">
        <input id="neg" type="checkbox" className="h-4 w-4 accent-emerald-500" checked={!!cfg.allow_negative_margin} onChange={(e) => set('allow_negative_margin', e.target.checked)} />
      </Field>

      <Field id="z" label="Sensibilidad para valores atípicos" help="Valor más bajo = más alertas. 3,5 es el estándar; sube a 5 si recibes demasiadas.">
        <input id="z" type="number" step="0.5" min="2" max="10" className={inputCls} value={cfg.z_score_threshold} onChange={(e) => set('z_score_threshold', e.target.value)} />
      </Field>

      <Field id="grp" label="Mínimo de viajes por ruta para comparar" help="Una ruta con menos viajes que este número no se evalúa por separado.">
        <input id="grp" type="number" step="1" min="5" max="100" className={inputCls} value={cfg.outlier_min_group} onChange={(e) => set('outlier_min_group', e.target.value)} />
      </Field>

      <Field id="tol" label="Tolerancia al conciliar dos fuentes (%)" help="Diferencias menores a este porcentaje entre, por ejemplo, operación y facturación, no se reportan.">
        <input id="tol" type="number" step="0.5" min="0" max="50" className={inputCls} value={cfg.reconciliation_tolerance_pct} onChange={(e) => set('reconciliation_tolerance_pct', e.target.value)} />
      </Field>

      <ErrorBox error={error} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-semibold px-5 py-2 rounded-lg">
          {busy ? 'Guardando…' : 'Guardar reglas'}
        </button>
        {saved && <span role="status" className="text-sm text-emerald-300">Reglas guardadas</span>}
      </div>
    </form>
  );
}