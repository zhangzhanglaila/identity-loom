(function () {
  const { useEffect, useMemo, useState, useRef } = React;
  const html = htm.bind(React.createElement);

  const API_BASE = 'http://localhost:8000';
  const visibleKinds = ['you', 'provider', 'platform', 'account', 'identifier', 'tag'];

  const kindColors = {
    you: '#ff5c7a',
    provider: '#1f2937',
    platform: '#1f2937',
    account: '#ffffff',
    identifier: '#1f2937',
    tag: '#f89d51'
  };

  async function request(path, options = {}) {
    const response = await fetch(API_BASE + path, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    if (!response.ok) {
      throw new Error('Request failed: ' + response.status);
    }
    return response.json();
  }

  function getOverview(limit) {
    return request('/api/graph/overview?limit=' + (limit || 500));
  }

  function searchNodes(query) {
    return request('/api/search?q=' + encodeURIComponent(query));
  }

  function getNeighbors(nodeId, depth) {
    return request('/api/nodes/' + encodeURIComponent(nodeId) + '/neighbors?depth=' + (depth || 1));
  }

  function createNode(payload) {
    return request('/api/nodes', { method: 'POST', body: JSON.stringify(payload) });
  }

  function createRelationship(payload) {
    return request('/api/relationships', { method: 'POST', body: JSON.stringify(payload) });
  }

  function importJson(payload) {
    return request('/api/import/json', { method: 'POST', body: JSON.stringify(payload) });
  }

  function importCsv(csvText) {
    return request('/api/import/csv', { method: 'POST', body: JSON.stringify({ csv_text: csvText }) });
  }

  function dedupeById(items) {
    const map = new Map();
    for (const item of items) map.set(item.id, item);
    return [...map.values()];
  }

  function entriesOf(obj) {
    return Object.entries(obj || {}).filter(function (entry) {
      const value = entry[1];
      return value !== null && value !== undefined && value !== '';
    });
  }

  function Toolbar(props) {
    const q = props.query;
    const onQueryChange = props.onQueryChange;
    const onSearch = props.onSearch;
    const onToggleLayout = props.onToggleLayout;
    const layoutMode = props.layoutMode;
    const viewMode = props.viewMode;
    const onToggleView = props.onToggleView;
    const onAddNode = props.onAddNode;
    const onAddRelationship = props.onAddRelationship;
    const onImport = props.onImport;

    return html`
      <div className="toolbar">
        <div className="toolbar__brand">Identity Web</div>
        <input className="toolbar__search" value=${q} onInput=${(e) => onQueryChange(e.target.value)} placeholder="Search nodes" />
        <button className="toolbar__button" onClick=${onSearch}>Search</button>
        <button className="toolbar__button" onClick=${onToggleLayout}>${layoutMode === 'spider' ? 'Spider' : 'Layered'}</button>
        <button className="toolbar__button" onClick=${onToggleView}>${viewMode === 'graph' ? 'Graph' : 'List'}</button>
        <button className="toolbar__button" onClick=${onAddNode}>Add Node</button>
        <button className="toolbar__button" onClick=${onAddRelationship}>Add Edge</button>
        <button className="toolbar__button" onClick=${onImport}>Import</button>
      </div>
    `;
  }

  function isConnectionNode(node) {
    return node && (node.kind === 'provider' || node.kind === 'identifier');
  }

  function ListView(props) {
    const nodes = props.nodes || [];
    const relationships = props.relationships || [];
    const selectedId = props.selectedId;
    const onSelectNode = props.onSelectNode;
    const [tab, setTab] = useState('connections');

    const connections = nodes.filter(isConnectionNode);
    const accounts = nodes.filter((node) => node.kind === 'account');

    const linkedAccountsForConnection = (connectionId) =>
      relationships
        .filter((rel) => rel.source === connectionId || rel.target === connectionId)
        .map((rel) => {
          const otherId = rel.source === connectionId ? rel.target : rel.source;
          return nodes.find((node) => node.id === otherId);
        })
        .filter(Boolean)
        .filter((node) => node.kind === 'account');

    const linkedConnectionsForAccount = (accountId) =>
      relationships
        .filter((rel) => rel.source === accountId || rel.target === accountId)
        .map((rel) => {
          const otherId = rel.source === accountId ? rel.target : rel.source;
          return nodes.find((node) => node.id === otherId);
        })
        .filter(Boolean)
        .filter(isConnectionNode);

    const activeItems = tab === 'connections' ? connections : accounts;

    return html`
      <div className="list-view">
        <div className="list-view__tabs">
          <button className=${'list-view__tab ' + (tab === 'connections' ? 'is-active' : '')} onClick=${() => setTab('connections')}>
            Connections (${connections.length})
          </button>
          <button className=${'list-view__tab ' + (tab === 'accounts' ? 'is-active' : '')} onClick=${() => setTab('accounts')}>
            Accounts (${accounts.length})
          </button>
        </div>
        <div className="list-view__header">
          <div>Name</div>
          <div>Type</div>
          <div className="list-view__header-right">Links</div>
        </div>
        <div className="list-view__body">
          ${activeItems.length === 0
            ? html`<div className="panel__empty">No items.</div>`
            : activeItems.map((item) => {
                const selected = String(item.id) === String(selectedId);
                const links = tab === 'connections'
                  ? linkedAccountsForConnection(item.id)
                  : linkedConnectionsForAccount(item.id);
                return html`
                  <button key=${item.id} type="button" className=${'list-view__row ' + (selected ? 'is-selected' : '')} onClick=${() => onSelectNode(item)}>
                    <div className="list-view__name">${item.display_name || item.name || item.id}</div>
                    <div className="list-view__kind">${item.kind}</div>
                    <div className="list-view__links">${links.length}</div>
                  </button>
                `;
              })}
        </div>
      </div>
    `;
  }

  function Sidebar(props) {
    const filters = props.filters;
    const setFilters = props.setFilters;
    const stats = props.stats;

    const toggleKind = (kind) => {
      const next = filters.kinds.includes(kind)
        ? filters.kinds.filter((item) => item !== kind)
        : [...filters.kinds, kind];
      setFilters({ ...filters, kinds: next });
    };

    return html`
      <aside className="sidebar">
        <div className="panel">
          <div className="panel__title">Overview</div>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat__label">Nodes</div>
              <div className="stat__value">${stats.nodes ?? 0}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Edges</div>
              <div className="stat__value">${stats.relationships ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">Kinds</div>
          ${visibleKinds.map((kind) => html`
            <label className="checkline" key=${kind}>
              <input type="checkbox" checked=${filters.kinds.includes(kind)} onChange=${() => toggleKind(kind)} />
              <span>${kind}</span>
            </label>
          `)}
        </div>

        <div className="panel">
          <div className="panel__title">Depth</div>
          <input type="range" min="1" max="3" value=${filters.depth} onInput=${(e) => setFilters({ ...filters, depth: Number(e.target.value) })} />
          <div className="panel__note">Current: ${filters.depth}</div>
        </div>
      </aside>
    `;
  }

  function DetailPanel(props) {
    const node = props.node;
    const relationship = props.relationship;
    const neighbors = props.neighbors;
    const onSelectNode = props.onSelectNode;

    if (!node && !relationship) {
      return html`
        <aside className="detail-panel">
          <div className="panel">
            <div className="panel__title">Details</div>
            <div className="panel__empty">Select a node or edge.</div>
          </div>
        </aside>
      `;
    }

    if (relationship) {
      const title = 'Edge: ' + (relationship.label || relationship.relation_type);
      return html`
        <aside className="detail-panel">
          <div className="panel">
            <div className="panel__title">${title}</div>
            <div className="detail-list">
              ${entriesOf(relationship).map(([key, value]) => html`
                <div className="detail-row" key=${key}>
                  <span className="detail-row__key">${key}</span>
                  <span className="detail-row__value">${typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              `)}
            </div>
          </div>
        </aside>
      `;
    }

    const title = node.display_name || node.name || node.id;
    const connections = (neighbors?.relationships || [])
      .map((rel) => {
        const otherId = rel.source === node.id ? rel.target : rel.source;
        const other = (neighbors?.nodes || []).find((n) => n.id === otherId);
        return { rel: rel, other: other };
      })
      .filter((c) => c.other);

    return html`
      <aside className="detail-panel">
        <div className="panel">
          <div className="panel__title">${title}</div>
          <div className="detail-list">
            ${entriesOf(node).map(([key, value]) => html`
              <div className="detail-row" key=${key}>
                <span className="detail-row__key">${key}</span>
                <span className="detail-row__value">${typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            `)}
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">Connections</div>
          ${connections.length === 0
            ? html`<div className="panel__empty">No connections.</div>`
            : html`<div className="connection-list">
                ${connections.map((c) => html`
                  <button key=${c.rel.id} type="button" className="connection-row" onClick=${() => onSelectNode && onSelectNode(c.other)}>
                    <span className="connection-row__label">${c.rel.label || c.rel.relation_type || 'related_to'}</span>
                    <span className="connection-row__name">${c.other.display_name || c.other.name || c.other.id}</span>
                  </button>
                `)}
              </div>`}
        </div>
      </aside>
    `;
  }

  function ImportDialog(props) {
    const open = props.open;
    const onClose = props.onClose;
    const onImportJson = props.onImportJson;
    const onImportCsv = props.onImportCsv;
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

    return html`
      <div className="modal-backdrop">
        <div className="modal">
          <div className="panel__title">Import Graph</div>
          <div className="mode-switch">
            <button className=${'mode-switch__button ' + (mode === 'json' ? 'is-active' : '')} onClick=${() => setMode('json')}>JSON</button>
            <button className=${'mode-switch__button ' + (mode === 'csv' ? 'is-active' : '')} onClick=${() => setMode('csv')}>CSV</button>
          </div>
          <textarea className="modal__textarea" value=${text} onInput=${(e) => setText(e.target.value)} placeholder=${mode === 'json' ? '{"nodes":[],"relationships":[]}' : 'record_type,id,source,target,relation_type,name'}></textarea>
          <div className="modal__actions">
            <button className="toolbar__button" onClick=${onClose}>Close</button>
            <button
              className="toolbar__button"
              disabled=${!preview}
              onClick=${() => {
                if (!preview) return;
                if (mode === 'json') {
                  onImportJson(preview);
                } else {
                  onImportCsv(preview);
                }
              }}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function GraphCanvas(props) {
    const nodes = props.nodes;
    const relationships = props.relationships;
    const layoutMode = props.layoutMode;
    const selectedNodeId = props.selectedNodeId;
    const focusNodeId = props.focusNodeId;
    const highlightIds = props.highlightIds;
    const onSelectNode = props.onSelectNode;
    const onSelectRelationship = props.onSelectRelationship;
    const svgRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const processed = useMemo(() => {
      const map = new Map(nodes.map((node) => [node.id, { ...node }]));
      const links = relationships
        .map((rel) => ({
          ...rel,
          source: typeof rel.source === 'string' ? rel.source : rel.source?.id,
          target: typeof rel.target === 'string' ? rel.target : rel.target?.id
        }))
        .filter((rel) => map.has(rel.source) && map.has(rel.target));

      return { nodes: [...map.values()], links: links };
    }, [nodes, relationships]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const width = container.clientWidth || 1000;
      const height = container.clientHeight || 700;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const focused = focusNodeId != null;
      const idOf = (x) => (x && typeof x === 'object' ? x.id : x);
      const activeNodeIds = focused ? new Set([focusNodeId, ...(highlightIds ? [...highlightIds] : [])]) : null;
      const isActiveNode = (d) => !focused || (activeNodeIds && activeNodeIds.has(d.id));
      const isActiveLink = (d) => !focused || idOf(d.source) === focusNodeId || idOf(d.target) === focusNodeId;

      const simulation = d3.forceSimulation(processed.nodes)
        .force('link', d3.forceLink(processed.links).id((d) => d.id).distance(layoutMode === 'layered' ? 180 : 120))
        .force('charge', d3.forceManyBody().strength(layoutMode === 'layered' ? -280 : -230))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius((d) => (d.kind === 'account' ? 26 : d.kind === 'you' ? 34 : 22)));

      if (layoutMode === 'layered') {
        simulation.force(
          'y',
          d3.forceY((d) => {
            if (d.kind === 'you') return height * 0.16;
            if (d.kind === 'provider' || d.kind === 'identifier') return height * 0.34;
            if (d.kind === 'account') return height * 0.58;
            return height * 0.78;
          }).strength(0.16)
        );
      } else {
        simulation.force(
          'radial',
          d3.forceRadial((d) => {
            if (d.kind === 'you') return 0;
            if (d.kind === 'provider' || d.kind === 'identifier') return 140;
            if (d.kind === 'account') return 250;
            return 350;
          }, width / 2, height / 2).strength(0.08)
        );
      }

      const zoom = d3.zoom().scaleExtent([0.2, 3]).on('zoom', (event) => {
        transform = event.transform;
        render();
      });
      let transform = d3.zoomIdentity;
      d3.select(canvas).call(zoom);

      const linked = new Map();
      processed.links.forEach((link) => {
        const key = [link.source, link.target].sort().join('::');
        linked.set(key, link);
      });

      const render = () => {
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#081018';
        ctx.fillRect(0, 0, width, height);

        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        processed.links.forEach((link) => {
          const sx = link.source.x;
          const sy = link.source.y;
          const tx = link.target.x;
          const ty = link.target.y;
          const active = isActiveLink(link);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          const dx = tx - sx;
          const dy = ty - sy;
          const dr = Math.sqrt(dx * dx + dy * dy) * 0.82;
          ctx.strokeStyle = active ? 'rgba(150, 224, 247, 0.58)' : 'rgba(150, 224, 247, 0.08)';
          ctx.lineWidth = active ? 1.8 : 1;
          ctx.quadraticCurveTo((sx + tx) / 2, (sy + ty) / 2 - dr * 0.06, tx, ty);
          ctx.stroke();
        });

        processed.nodes.forEach((node) => {
          const active = isActiveNode(node);
          const r = node.kind === 'you' ? 26 : node.kind === 'account' ? 20 : node.kind === 'provider' || node.kind === 'identifier' ? 16 : 13;
          const fill = node.kind === 'you'
            ? '#ff5c7a'
            : node.kind === 'account'
              ? '#f8fafc'
              : '#0f172a';
          const stroke = node.kind === 'provider'
            ? '#96e0f7'
            : node.kind === 'identifier'
              ? '#c792ea'
              : node.kind === 'account'
                ? '#96e0f7'
                : '#0a1630';
          const x = node.x;
          const y = node.y;

          ctx.save();
          ctx.globalAlpha = active ? 1 : 0.22;
          if (node.id === selectedNodeId) {
            ctx.beginPath();
            ctx.arc(x, y, r + 7, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(96, 165, 250, 0.18)';
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.lineWidth = node.id === selectedNodeId ? 3 : 1.5;
          ctx.strokeStyle = node.id === selectedNodeId ? '#ffffff' : stroke;
          ctx.stroke();

          if (node.kind === 'account') {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();

          const shouldLabel = node.kind === 'you' || node.kind === 'provider' || node.kind === 'identifier' || node.id === selectedNodeId || activeNodeIds?.has(node.id);
          if (shouldLabel) {
            const label = node.kind === 'account'
              ? (node.username || node.name || node.id)
              : (node.display_name || node.name || node.id);
            ctx.save();
            ctx.font = node.kind === 'you' ? '800 13px Inter, sans-serif' : '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = node.kind === 'account' ? '#cfe7ff' : (node.id === selectedNodeId ? '#ffffff' : '#d7ecff');
            ctx.fillText(label, x, y + r + 14);
            ctx.restore();
          }
        });

        if (selectedNodeId) {
          const node = processed.nodes.find((item) => item.id === selectedNodeId);
          if (node) {
            ctx.save();
            ctx.font = '700 12px Inter, sans-serif';
            ctx.fillStyle = '#96e0f7';
            ctx.textAlign = 'left';
            ctx.fillText(node.kind.toUpperCase(), node.x + 20, node.y - 20);
            ctx.restore();
          }
        }

        ctx.restore();
      };

      const ticked = () => render();
      simulation.on('tick', ticked);
      render();

      let dragNode = null;
      const findNode = (x, y) => {
        const [px, py] = transform.invert([x, y]);
        let closest = null;
        let closestDist = Infinity;
        processed.nodes.forEach((node) => {
          const r = node.kind === 'you' ? 26 : node.kind === 'account' ? 20 : node.kind === 'provider' || node.kind === 'identifier' ? 16 : 13;
          const dx = px - node.x;
          const dy = py - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= r + 8 && dist < closestDist) {
            closest = node;
            closestDist = dist;
          }
        });
        return closest;
      };

      const onPointerDown = (event) => {
        const rect = canvas.getBoundingClientRect();
        const node = findNode(event.clientX - rect.left, event.clientY - rect.top);
        if (node) {
          dragNode = node;
          node.fx = node.x;
          node.fy = node.y;
          simulation.alphaTarget(0.25).restart();
        }
      };

      const onPointerMove = (event) => {
        if (!dragNode) return;
        const rect = canvas.getBoundingClientRect();
        const [px, py] = transform.invert([event.clientX - rect.left, event.clientY - rect.top]);
        dragNode.fx = px;
        dragNode.fy = py;
      };

      const onPointerUp = (event) => {
        if (dragNode) {
          dragNode.fx = null;
          dragNode.fy = null;
          dragNode = null;
          simulation.alphaTarget(0);
        }
      };

      const onClick = (event) => {
        const rect = canvas.getBoundingClientRect();
        const node = findNode(event.clientX - rect.left, event.clientY - rect.top);
        if (node) {
          onSelectNode(node);
          return;
        }
        const [px, py] = transform.invert([event.clientX - rect.left, event.clientY - rect.top]);
        let picked = null;
        processed.links.forEach((link) => {
          const mx = (link.source.x + link.target.x) / 2;
          const my = (link.source.y + link.target.y) / 2;
          const dx = px - mx;
          const dy = py - my;
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            picked = link;
          }
        });
        if (picked) onSelectRelationship(picked);
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointerleave', onPointerUp);
      canvas.addEventListener('click', onClick);

      const resizeObserver = new ResizeObserver(() => {
        const nextWidth = container.clientWidth || width;
        const nextHeight = container.clientHeight || height;
        canvas.width = nextWidth * dpr;
        canvas.height = nextHeight * dpr;
        canvas.style.width = nextWidth + 'px';
        canvas.style.height = nextHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        simulation.force('center', d3.forceCenter(nextWidth / 2, nextHeight / 2));
        simulation.alpha(0.35).restart();
      });
      resizeObserver.observe(container);

      return () => {
        simulation.stop();
        resizeObserver.disconnect();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerUp);
        canvas.removeEventListener('click', onClick);
      };
    }, [processed, layoutMode, selectedNodeId, focusNodeId, highlightIds, onSelectNode, onSelectRelationship]);

    return html`
      <div ref=${containerRef} className="graph-canvas-wrap">
        <canvas ref=${canvasRef} className="graph-canvas"></canvas>
      </div>
    `;
  }

  function App() {
    const [query, setQuery] = useState('');
    const [layoutMode, setLayoutMode] = useState('spider');
    const [viewMode, setViewMode] = useState('graph');
    const [filters, setFilters] = useState({ kinds: visibleKinds, depth: 1 });
    const [graph, setGraph] = useState(window.sampleGraph || { nodes: [], relationships: [] });
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedRelationship, setSelectedRelationship] = useState(null);
    const [neighbors, setNeighbors] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [stats, setStats] = useState({
      nodes: (window.sampleGraph?.nodes || []).length,
      relationships: (window.sampleGraph?.relationships || []).length
    });

    const loadGraph = async () => {
      try {
        const data = await getOverview(1000);
        if (data?.nodes?.length) {
          setGraph({ nodes: data.nodes, relationships: data.relationships });
          setStats({ nodes: data.nodes.length, relationships: data.relationships.length });
          return;
        }
      } catch {
        // fall through
      }
      setGraph(window.sampleGraph || { nodes: [], relationships: [] });
      setStats({
        nodes: (window.sampleGraph?.nodes || []).length,
        relationships: (window.sampleGraph?.relationships || []).length
      });
    };

    useEffect(() => {
      loadGraph();
    }, []);

    const filteredGraph = useMemo(() => {
      const nodes = graph.nodes.filter((node) => filters.kinds.includes(node.kind));
      const nodeIds = new Set(nodes.map((node) => node.id));
      const relationships = graph.relationships.filter(
        (rel) => nodeIds.has(rel.source) && nodeIds.has(rel.target)
      );
      return { nodes: nodes, relationships: relationships };
    }, [graph, filters]);

    const neighborIds = useMemo(() => {
      if (!neighbors?.nodes) return null;
      return new Set(neighbors.nodes.map((node) => node.id));
    }, [neighbors]);

    const handleSearch = async () => {
      if (!query.trim()) return;
      try {
        const results = await searchNodes(query.trim());
        const merged = dedupeById([...graph.nodes, ...results]);
        setGraph({ nodes: merged, relationships: graph.relationships });
        if (results[0]) {
          setSelectedNode(results[0]);
          setSelectedRelationship(null);
          setNeighbors(null);
          try {
            const data = await getNeighbors(results[0].id, 1);
            setNeighbors(data);
          } catch {
            setNeighbors(null);
          }
        }
      } catch {
        return;
      }
    };

    const handleSelectNode = async (node) => {
      setSelectedNode(node);
      setSelectedRelationship(null);
      setNeighbors(null);
      try {
        const data = await getNeighbors(node.id, 1);
        setNeighbors(data);
      } catch {
        setNeighbors(null);
      }
    };

    const handleSelectRelationship = (relationship) => {
      setSelectedRelationship(relationship);
      setSelectedNode(null);
      setNeighbors(null);
    };

    const handleAddNode = async () => {
      const id = window.prompt('Node id');
      if (!id) return;
      const kind = window.prompt('Node kind', 'account') || 'account';
      const name = window.prompt('Node name');
      if (!name) return;
      const node = { id: id, kind: kind, name: name };
      try {
        await createNode(node);
      } catch {
        // local fallback
      }
      setGraph((prev) => ({ ...prev, nodes: dedupeById([...prev.nodes, node]) }));
    };

    const handleAddRelationship = async () => {
      const id = window.prompt('Relationship id');
      if (!id) return;
      const source = window.prompt('Source node id');
      const target = window.prompt('Target node id');
      const relation_type = window.prompt('Relation type', 'related_to') || 'related_to';
      if (!source || !target) return;
      const rel = { id: id, source: source, target: target, relation_type: relation_type, label: relation_type };
      try {
        await createRelationship(rel);
      } catch {
        // local fallback
      }
      setGraph((prev) => ({ ...prev, relationships: [...prev.relationships, rel] }));
    };

    const handleImportJson = async (payload) => {
      try {
        await importJson(payload);
      } catch {
        // local fallback
      }
      await loadGraph();
      setImportOpen(false);
    };

    const handleImportCsv = async (csvText) => {
      try {
        await importCsv(csvText);
      } catch {
        // local fallback
      }
      await loadGraph();
      setImportOpen(false);
    };

    return html`
      <div className="app-shell">
        <${Toolbar}
          query=${query}
          onQueryChange=${setQuery}
          onSearch=${handleSearch}
          onToggleLayout=${() => setLayoutMode((mode) => (mode === 'spider' ? 'layered' : 'spider'))}
          layoutMode=${layoutMode}
          viewMode=${viewMode}
          onToggleView=${() => setViewMode((mode) => (mode === 'graph' ? 'list' : 'graph'))}
          onAddNode=${handleAddNode}
          onAddRelationship=${handleAddRelationship}
          onImport=${() => setImportOpen(true)}
        />

        <div className="content">
          <${Sidebar} filters=${filters} setFilters=${setFilters} stats=${stats} />
          <main className="graph-area">
            ${viewMode === 'graph'
              ? html`
                  <${GraphCanvas}
                    nodes=${filteredGraph.nodes}
                    relationships=${filteredGraph.relationships}
                    layoutMode=${layoutMode}
                    selectedNodeId=${selectedNode?.id}
                    focusNodeId=${selectedNode?.id}
                    highlightIds=${neighborIds}
                    onSelectNode=${handleSelectNode}
                    onSelectRelationship=${handleSelectRelationship}
                  />
                `
              : html`
                  <${ListView}
                    nodes=${filteredGraph.nodes}
                    relationships=${filteredGraph.relationships}
                    selectedId=${selectedNode?.id}
                    onSelectNode=${handleSelectNode}
                  />
                `}
          </main>
          <${DetailPanel}
            node=${selectedNode}
            relationship=${selectedRelationship}
            neighbors=${neighbors}
            onSelectNode=${handleSelectNode}
          />
        </div>

        <${ImportDialog}
          open=${importOpen}
          onClose=${() => setImportOpen(false)}
          onImportJson=${handleImportJson}
          onImportCsv=${handleImportCsv}
        />
      </div>
    `;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
})();
