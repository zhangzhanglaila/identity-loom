import React, { useMemo, useState } from 'react';

export function ImportDialog({ open, onClose, onImportJson, onImportCsv }) {
  const [mode, setMode] = useState('json');
  const [text, setText] = useState('');

  const preview = useMemo(() => {
    if (mode === 'json') {
      try {
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    }
    return text.trim() ? text : null;
  }, [mode, text]);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="panel__title">Import Graph</div>
        <div className="mode-switch">
          <button className={`mode-switch__button ${mode === 'json' ? 'is-active' : ''}`} onClick={() => setMode('json')}>JSON</button>
          <button className={`mode-switch__button ${mode === 'csv' ? 'is-active' : ''}`} onClick={() => setMode('csv')}>CSV</button>
        </div>
        <textarea
          className="modal__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'json'
            ? '{"nodes":[],"relationships":[]}'
            : 'record_type,id,source,target,relation_type,name'}
        />
        <div className="modal__actions">
          <button className="toolbar__button" onClick={onClose}>Close</button>
          <button
            className="toolbar__button"
            onClick={() => {
              if (!preview) return;
              if (mode === 'json') {
                onImportJson(preview);
              } else {
                onImportCsv(preview);
              }
            }}
            disabled={!preview}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
