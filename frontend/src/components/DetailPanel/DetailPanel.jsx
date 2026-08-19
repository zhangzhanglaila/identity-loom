import React from 'react';

function entriesOf(obj) {
  return Object.entries(obj || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ''
  );
}

function connectionLabel(rel) {
  return rel.label || rel.relation_type || 'related_to';
}

export function DetailPanel({ node, relationship, neighbors, onSelectNode }) {
  if (!node && !relationship) {
    return (
      <aside className="detail-panel">
        <div className="panel">
          <div className="panel__title">Details</div>
          <div className="panel__empty">Select a node or edge.</div>
        </div>
      </aside>
    );
  }

  if (relationship) {
    const title = `Edge: ${relationship.label || relationship.relation_type}`;
    return (
      <aside className="detail-panel">
        <div className="panel">
          <div className="panel__title">{title}</div>
          <div className="detail-list">
            {entriesOf(relationship).map(([key, value]) => (
              <div key={key} className="detail-row">
                <span className="detail-row__key">{key}</span>
                <span className="detail-row__value">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  const title = node.display_name || node.name || node.id;
  const connections = (neighbors?.relationships || [])
    .map((rel) => {
      const otherId = rel.source === node.id ? rel.target : rel.source;
      const other = (neighbors?.nodes || []).find((n) => n.id === otherId);
      return { rel, other };
    })
    .filter((c) => c.other);

  return (
    <aside className="detail-panel">
      <div className="panel">
        <div className="panel__title">{title}</div>
        <div className="detail-list">
          {entriesOf(node).map(([key, value]) => (
            <div key={key} className="detail-row">
              <span className="detail-row__key">{key}</span>
              <span className="detail-row__value">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">Connections</div>
        {connections.length === 0 ? (
          <div className="panel__empty">No connections.</div>
        ) : (
          <div className="connection-list">
            {connections.map(({ rel, other }) => (
              <button
                key={rel.id}
                type="button"
                className="connection-row"
                onClick={() => onSelectNode && onSelectNode(other)}
              >
                <span className="connection-row__label">{connectionLabel(rel)}</span>
                <span className="connection-row__name">
                  {other.display_name || other.name || other.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
