import { useEffect, useState } from 'react';
import { apiFetch, formatBytes, formatDate } from '../api.js';

export default function SharePage({ shareToken }) {
  const [state, setState] = useState({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch(`/api/shares/${shareToken}`);
      if (cancelled) return;
      if (res.ok) {
        setState({ phase: 'ready', ...res.data });
      } else {
        setState({ phase: 'invalid', message: res.message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">▾</span>
          AzureDrop
        </div>
      </header>
      <main className="main">
        <div className="auth-card">
          {state.phase === 'loading' && <p className="muted">Loading share…</p>}
          {state.phase === 'invalid' && (
            <>
              <h1>Link unavailable</h1>
              <div className="alert alert-error">
                {state.message || 'Share link is invalid, expired or revoked.'}
              </div>
            </>
          )}
          {state.phase === 'ready' && (
            <>
              <h1>A file was shared with you</h1>
              <div className="share-file">
                <div className="file-name">{state.file.name}</div>
                <div className="muted">
                  {formatBytes(state.file.sizeBytes)} · shared link expires{' '}
                  {formatDate(state.share.expiresAt)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => window.open(state.download.url, '_blank', 'noopener')}
              >
                Download file
              </button>
              <p className="muted">
                Downloads use a short-lived signed URL valid until{' '}
                {formatDate(state.download.expiresAt)}.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
