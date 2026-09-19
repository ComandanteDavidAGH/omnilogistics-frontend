'use client';
import { useState } from 'react';
import { api } from '../lib/api.js';

export default function LoginGate({ onLogin }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await api.me(key.trim());
      onLogin(key.trim(), profile);
    } catch (err) {
      setError(err.message || 'Clave no válida o servidor no disponible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
            GENESIS CORE v1.0
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Acceso al Sistema</h1>
          <p className="text-sm text-slate-400">Ingresa tu API Key de cliente para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKeyInput" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              API Key (sk_...)
            </label>
            <input
              id="apiKeyInput"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk_admin_genesis_..."
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono text-sm"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-semibold rounded-lg text-sm transition-colors shadow-lg"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}