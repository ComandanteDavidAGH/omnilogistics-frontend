'use client';
import { useState } from 'react';
import { api } from '../lib/api';

export default function LoginGate({ onLogin }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api.me(key.trim());
      onLogin(key.trim(), me);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white font-bold px-2.5 py-1.5 rounded-lg text-sm">GENESIS</div>
          <div>
            <h1 className="text-base font-semibold">Inteligencia económica para transporte</h1>
          </div>
        </div>
        <label className="block text-sm text-slate-300" htmlFor="apikey">
          Clave de acceso de tu empresa
        </label>
        <input
          id="apikey"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="gk_..."
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={busy || key.trim().length < 8}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-semibold py-2 rounded-lg"
        >
          {busy ? 'Verificando…' : 'Entrar'}
        </button>
        <p className="text-xs text-slate-500">
          La clave te la entrega el administrador de la plataforma. Se guarda solo mientras esta pestaña esté abierta.
        </p>
      </form>
    </div>
  );
}