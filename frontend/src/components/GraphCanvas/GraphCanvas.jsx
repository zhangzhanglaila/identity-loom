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

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const localPlatformIcons = {
  qq: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#12b7f5"/><circle cx="46" cy="52" r="14" fill="#ffffff"/><circle cx="82" cy="52" r="14" fill="#ffffff"/><ellipse cx="64" cy="79" rx="30" ry="12" fill="#ffffff"/><path d="M39 66c4-18 14-28 25-28s21 10 25 28" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>'),
  tencentqq: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#12b7f5"/><circle cx="46" cy="52" r="14" fill="#ffffff"/><circle cx="82" cy="52" r="14" fill="#ffffff"/><ellipse cx="64" cy="79" rx="30" ry="12" fill="#ffffff"/><path d="M39 66c4-18 14-28 25-28s21 10 25 28" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>'),
  outlook: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0f6cbd"/><rect x="22" y="30" width="84" height="68" rx="12" fill="#ffffff"/><path d="M28 42l36 24 36-24" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 86l28-20 8 6 36-26" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="48" r="16" fill="#0f6cbd"/><text x="92" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">O</text></svg>'),
  microsoftoutlook: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0f6cbd"/><rect x="22" y="30" width="84" height="68" rx="12" fill="#ffffff"/><path d="M28 42l36 24 36-24" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 86l28-20 8 6 36-26" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="48" r="16" fill="#0f6cbd"/><text x="92" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">O</text></svg>')
};

const platformIcons = {
  google: 'https://cdn.simpleicons.org/google/ffffff',
  github: 'https://cdn.simpleicons.org/github/ffffff',
  apple: 'https://cdn.simpleicons.org/apple/ffffff',
  microsoft: 'https://cdn.simpleicons.org/microsoft/ffffff',
  wechat: 'https://cdn.simpleicons.org/wechat/ffffff',
  qq: 'https://cdn.simpleicons.org/qq/ffffff',
  douyin: 'https://cdn.simpleicons.org/tiktok/ffffff',
  tiktok: 'https://cdn.simpleicons.org/tiktok/ffffff',
  bilibili: 'https://cdn.simpleicons.org/bilibili/ffffff',
  xiaohongshu: 'https://cdn.simpleicons.org/xiaohongshu/ffffff',
  taobao: 'https://cdn.simpleicons.org/taobao/ffffff',
  jd: 'https://cdn.simpleicons.org/jd/ffffff',
  steam: 'https://cdn.simpleicons.org/steam/ffffff',
  discord: 'https://cdn.simpleicons.org/discord/ffffff',
  telegram: 'https://cdn.simpleicons.org/telegram/ffffff',
  chatgpt: 'https://cdn.simpleicons.org/openai/ffffff',
  openai: 'https://cdn.simpleicons.org/openai/ffffff'
};

const iconAliases = {
  tencentqq: 'qq',
  '腾讯qq': 'qq',
  qqmail: 'qq',
  'qq邮箱': 'qq',
  microsoftoutlook: 'outlook',
  outlookmail: 'outlook',
  outlookcom: 'outlook',
  office365: 'outlook',
  microsoft365: 'outlook',
  hotmail: 'outlook',
  live: 'outlook'
};

function normalizeIconKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_./-]+/g, '');
}

function resolvedIconKey(value) {
  const key = normalizeIconKey(value);
  if (iconAliases[key]) return iconAliases[key];
  if (key.includes('\u817e\u8baf')) return 'qq';
  if (key.includes('\u5fae\u4fe1')) return 'wechat';
  if (key.includes('\u6296\u97f3')) return 'douyin';
  if (key.includes('\u54d1\u54d1\u54d1')) return 'bilibili';
  if (key.includes('\u5c0f\u7ea2\u4e66')) return 'xiaohongshu';
  if (key.includes('\u6dd8\u5b9d')) return 'taobao';
  if (key.includes('\u4eac\u4e1c')) return 'jd';
  if (key.includes('\u82f9\u679c')) return 'apple';
  if (key.includes('\u5fae\u8f6f')) return 'microsoft';
  if (key.includes('\u767e\u5ea6')) return 'baidu';
  if (key.includes('\u90ae\u7bb1')) return 'email';
  if (key.includes('\u624b\u673a\u53f7')) return 'phone';
  return key;
}

function initialsForNode(node) {
  const label = String(node?.platform || node?.display_name || node?.name || node?.id || '?').trim();
  return label.slice(0, 2).toUpperCase();
}

function iconUrlForNode(node) {
  if (!node) return null;
  if (node.kind === 'you') return null;
  if (node.kind !== 'provider' && node.kind !== 'platform' && node.kind !== 'account' && node.kind !== 'identifier') return null;
  const key = resolvedIconKey(node.platform || node.name);
  return localPlatformIcons[key] || platformIcons[key] || null;
}

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

    node.append('image')
      .attr('href', (d) => iconUrlForNode(d))
      .attr('x', (d) => {
        const size = d.kind === 'you' ? 28 : d.kind === 'account' ? 22 : 24;
        return -size / 2;
      })
      .attr('y', (d) => {
        const size = d.kind === 'you' ? 28 : d.kind === 'account' ? 22 : 24;
        return -size / 2;
      })
      .attr('width', (d) => (d.kind === 'you' ? 28 : d.kind === 'account' ? 22 : 24))
      .attr('height', (d) => (d.kind === 'you' ? 28 : d.kind === 'account' ? 22 : 24))
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('pointer-events', 'none')
      .style('display', (d) => (iconUrlForNode(d) ? null : 'none'));

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#d7ecff')
      .attr('font-size', (d) => (d.kind === 'you' ? 10 : 8))
      .attr('font-weight', 800)
      .attr('pointer-events', 'none')
      .style('display', (d) => (iconUrlForNode(d) ? 'none' : null))
      .text((d) => initialsForNode(d));

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
