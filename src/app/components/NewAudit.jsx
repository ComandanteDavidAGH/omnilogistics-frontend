'use client';
import { useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import MappingReview, { findDuplicates, initialDecisions, keyOf } from './MappingReview';
import Results from './Results';

const STEPS = ['Elegir archivo', 'Revisar columnas', 'Ver resultados'];

function Steps({ current }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Progreso">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} aria-current={active ? 'step' : undefined}
            className={`px-3 py-1.5 rounded-lg text-sm border ${done ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : active ? 'bg-blue-950/30 border-blue-800/50 text-blue-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
            {done ? '✓ ' : ''}{label}
          </li>
        );
      })}
    </ol>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div role="alert" className="bg-rose-950/30 border border-rose-900/60 text-rose-200 text-sm rounded-lg px-4 py-3">
      <p>{error.message}</p>
      {error.requestId && <p className="text-xs text-rose-300/70 mt-1">Código de soporte: {error.requestId}</p>}
    </div>
  );
}

export default function NewAudit({ apiKey }) {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [confirmed, setConfirmed] = useState(new Set());
  const [audit, setAudit] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const pending = useMemo(() => {
    if (!analysis) return [];
    const out = [];
    Object.entries(analysis.sheets_analysis).forEach(([sheet, a]) =>
      a.ambiguities.forEach((amb) => {
        if (amb.requires_decision && !confirmed.has(keyOf(sheet, amb.original_column))) out.push({ sheet, col: amb.original_column });
      })
    );
    return out;
  }, [analysis, confirmed]);

  const duplicates = useMemo(() => findDuplicates(decisions), [decisions]);
  const hasDuplicates = Object.values(duplicates).some((s) => s.size > 0);
  const step = audit ? 2 : analysis ? 1 : 0;

  function reset() {
    setFile(null); setAnalysis(null); setDecisions({}); setConfirmed(new Set()); setAudit(null); setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onPick(e) {
    setFile(e.target.files?.[0] || null);
    setAnalysis(null); setAudit(null); setError(null); setDecisions({}); setConfirmed(new Set());
  }

  async function scan() {
    setBusy('scan'); setError(null);
    try {
      const res = await api.understand(apiKey, file);
      setAnalysis(res);
      setDecisions(initialDecisions(res));
      setConfirmed(new Set());
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  async function run() {
    setBusy('run'); setError(null);
    try {
      const mapping = {};
      for (const [sheet, cols] of Object.entries(decisions)) {
        mapping[sheet] = {};
        for (const [col, canonical] of Object.entries(cols)) mapping[sheet][col] = canonical || 'UNKNOWN';
      }
      setAudit(await api.createAudit(apiKey, file, mapping));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const confirmAll = () =>
    setConfirmed((prev) => {
      const next = new Set(prev);
      pending.forEach((p) => next.add(keyOf(p.sheet, p.col)));
      return next;
    });

  const ignorePending = () => {
    setDecisions((prev) => {
      const next = { ...prev };
      pending.forEach((p) => { next[p.sheet] = { ...next[p.sheet], [p.col]: 'UNKNOWN' }; });
      return next;
    });
    confirmAll();
  };

  return (
    <div className="space-y-5">
      <Steps current={step} />

      {!audit && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="file" className="sr-only">Archivo Excel o CSV</label>
            <input id="file" ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onPick}
              className="text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer" />
            {!analysis && (
              <button type="button" onClick={scan} disabled={!file || busy}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-semibold px-5 py-2 rounded-lg">
                {busy === 'scan' ? 'Leyendo el archivo…' : 'Leer archivo'}
              </button>
            )}
            {(file || analysis) && (
              <button type="button" onClick={reset} className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2">Empezar de nuevo</button>
            )}
          </div>
          <p className="text-xs text-slate-500">Acepta .xlsx, .xls y .csv. Con varias hojas, GENESIS las cruza por ID de viaje. El archivo no se guarda: solo se conservan los resultados.</p>
          <ErrorBox error={error} />
        </div>
      )}

      {analysis && !audit && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-100">Revisa qué significa cada columna</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {analysis.sheets_detected} hoja(s) · {analysis.total_records.toLocaleString('es-CO')} registros.{' '}
                  {pending.length > 0
                    ? `Falta confirmar ${pending.length} columna(s) que GENESIS no pudo identificar con certeza.`
                    : 'Todo está listo para calcular.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {pending.length > 0 && (
                  <>
                    <button type="button" onClick={confirmAll} className="text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2">Confirmar sugerencias</button>
                    <button type="button" onClick={ignorePending} className="text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2">Ignorar las pendientes</button>
                  </>
                )}
                <button type="button" onClick={run} disabled={busy || pending.length > 0 || hasDuplicates}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-semibold px-5 py-2 rounded-lg">
                  {busy === 'run' ? 'Calculando…' : 'Calcular auditoría'}
                </button>
              </div>
            </div>
            {hasDuplicates && <p role="alert" className="text-sm text-rose-300 mt-3">Hay un campo asignado a dos columnas de la misma hoja. Deja solo una.</p>}
            <div className="mt-3"><ErrorBox error={error} /></div>
          </div>
          <MappingReview analysis={analysis} decisions={decisions} setDecisions={setDecisions}
            confirmed={confirmed} setConfirmed={setConfirmed} duplicates={duplicates} />
        </>
      )}

      {audit && <Results audit={audit} apiKey={apiKey} onNew={reset} />}
    </div>
  );
}