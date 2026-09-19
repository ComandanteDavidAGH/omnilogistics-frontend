'use client';

import { useEffect, useState } from 'react';
import { api } from './lib/api.js';

import * as LoginGateMod from './components/LoginGate.jsx';
import * as NewAuditMod from './components/NewAudit.jsx';
import * as HistoryMod from './components/History.jsx';
import * as TasksMod from './components/Tasks.jsx';
import * as SettingsMod from './components/Settings.jsx';

const LoginGate = LoginGateMod.default || LoginGateMod.LoginGate || (() => null);
const NewAudit = NewAuditMod.default || NewAuditMod.NewAudit || (() => null);
const History = HistoryMod.default || HistoryMod.History || (() => null);
const Tasks = TasksMod.default || TasksMod.Tasks || (() => null);
const Settings = SettingsMod.default || SettingsMod.Settings || (() => null);

const TABS = [
  { id: 'new', label: 'Nueva auditoría' },
  { id: 'history', label: 'Historial' },
  { id: 'tasks', label: 'Tareas' },
  { id: 'settings', label: 'Reglas de la empresa' },
];
const STORAGE_KEY = 'genesis_api_key';

function Page() {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('new');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (!saved) {
      setReady(true);
      return;
    }
    api.me(saved)
      .then((m) => {
        setApiKey(saved);
        setMe(m);
      })
      .catch(() => sessionStorage.removeItem(STORAGE_KEY))
      .finally(() => setReady(true));
  }, []);

  function login(key, profile) {
    sessionStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    setMe(profile);
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setMe(null);
    setTab('new');
  }

  if (!ready) return <div className="min-h-screen bg-slate-950" />;
  if (!apiKey || !me) return <LoginGate onLogin={login} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white font-bold px-2.5 py-1.5 rounded-lg text-sm">GENESIS</div>
          <div>
            <h1 className="text-sm font-semibold">{me.name}</h1>
            <p className="text-xs text-slate-400">Inteligencia económica para transporte · motor {me.engine_version}</p>
          </div>
        </div>
        <button type="button" onClick={logout} className="text-sm text-slate-400 hover:text-slate-200 underline underline-offset-2">
          Salir
        </button>
      </header>

      <nav className="border-b border-slate-800 bg-slate-950 px-6" aria-label="Secciones">
        <ul className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`px-4 py-3 text-sm border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  tab === t.id ? 'border-emerald-500 text-white font-medium' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
        {tab === 'new' && <NewAudit apiKey={apiKey} />}
        {tab === 'history' && <History apiKey={apiKey} />}
        {tab === 'tasks' && <Tasks apiKey={apiKey} />}
        {tab === 'settings' && <Settings apiKey={apiKey} me={me} onSaved={(config) => setMe({ ...me, config })} />}
      </main>
    </div>
  );
}

export default Page;