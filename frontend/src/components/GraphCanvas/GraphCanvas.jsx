import React, { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';

const kindColors = {
  you: '#ff5c7a',
  provider: '#96e0f7',
  platform: '#a8e1fe',
  account: '#00ff50',
  identifier: '#c792ea',
  tag: '#f89d51'
};

function pairKey(source, target) {
  return `${source}::${target}`;
}

export function GraphCanvas({
  nodes,
  relationships,
  layoutMode,
  selectedNodeId,
  focusNodeId,
  highlightIds,
  onSelectNode,
  onSelectRelationship
}) {
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

    return { nodes: [...map.values()], links };
  }, [nodes, relationships]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current?.clientWidth || 1000;
    const height = svgRef.current?.clientHeight || 700;

    svg.selectAll('*').remove();
    svg.attr('viewBox', [0, 0, width, height]);

    const root = svg.append('g').attr('class', 'graph-root');
    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
    zoomLayer.append(() => root.node());

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
      simulation.force('radial', d3.forceRadial((d) => {
        if (d.kind === 'you') return 0;
        if (d.kind === 'provider') return 130;
        if (d.kind === 'account') return 250;
        return 360;
      }, width / 2, height / 2).strength(0.08));
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
      .on('click', (_, d) => onSelectRelationship(d));

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
      .on('click', (_, d) => onSelectNode(d));

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

    const label = root.append('g').attr('class', 'labels');

    simulation.on('tick', () => {
      link.attr('d', (d) => {
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;
        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
        return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
      });

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);

      label.selectAll('*').remove();
      label
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

  return <svg ref={svgRef} className="graph-canvas" />;
}

