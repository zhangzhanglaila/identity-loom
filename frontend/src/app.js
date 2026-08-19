(function () {
  const { useEffect, useMemo, useState, useRef } = React;
  const html = htm.bind(React.createElement);

  const API_BASE = 'http://localhost:8000';
  const visibleKinds = ['you', 'provider', 'platform', 'account', 'identifier', 'tag'];

  const kindColors = {
    you: '#ff5c7a',
    provider: '#96e0f7',
    platform: '#a8e1fe',
    account: '#00ff50',
    identifier: '#c792ea',
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
    const onAddNode = props.onAddNode;
    const onAddRelationship = props.onAddRelationship;
    const onImport = props.onImport;

    return html`
      <div className="toolbar">
        <div className="toolbar__brand">Identity Web</div>
        <input className="toolbar__search" value=${q} onInput=${(e) => onQueryChange(e.target.value)} placeholder="Search nodes" />
        <button className="toolbar__button" onClick=${onSearch}>Search</button>
        <button className="toolbar__button" onClick=${onToggleLayout}>${layoutMode === 'spider' ? 'Spider' : 'Layered'}</button>
        <button className="toolbar__button" onClick=${onAddNode}>Add Node</button>
        <button className="toolbar__button" onClick=${onAddRelationship}>Add Edge</button>
        <button className="toolbar__button" onClick=${onImport}>Import</button>
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
      const svg = d3.select(svgRef.current);
      const width = svgRef.current?.clientWidth || 1000;
      const height = svgRef.current?.clientHeight || 700;

      svg.selectAll('*').remove();
      svg.attr('viewBox', [0, 0, width, height]);

      const root = svg.append('g').attr('class', 'graph-root');
      svg.call(
        d3.zoom().scaleExtent([0.2, 2.5]).on('zoom', (event) => {
          root.attr('transform', event.transform);
        })
      );

      const simulation = d3.forceSimulation(processed.nodes)
        .force('link', d3.forceLink(processed.links).id((d) => d.id).distance(layoutMode === 'layered' ? 170 : 110))
        .force('charge', d3.forceManyBody().strength(layoutMode === 'layered' ? -300 : -220))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(38));

      if (layoutMode === 'layered') {
        simulation.force(
          'y',
          d3.forceY((d) => {
            if (d.kind === 'you') return height * 0.2;
            if (d.kind === 'provider') return height * 0.35;
            if (d.kind === 'account') return height * 0.55;
            return height * 0.75;
          }).strength(0.14)
        );
      } else {
        simulation.force(
          'radial',
          d3.forceRadial((d) => {
            if (d.kind === 'you') return 0;
            if (d.kind === 'provider') return 130;
            if (d.kind === 'account') return 250;
            return 360;
          }, width / 2, height / 2).strength(0.08)
        );
      }

      const defs = root.append('defs');
      defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 7)
        .attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#96e0f7');

      const linkGroup = root.append('g').attr('class', 'links');
      const nodeGroup = root.append('g').attr('class', 'nodes');

      const focused = focusNodeId != null;
      const idOf = (x) => (x && typeof x === 'object' ? x.id : x);
      const isActiveNode = (d) => !focused || d.id === focusNodeId || (highlightIds && highlightIds.has(d.id));
      const isActiveLink = (d) => !focused || idOf(d.source) === focusNodeId || idOf(d.target) === focusNodeId;

      const link = linkGroup
        .selectAll('path')
        .data(processed.links)
        .join('path')
        .attr('class', 'link')
        .attr('stroke', '#96e0f7')
        .attr('stroke-opacity', (d) => (isActiveLink(d) ? 0.7 : 0.08))
        .attr('fill', 'none')
        .attr('marker-end', 'url(#arrow)')
        .on('click', (event, d) => onSelectRelationship(d));

      const node = nodeGroup
        .selectAll('g')
        .data(processed.nodes)
        .join('g')
        .attr('class', 'node')
        .attr('opacity', (d) => (isActiveNode(d) ? 1 : 0.22))
        .call(
          d3.drag()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        )
        .on('click', (event, d) => onSelectNode(d));

      node.append('circle')
        .attr('r', (d) => (d.kind === 'you' ? 26 : d.kind === 'account' ? 20 : 16))
        .attr('fill', (d) => kindColors[d.kind] || '#8ea1b5')
        .attr('stroke', (d) => (d.id === selectedNodeId ? '#ffffff' : '#0a1630'))
        .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : 2));

      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 38)
        .attr('fill', '#d7ecff')
        .attr('font-size', 12)
        .text((d) => d.display_name || d.name || d.id);

      const labelGroup = root.append('g').attr('class', 'labels');

      simulation.on('tick', () => {
        link.attr('d', (d) => {
          const sx = d.source.x;
          const sy = d.source.y;
          const tx = d.target.x;
          const ty = d.target.y;
          const dx = tx - sx;
          const dy = ty - sy;
          const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
          return 'M' + sx + ',' + sy + 'A' + dr + ',' + dr + ' 0 0,1 ' + tx + ',' + ty;
        });

        node.attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')');

        labelGroup.selectAll('*').remove();
        labelGroup
          .selectAll('text')
          .data(processed.links.slice(0, 80))
          .join('text')
          .attr('x', (d) => (d.source.x + d.target.x) / 2)
          .attr('y', (d) => (d.source.y + d.target.y) / 2)
          .attr('fill', '#96e0f7')
          .attr('fill-opacity', 0.75)
          .attr('font-size', 10)
          .attr('text-anchor', 'middle')
          .text((d) => d.label || d.relation_type);
      });

      return () => simulation.stop();
    }, [processed, layoutMode, selectedNodeId, focusNodeId, highlightIds, onSelectNode, onSelectRelationship]);

    return html`<svg ref=${svgRef} className="graph-canvas"></svg>`;
  }

  function App() {
    const [query, setQuery] = useState('');
    const [layoutMode, setLayoutMode] = useState('spider');
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
          onAddNode=${handleAddNode}
          onAddRelationship=${handleAddRelationship}
          onImport=${() => setImportOpen(true)}
        />

        <div className="content">
          <${Sidebar} filters=${filters} setFilters=${setFilters} stats=${stats} />
          <main className="graph-area">
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
