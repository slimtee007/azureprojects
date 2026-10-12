import { useCallback, useEffect, useState } from 'react';
import { apiFetch, formatBytes, formatDate } from '../api.js';

export default function Dashboard({ token }) {
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [shares, setShares] = useState({}); // fileId -> array of active shares

  const loadFiles = useCallback(
    async (search = '') => {
      const suffix = search ? `?query=${encodeURIComponent(search)}` : '';
      const res = await apiFetch(`/api/files${suffix}`, { token });
      if (res.ok) setFiles(res.data.files);
    },
    [token]
  );

  useEffect(() => {
    loadFiles(query);
  }, [loadFiles, query]);

  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const onUpload = async (event) => {
    event.preventDefault();
    const input = event.target.elements.file;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch('/api/files', { method: 'POST', token, body: form });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    input.value = '';
    flash(`Uploaded “${res.data.file.name}”`);
    loadFiles(query);
  };

  const onDownload = async (file) => {
    setError(null);
    const res = await apiFetch(`/api/files/${file.id}/download`, { token });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    window.open(res.data.url, '_blank', 'noopener');
  };

  const onShare = async (file) => {
    setError(null);
    const res = await apiFetch(`/api/files/${file.id}/share`, {
      method: 'POST',
      token,
      body: {},
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setShares((prev) => ({ ...prev, [file.id]: [res.data.share, ...(prev[file.id] || [])] }));
    flash('Share link created — copy it before it expires.');
  };

  const onRevoke = async (file, share) => {
    setError(null);
    const res = await apiFetch(`/api/shares/${share.id}`, { method: 'DELETE', token });
    if (!res.ok && res.status !== 404) {
      setError(res.message);
      return;
    }
    setShares((prev) => ({
      ...prev,
      [file.id]: (prev[file.id] || []).filter((s) => s.id !== share.id),
    }));
    flash('Share link revoked.');
    loadFiles(query);
  };

  const onDelete = async (file) => {
    if (!window.confirm(`Delete “${file.name}”? This cannot be undone.`)) return;
    setError(null);
    const res = await apiFetch(`/api/files/${file.id}`, { method: 'DELETE', token });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    flash(`Deleted “${file.name}”.`);
    loadFiles(query);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      flash('Link copied to clipboard.');
    } catch {
      window.prompt('Copy the share link:', text);
    }
  };

  return (
    <div className="dashboard">
      <section className="card">
        <h2>Upload a file</h2>
        <p className="muted">
          Stored as a private Azure Blob object with a short-lived signed download URL. Max{' '}
          {formatBytes(25 * 1024 * 1024)} per file.
        </p>
        <form className="upload-row" onSubmit={onUpload}>
          <input type="file" name="file" required />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="files-head">
          <h2>Your files</h2>
          <input
            type="search"
            className="search"
            placeholder="Search by file name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {notice && <div className="alert alert-ok">{notice}</div>}

        {files.length === 0 ? (
          <p className="muted empty">
            {query ? 'No files match your search.' : 'No files yet — upload your first one above.'}
          </p>
        ) : (
          <table className="file-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Type</th>
                <th>Uploaded</th>
                <th>Shares</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="file-name" title={file.name}>{file.name}</td>
                  <td>{formatBytes(file.sizeBytes)}</td>
                  <td className="muted">{file.mimeType}</td>
                  <td className="muted">{formatDate(file.createdAt)}</td>
                  <td>{file.shareCount || 0}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-small" onClick={() => onDownload(file)}>
                      Download
                    </button>
                    <button type="button" className="btn btn-small" onClick={() => onShare(file)}>
                      Share
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => onDelete(file)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {Object.entries(shares).map(([fileId, list]) =>
          list.length === 0 ? null : (
            <div className="share-panel" key={fileId}>
              <h3>Active share links</h3>
              {list.map((share) => (
                <div className="share-row" key={share.id}>
                  <input type="text" readOnly value={share.url} onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn-small" onClick={() => copy(share.url)}>
                    Copy
                  </button>
                  <button type="button" className="btn btn-small btn-danger" onClick={() => {
                    const file = files.find((f) => f.id === fileId);
                    if (file) onRevoke(file, share);
                  }}>
                    Revoke
                  </button>
                  <span className="muted">expires {formatDate(share.expiresAt)}</span>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
