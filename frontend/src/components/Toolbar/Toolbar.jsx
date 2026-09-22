import React from 'react';

export function Toolbar({
  query,
  onQueryChange,
  onSearch,
  onToggleLayout,
  layoutMode,
  onAddNode,
  onAddRelationship,
  onImport,
  onLlmImport
}) {
  return (
    <div className="toolbar">
      <div className="toolbar__brand">Identity Web</div>
      <input
        className="toolbar__search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search nodes"
      />
      <button className="toolbar__button" onClick={onSearch}>Search</button>
      <button className="toolbar__button" onClick={onToggleLayout}>
        {layoutMode === 'spider' ? 'Spider' : 'Layered'}
      </button>
      <button className="toolbar__button" onClick={onAddNode}>Add Node</button>
      <button className="toolbar__button" onClick={onAddRelationship}>Add Edge</button>
      <button className="toolbar__button" onClick={onImport}>Import</button>
      <button className="toolbar__button" onClick={onLlmImport}>LLM 导入</button>
    </div>
  );
}

