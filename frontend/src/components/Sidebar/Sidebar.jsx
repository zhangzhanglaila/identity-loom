import React from 'react';

export function Sidebar({ filters, setFilters, stats, visibleKinds }) {
  const toggleKind = (kind) => {
    const next = filters.kinds.includes(kind)
      ? filters.kinds.filter((item) => item !== kind)
      : [...filters.kinds, kind];
    setFilters({ ...filters, kinds: next });
  };

  return (
    <aside className="sidebar">
      <div className="panel">
        <div className="panel__title">Overview</div>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__label">Nodes</div>
            <div className="stat__value">{stats.nodes ?? 0}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Edges</div>
            <div className="stat__value">{stats.relationships ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">Kinds</div>
        {visibleKinds.map((kind) => (
          <label key={kind} className="checkline">
            <input
              type="checkbox"
              checked={filters.kinds.includes(kind)}
              onChange={() => toggleKind(kind)}
            />
            <span>{kind}</span>
          </label>
        ))}
      </div>

      <div className="panel">
        <div className="panel__title">Depth</div>
        <input
          type="range"
          min="1"
          max="3"
          value={filters.depth}
          onChange={(e) => setFilters({ ...filters, depth: Number(e.target.value) })}
        />
        <div className="panel__note">Current: {filters.depth}</div>
      </div>
    </aside>
  );
}

