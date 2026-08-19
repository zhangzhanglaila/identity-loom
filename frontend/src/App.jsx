import React, { useEffect, useMemo, useState } from 'react';
import { sampleGraph } from './sampleData';
import { getOverview, searchNodes, importJson, importCsv, createNode, createRelationship, getNeighbors } from './api/client';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { GraphCanvas } from './components/GraphCanvas/GraphCanvas';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { ImportDialog } from './components/ImportDialog/ImportDialog';

const visibleKinds = ['you', 'provider', 'platform', 'account', 'identifier', 'tag'];

function dedupeById(items) {
  const map = new Map();
  for (const item of items) map.set(item.id, item);
  return [...map.values()];
}

export default function App() {
  const [query, setQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState('spider');
  const [filters, setFilters] = useState({ kinds: visibleKinds, depth: 1 });
  const [graph, setGraph] = useState(sampleGraph);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  const [neighbors, setNeighbors] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [stats, setStats] = useState({ nodes: sampleGraph.nodes.length, relationships: sampleGraph.relationships.length });

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    try {
      const data = await getOverview(1000);
      if (data?.nodes?.length) {
        setGraph({
          nodes: data.nodes,
          relationships: data.relationships
        });
        setStats({
          nodes: data.nodes.length,
          relationships: data.relationships.length
        });
        return;
      }
    } catch {
      // fall through to sample graph
    }
    setGraph(sampleGraph);
    setStats({
      nodes: sampleGraph.nodes.length,
      relationships: sampleGraph.relationships.length
    });
  };

  const filteredGraph = useMemo(() => {
    const nodes = graph.nodes.filter((node) => filters.kinds.includes(node.kind));
    const nodeIds = new Set(nodes.map((node) => node.id));
    const relationships = graph.relationships.filter(
      (rel) => nodeIds.has(rel.source) && nodeIds.has(rel.target)
    );
    return { nodes, relationships };
  }, [graph, filters]);

  const neighborIds = useMemo(() => {
    if (!neighbors?.nodes) return null;
    return new Set(neighbors.nodes.map((node) => node.id));
  }, [neighbors]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const results = await searchNodes(query.trim());
      const merged = dedupeById([
        ...graph.nodes,
        ...results
      ]);
      setGraph({
        nodes: merged,
        relationships: graph.relationships
      });
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
    const node = { id, kind, name };
    try {
      await createNode(node);
      setGraph((prev) => ({ ...prev, nodes: dedupeById([...prev.nodes, node]) }));
    } catch {
      setGraph((prev) => ({ ...prev, nodes: dedupeById([...prev.nodes, node]) }));
    }
  };

  const handleAddRelationship = async () => {
    const id = window.prompt('Relationship id');
    if (!id) return;
    const source = window.prompt('Source node id');
    const target = window.prompt('Target node id');
    const relation_type = window.prompt('Relation type', 'related_to') || 'related_to';
    if (!source || !target) return;
    const rel = { id, source, target, relation_type, label: relation_type };
    try {
      await createRelationship(rel);
      setGraph((prev) => ({ ...prev, relationships: [...prev.relationships, rel] }));
    } catch {
      setGraph((prev) => ({ ...prev, relationships: [...prev.relationships, rel] }));
    }
  };

  const handleImportJson = async (payload) => {
    try {
      await importJson(payload);
      await loadGraph();
      setImportOpen(false);
    } catch {
      await loadGraph();
      setImportOpen(false);
    }
  };

  const handleImportCsv = async (csvText) => {
    try {
      await importCsv(csvText);
      await loadGraph();
      setImportOpen(false);
    } catch {
      await loadGraph();
      setImportOpen(false);
    }
  };

  return (
    <div className="app-shell">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onToggleLayout={() => setLayoutMode((mode) => (mode === 'spider' ? 'layered' : 'spider'))}
        layoutMode={layoutMode}
        onAddNode={handleAddNode}
        onAddRelationship={handleAddRelationship}
        onImport={() => setImportOpen(true)}
      />

      <div className="content">
        <Sidebar filters={filters} setFilters={setFilters} stats={stats} visibleKinds={visibleKinds} />
        <main className="graph-area">
          <GraphCanvas
            nodes={filteredGraph.nodes}
            relationships={filteredGraph.relationships}
            layoutMode={layoutMode}
            selectedNodeId={selectedNode?.id}
            focusNodeId={selectedNode?.id}
            highlightIds={neighborIds}
            onSelectNode={handleSelectNode}
            onSelectRelationship={handleSelectRelationship}
          />
        </main>
        <DetailPanel
          node={selectedNode}
          relationship={selectedRelationship}
          neighbors={neighbors}
          onSelectNode={handleSelectNode}
        />
      </div>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportJson={handleImportJson}
        onImportCsv={handleImportCsv}
      />
    </div>
  );
}
