import { useCallback, useEffect, useState } from 'react';
import AuthForm from './components/AuthForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import SharePage from './components/SharePage.jsx';
import { apiFetch } from './api.js';

function shareTokenFromPath() {
  const match = /^\/share\/([A-Za-z0-9_-]+)$/.exec(window.location.pathname);
  return match ? match[1] : null;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('azuredrop_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('azuredrop_user') || 'null');
    } catch {
      return null;
    }
  });
  const [health, setHealth] = useState(null);
  const shareToken = shareTokenFromPath();

  const handleAuthed = useCallback((auth) => {
    localStorage.setItem('azuredrop_token', auth.token);
    localStorage.setItem('azuredrop_user', JSON.stringify(auth.user));
    setToken(auth.token);
    setUser(auth.user);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('azuredrop_token');
    localStorage.removeItem('azuredrop_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const res = await apiFetch('/health');
      if (!cancelled) setHealth(res.ok ? res.data : { status: 'unreachable' });
    };
    check();
    const timer = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (shareToken) {
    return <SharePage shareToken={shareToken} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">▾</span>
          AzureDrop
        </div>
        <div className="topbar-right">
          <span
            className={`health-dot health-${health?.status || 'unknown'}`}
            title={`API health: ${health?.status || 'checking'} (db: ${health?.database || '?'}, storage: ${health?.storage || '?'})`}
          />
          <span className="health-label">
            {health?.status === 'healthy'
              ? 'All systems healthy'
              : health
                ? `API ${health.status}`
                : 'Checking…'}
          </span>
          {token && (
            <>
              <span className="user-email">{user?.email}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Sign out
              </button>
            </>
          )}
        </div>
      </header>
      <main className="main">
        {token ? (
          <Dashboard token={token} />
        ) : (
          <AuthForm onAuthed={handleAuthed} />
        )}
      </main>
      <footer className="footer">
        AzureDrop — Azure Blob storage via Azurite emulation · PostgreSQL metadata · Express API
      </footer>
    </div>
  );
}
