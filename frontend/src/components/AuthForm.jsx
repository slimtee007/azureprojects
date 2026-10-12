import { useState } from 'react';
import { apiFetch } from '../api.js';

export default function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') {
        const created = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: { email, password },
        });
        if (!created.ok) {
          setError(created.message);
          return;
        }
      }
      const login = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (!login.ok) {
        setError(login.message);
        return;
      }
      onAuthed({ token: login.data.token, user: login.data.user });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-card">
      <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="muted">
        {mode === 'login'
          ? 'Sign in to manage your secure cloud files.'
          : 'Files are stored in Azure Blob-compatible storage with private access.'}
      </p>
      <form onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <div className="auth-switch">
        {mode === 'login' ? (
          <>
            New to AzureDrop?{' '}
            <button type="button" className="link" onClick={() => switchMode('register')}>
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button type="button" className="link" onClick={() => switchMode('login')}>
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
