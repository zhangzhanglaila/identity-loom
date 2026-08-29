(function () {
  const { useEffect, useMemo, useState, useRef } = React;
  const html = htm.bind(React.createElement);

  const API_BASE = 'http://localhost:8000';
  const visibleKinds = ['you', 'provider', 'platform', 'account', 'identifier', 'tag'];

  const translations = {
    zh: {
      appName: '身份图谱',
      searchPlaceholder: '搜索节点',
      search: '搜索',
      spider: '蜘蛛网',
      layered: '分层',
      graphView: '图谱',
      listView: '列表',
      addNode: '新增节点',
      addEdge: '新增关系',
      import: '导入',
      toggleView: '切换视图',
      filters: '筛选',
      showDetails: '详情',
      closePanel: '关闭面板',
      languageToggle: 'EN',
      fullGraph: '全部',
      overview: '概览',
      nodes: '节点',
      edges: '关系',
      kinds: '节点类型',
      depth: '深度',
      current: '当前',
      details: '详情',
      selectNodeOrEdge: '请选择节点或关系。',
      edgePrefix: '关系：',
      connections: '关联',
      accounts: '账号',
      name: '名称',
      type: '类型',
      links: '链接',
      noItems: '暂无内容。',
      noConnections: '暂无关联。',
      importGraph: '导入图谱',
      json: 'JSON',
      csv: 'CSV',
      close: '关闭',
      loading: '正在加载本地图谱…',
      loadFailed: '无法读取本地图谱，请先启动 Neo4j 和后端服务。',
      emptyGraph: '本地图谱暂无数据。',
      noSearchResults: '没有找到匹配节点。',
      searchFailed: '搜索失败，请确认后端服务正常。',
      importAction: '导入',
      nodeIdPrompt: '节点 ID',
      nodeKindPrompt: '节点类型',
      nodeNamePrompt: '节点名称',
      relationshipIdPrompt: '关系 ID',
      sourceNodeIdPrompt: '源节点 ID',
      targetNodeIdPrompt: '目标节点 ID',
      relationTypePrompt: '关系类型',
      graphKindLabels: {
        you: 'YOU',
        provider: '身份源',
        platform: '平台',
        account: '账号',
        identifier: '标识',
        tag: '标签'
      },
      listTabs: {
        connections: '连接',
        accounts: '账号'
      },
      importPlaceholders: {
        json: '{"nodes":[],"relationships":[]}',
        csv: 'record_type,id,source,target,relation_type,name'
      }
    },
    en: {
      appName: 'Identity Web',
      searchPlaceholder: 'Search nodes',
      search: 'Search',
      spider: 'Spider',
      layered: 'Layered',
      graphView: 'Graph',
      listView: 'List',
      addNode: 'Add Node',
      addEdge: 'Add Edge',
      import: 'Import',
      toggleView: 'Toggle View',
      filters: 'Filters',
      showDetails: 'Details',
      closePanel: 'Close panel',
      languageToggle: '中文',
      overview: 'Overview',
      fullGraph: 'Full',
      nodes: 'Nodes',
      edges: 'Edges',
      kinds: 'Kinds',
      depth: 'Depth',
      current: 'Current',
      details: 'Details',
      selectNodeOrEdge: 'Select a node or edge.',
      edgePrefix: 'Edge: ',
      connections: 'Connections',
      accounts: 'Accounts',
      name: 'Name',
      type: 'Type',
      links: 'Links',
      noItems: 'No items.',
      noConnections: 'No connections.',
      importGraph: 'Import Graph',
      json: 'JSON',
      csv: 'CSV',
      close: 'Close',
      loading: 'Loading local graph…',
      loadFailed: 'Unable to read the local graph. Start Neo4j and the backend first.',
      emptyGraph: 'The local graph has no data yet.',
      noSearchResults: 'No matching nodes found.',
      searchFailed: 'Search failed. Check that the backend is running.',
      importAction: 'Import',
      nodeIdPrompt: 'Node id',
      nodeKindPrompt: 'Node kind',
      nodeNamePrompt: 'Node name',
      relationshipIdPrompt: 'Relationship id',
      sourceNodeIdPrompt: 'Source node id',
      targetNodeIdPrompt: 'Target node id',
      relationTypePrompt: 'Relation type',
      graphKindLabels: {
        you: 'YOU',
        provider: 'Provider',
        platform: 'Platform',
        account: 'Account',
        identifier: 'Identifier',
        tag: 'Tag'
      },
      listTabs: {
        connections: 'Connections',
        accounts: 'Accounts'
      },
      importPlaceholders: {
        json: '{"nodes":[],"relationships":[]}',
        csv: 'record_type,id,source,target,relation_type,name'
      }
    }
  };

  function createT(locale) {
    const dict = translations[locale] || translations.en;
    return function t(key) {
      return dict[key] || translations.en[key] || key;
    };
  }

  function getKindLabel(locale, kind) {
    const dict = translations[locale] || translations.en;
    return (dict.graphKindLabels && dict.graphKindLabels[kind]) || kind;
  }

  const detailFieldLabels = {
    zh: {
      platform: '平台',
      username: '用户名',
      nickname: '昵称',
      email: '邮箱',
      phone: '手机号',
      uid: 'UID',
      url: '链接',
      status: '状态',
      notes: '备注',
      tags: '标签'
    },
    en: {
      platform: 'Platform',
      username: 'Username',
      nickname: 'Nickname',
      email: 'Email',
      phone: 'Phone',
      uid: 'UID',
      url: 'URL',
      status: 'Status',
      notes: 'Notes',
      tags: 'Tags'
    }
  };

  const relationLabels = {
    login_by: { zh: '登录', en: 'Login' },
    binds: { zh: '绑定', en: 'Binds' },
    belongs_to: { zh: '属于平台', en: 'Belongs to' },
    owns: { zh: '拥有', en: 'Owns' },
    verifies: { zh: '验证', en: 'Verifies' },
    registered_by: { zh: '注册于', en: 'Registered by' },
    uses: { zh: '使用', en: 'Uses' }
  };

  function formatRelationLabel(locale, relationship) {
    const raw = relationship?.label || relationship?.relation_type || 'related_to';
    return relationLabels[raw]?.[locale] || raw;
  }

  function isUserVisibleRelationship(relationship) {
    const type = relationship?.relation_type || relationship?.label;
    return Boolean(relationship) && !['owns', 'belongs_to', 'context'].includes(type);
  }

  function detailEntries(node, locale) {
    const labels = detailFieldLabels[locale] || detailFieldLabels.en;
    const keys = ['platform', 'username', 'nickname', 'email', 'phone', 'uid', 'url', 'status', 'notes', 'tags'];
    return keys
      .map((key) => [labels[key] || key, node?.[key]])
      .filter(([, value]) => value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0));
  }

  function relationshipEntries(relationship, locale) {
    const entries = [];
    const type = relationship?.label || relationship?.relation_type;
    if (type) entries.push([locale === 'zh' ? '关系' : 'Relation', formatRelationLabel(locale, relationship)]);
    if (relationship?.count > 1) entries.push([locale === 'zh' ? '关联数量' : 'Connections', relationship.count]);
    if (relationship?.status) entries.push([locale === 'zh' ? '状态' : 'Status', relationship.status]);
    if (relationship?.notes) entries.push([locale === 'zh' ? '备注' : 'Notes', relationship.notes]);
    return entries;
  }

  function displayDetailValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  }

  function renderNodeIcon(node, className) {
    const iconUrl = iconUrlForNode(node);
    if (iconUrl) {
      const iconClassName = node?.kind === 'you' ? className + ' is-spidey' : className;
      return html`<img className=${iconClassName} src=${iconUrl} alt="" aria-hidden="true" referrerPolicy="no-referrer" />`;
    }
    return html`<span className=${className + ' is-fallback'} aria-hidden="true">${initialsForNode(node)}</span>`;
  }

  const kindColors = {
    you: '#ff5c7a',
    provider: '#1f2937',
    platform: '#1f2937',
    account: '#ffffff',
    identifier: '#1f2937',
    tag: '#f89d51'
  };

  const spideySpriteUrl = '/assets/spider-theme/spidey-head-spritesheet.png';

  const platformIcons = {
    apple: 'https://cdn.simpleicons.org/apple/ffffff',
    '苹果': 'https://cdn.simpleicons.org/apple/ffffff',
    google: 'https://cdn.simpleicons.org/google/ffffff',
    '谷歌': 'https://cdn.simpleicons.org/google/ffffff',
    github: 'https://cdn.simpleicons.org/github/ffffff',
    microsoft: 'https://cdn.simpleicons.org/microsoft/ffffff',
    '微软': 'https://cdn.simpleicons.org/microsoft/ffffff',
    wechat: 'https://cdn.simpleicons.org/wechat/ffffff',
    '微信': 'https://cdn.simpleicons.org/wechat/ffffff',
    qq: 'https://cdn.simpleicons.org/tencentqq/ffffff',
    '腾讯qq': 'https://cdn.simpleicons.org/tencentqq/ffffff',
    douyin: 'https://cdn.simpleicons.org/tiktok/ffffff',
    '抖音': 'https://cdn.simpleicons.org/tiktok/ffffff',
    tiktok: 'https://cdn.simpleicons.org/tiktok/ffffff',
    bilibili: 'https://cdn.simpleicons.org/bilibili/ffffff',
    '哔哩哔哩': 'https://cdn.simpleicons.org/bilibili/ffffff',
    xiaohongshu: 'https://cdn.simpleicons.org/xiaohongshu/ffffff',
    '小红书': 'https://cdn.simpleicons.org/xiaohongshu/ffffff',
    taobao: 'https://cdn.simpleicons.org/taobao/ffffff',
    '淘宝': 'https://cdn.simpleicons.org/taobao/ffffff',
    jd: 'https://cdn.simpleicons.org/jd/ffffff',
    '京东': 'https://cdn.simpleicons.org/jd/ffffff',
    steam: 'https://cdn.simpleicons.org/steam/ffffff',
    discord: 'https://cdn.simpleicons.org/discord/ffffff',
    telegram: 'https://cdn.simpleicons.org/telegram/ffffff',
    chatgpt: 'https://cdn.simpleicons.org/openai/ffffff',
    openai: 'https://cdn.simpleicons.org/openai/ffffff',
    claude: 'https://cdn.simpleicons.org/anthropic/ffffff',
    vercel: 'https://cdn.simpleicons.org/vercel/ffffff',
    huggingface: 'https://cdn.simpleicons.org/huggingface/ffffff',
    modelscope: 'https://cdn.simpleicons.org/modelscope/ffffff',
    email: 'https://cdn.simpleicons.org/maildotru/ffffff',
    '邮箱': 'https://cdn.simpleicons.org/maildotru/ffffff',
    phone: 'https://cdn.simpleicons.org/phonepe/ffffff',
    '手机号': 'https://cdn.simpleicons.org/phonepe/ffffff'
  };

  function normalizeIconKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_./-]+/g, '');
  }

  function iconUrlForNode(node) {
    if (!node) return null;
    if (node.kind === 'you') return spideySpriteUrl;
    if (node.kind !== 'provider' && node.kind !== 'platform' && node.kind !== 'account') return null;
    const key = normalizeIconKey(node.platform || node.name);
    return platformIcons[key] || null;
  }

  function initialsForNode(node) {
    const label = String(node?.platform || node?.name || node?.id || '?').trim();
    return label.slice(0, 2).toUpperCase();
  }

  function accountGroupKey(node) {
    const platform = normalizeIconKey(node?.platform);
    if (platform) return platform;
    const fallback = normalizeIconKey(node?.id || node?.name);
    return fallback ? 'account-' + fallback : 'unknown';
  }

  function accountGroupLabel(node) {
    return String(node?.platform || node?.display_name || node?.name || node?.id || 'Account').trim();
  }

  function buildOverviewGraph(graph) {
    const sourceNodes = graph?.nodes || [];
    const sourceRelationships = graph?.relationships || [];
    const nodeById = new Map(sourceNodes.map((node) => [node.id, node]));
    const accountPlatformNames = new Map();
    const accountGroups = new Map();
    const accountToGroup = new Map();

    sourceRelationships
      .filter((relationship) => (relationship.relation_type || relationship.label) === 'belongs_to')
      .forEach((relationship) => {
        const sourceNode = nodeById.get(relationship.source);
        const targetNode = nodeById.get(relationship.target);
        if (sourceNode?.kind === 'account' && targetNode) {
          accountPlatformNames.set(sourceNode.id, targetNode.display_name || targetNode.name || targetNode.platform || targetNode.id);
        }
        if (targetNode?.kind === 'account' && sourceNode) {
          accountPlatformNames.set(targetNode.id, sourceNode.display_name || sourceNode.name || sourceNode.platform || sourceNode.id);
        }
      });

    sourceNodes.filter((node) => node.kind === 'account').forEach((account) => {
      const platformName = account.platform || accountPlatformNames.get(account.id);
      const key = normalizeIconKey(platformName) || accountGroupKey(account);
      if (!accountGroups.has(key)) {
        const label = String(platformName || accountGroupLabel(account)).trim();
        accountGroups.set(key, {
          id: 'platform-group:' + key,
          kind: 'platform',
          synthetic: true,
          name: label,
          display_name: label,
          platform: platformName || label,
          memberCount: 0,
          members: []
        });
      }
      const group = accountGroups.get(key);
      group.members.push(account);
      group.memberCount += 1;
      accountToGroup.set(account.id, group.id);
    });

    const visibleRelationships = sourceRelationships.filter(isUserVisibleRelationship);
    const participatingIds = new Set();
    visibleRelationships.forEach((relationship) => {
      participatingIds.add(relationship.source);
      participatingIds.add(relationship.target);
    });

    const nodes = sourceNodes
      .filter((node) => {
        if (node.kind === 'account' || node.kind === 'platform' || node.kind === 'tag') return false;
        if (node.kind === 'you') return true;
        return participatingIds.has(node.id);
      })
      .map((node) => ({ ...node }));
    nodes.push(...accountGroups.values());

    const nodeIds = new Set(nodes.map((node) => node.id));
    const relationshipMap = new Map();
    visibleRelationships.forEach((relationship) => {
      const source = accountToGroup.get(relationship.source) || relationship.source;
      const target = accountToGroup.get(relationship.target) || relationship.target;
      if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;

      const relationType = relationship.relation_type || relationship.label || 'related_to';
      const key = [source, target, relationType].sort().join('::');
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, {
          id: 'overview-link:' + relationshipMap.size,
          source,
          target,
          relation_type: relationType,
          label: relationship.label || relationType,
          count: 0,
          member_ids: []
        });
      }
      const aggregated = relationshipMap.get(key);
      aggregated.count += 1;
      aggregated.member_ids.push({ source: relationship.source, target: relationship.target });
    });

    return {
      nodes,
      relationships: [...relationshipMap.values()]
    };
  }

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

  function nodeLabel(node) {
    return node?.username || node?.display_name || node?.name || node?.id || '';
  }

  function Toolbar(props) {
    const q = props.query;
    const onQueryChange = props.onQueryChange;
    const onSearch = props.onSearch;
    const onToggleLayout = props.onToggleLayout;
    const layoutMode = props.layoutMode;
    const displayMode = props.displayMode;
    const onToggleDisplayMode = props.onToggleDisplayMode;
    const viewMode = props.viewMode;
    const onToggleView = props.onToggleView;
    const locale = props.locale;
    const onToggleLanguage = props.onToggleLanguage;
    const t = props.t;
    const onAddNode = props.onAddNode;
    const onAddRelationship = props.onAddRelationship;
    const onImport = props.onImport;
    const onToggleSidebar = props.onToggleSidebar;
    const onToggleDetails = props.onToggleDetails;
    const isSidebarOpen = props.isSidebarOpen;
    const isDetailsOpen = props.isDetailsOpen;
    const searchMessage = props.searchMessage;

    return html`
      <div className="toolbar">
        <div className="toolbar__brand">${t('appName')}</div>
        <input
          className="toolbar__search"
          value=${q}
          onInput=${(e) => onQueryChange(e.target.value)}
          onKeyDown=${(e) => e.key === 'Enter' && onSearch()}
          placeholder=${t('searchPlaceholder')}
        />
        ${searchMessage ? html`<span className="toolbar__search-message">${searchMessage}</span>` : null}
        <button className="toolbar__button" onClick=${onSearch}>${t('search')}</button>
        <button className="toolbar__button" onClick=${onToggleLayout}>${layoutMode === 'spider' ? t('spider') : t('layered')}</button>
        <button className="toolbar__button" onClick=${onToggleDisplayMode}>${displayMode === 'overview' ? t('fullGraph') : t('overview')}</button>
        <button className="toolbar__button" onClick=${onToggleView}>${viewMode === 'graph' ? t('graphView') : t('listView')}</button>
        <button
          className=${'toolbar__button toolbar__button--icon ' + (isSidebarOpen ? 'is-active' : '')}
          onClick=${onToggleSidebar}
          title=${t('filters')}
          aria-label=${t('filters')}
        >☰</button>
        <button
          className=${'toolbar__button toolbar__button--icon ' + (isDetailsOpen ? 'is-active' : '')}
          onClick=${onToggleDetails}
          title=${t('showDetails')}
          aria-label=${t('showDetails')}
        >i</button>
        <button className="toolbar__button" onClick=${onAddNode}>${t('addNode')}</button>
        <button className="toolbar__button" onClick=${onAddRelationship}>${t('addEdge')}</button>
        <button className="toolbar__button" onClick=${onImport}>${t('import')}</button>
        <button className="toolbar__button toolbar__button--language" onClick=${onToggleLanguage} lang=${locale === 'zh' ? 'en' : 'zh'}>${t('languageToggle')}</button>
      </div>
    `;
  }

  function isConnectionNode(node) {
    return node && (node.kind === 'provider' || node.kind === 'platform' || node.kind === 'identifier');
  }

  function ListView(props) {
    const nodes = props.nodes || [];
    const relationships = props.relationships || [];
    const selectedId = props.selectedId;
    const onSelectNode = props.onSelectNode;
    const locale = props.locale;
    const t = props.t;
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
            ${t('listTabs').connections} (${connections.length})
          </button>
          <button className=${'list-view__tab ' + (tab === 'accounts' ? 'is-active' : '')} onClick=${() => setTab('accounts')}>
            ${t('listTabs').accounts} (${accounts.length})
          </button>
        </div>
        <div className="list-view__header">
          <div>${t('name')}</div>
          <div>${t('type')}</div>
          <div className="list-view__header-right">${t('links')}</div>
        </div>
        <div className="list-view__body">
          ${activeItems.length === 0
            ? html`<div className="panel__empty">${t('noItems')}</div>`
            : activeItems.map((item) => {
                const selected = String(item.id) === String(selectedId);
                const links = tab === 'connections'
                  ? (item.synthetic ? Array.from({ length: item.memberCount || 0 }) : linkedAccountsForConnection(item.id))
                  : linkedConnectionsForAccount(item.id);
                return html`
                  <button key=${item.id} type="button" className=${'list-view__row ' + (selected ? 'is-selected' : '')} onClick=${() => onSelectNode(item)}>
                    <div className="list-view__name">
                      ${renderNodeIcon(item, 'list-view__icon')}
                      <span className="list-view__name-text">${item.display_name || item.name || item.id}</span>
                    </div>
                    <div className="list-view__kind">${getKindLabel(locale, item.kind)}</div>
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
    const locale = props.locale;
    const t = props.t;
    const onClose = props.onClose;

    const toggleKind = (kind) => {
      const next = filters.kinds.includes(kind)
        ? filters.kinds.filter((item) => item !== kind)
        : [...filters.kinds, kind];
      setFilters({ ...filters, kinds: next });
    };

    return html`
      <aside className="sidebar">
        <div className="panel">
          <div className="panel__heading">
            <div className="panel__title">${t('overview')}</div>
            <button className="panel__close" onClick=${onClose} title=${t('closePanel')} aria-label=${t('closePanel')}>×</button>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat__label">${t('nodes')}</div>
              <div className="stat__value">${stats.nodes ?? 0}</div>
            </div>
            <div className="stat">
              <div className="stat__label">${t('edges')}</div>
              <div className="stat__value">${stats.relationships ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">${t('kinds')}</div>
          ${visibleKinds.map((kind) => html`
            <label className="checkline" key=${kind}>
              <input type="checkbox" checked=${filters.kinds.includes(kind)} onChange=${() => toggleKind(kind)} />
              <span>${getKindLabel(locale, kind)}</span>
            </label>
          `)}
        </div>

        <div className="panel">
          <div className="panel__title">${t('depth')}</div>
          <input type="range" min="1" max="3" value=${filters.depth} onInput=${(e) => setFilters({ ...filters, depth: Number(e.target.value) })} />
          <div className="panel__note">${t('current')}: ${filters.depth}</div>
        </div>
      </aside>
    `;
  }

  function DetailPanel(props) {
    const node = props.node;
    const relationship = props.relationship;
    const neighbors = props.neighbors;
    const graphNodes = props.graphNodes || [];
    const graphRelationships = props.graphRelationships || [];
    const onSelectNode = props.onSelectNode;
    const onSelectMember = props.onSelectMember;
    const locale = props.locale;
    const t = props.t;
    const onClose = props.onClose;

    const panelHeading = (title, iconNode) => html`
      <div className="panel__heading">
        <div className="panel__heading-left">
          ${iconNode ? renderNodeIcon(iconNode, 'panel__icon') : null}
          <div className="panel__title">${title}</div>
        </div>
        <button className="panel__close" onClick=${onClose} title=${t('closePanel')} aria-label=${t('closePanel')}>×</button>
      </div>
    `;

    if (!node && !relationship) {
      return html`
        <aside className="detail-panel">
          <div className="panel">
            ${panelHeading(t('details'))}
            <div className="panel__empty">${t('selectNodeOrEdge')}</div>
          </div>
        </aside>
      `;
    }

    if (relationship) {
      const title = t('edgePrefix') + formatRelationLabel(locale, relationship);
      return html`
        <aside className="detail-panel">
          <div className="panel">
            ${panelHeading(title)}
            <div className="detail-list">
              ${relationshipEntries(relationship, locale).map(([key, value]) => html`
                <div className="detail-row" key=${key}>
                  <span className="detail-row__key">${key}</span>
                  <span className="detail-row__value">${displayDetailValue(value)}</span>
                </div>
              `)}
            </div>
          </div>
        </aside>
      `;
    }

    if (node.synthetic) {
      const members = node.members || [];
      const title = nodeLabel(node);
      const connections = graphRelationships
        .filter((rel) => rel.source === node.id || rel.target === node.id)
        .map((rel) => {
          const otherId = rel.source === node.id ? rel.target : rel.source;
          const other = graphNodes.find((item) => item.id === otherId);
          return { rel, other };
        })
        .filter((item) => item.other);
      return html`
        <aside className="detail-panel">
          <div className="panel">
            ${panelHeading(title, node)}
            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-row__key">${t('accounts')}</span>
                <span className="detail-row__value">${members.length}</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__title">${t('accounts')}</div>
            ${members.length === 0
              ? html`<div className="panel__empty">${t('noItems')}</div>`
              : html`<div className="connection-list">
                  ${members.map((member) => html`
                    <button key=${member.id} type="button" className="connection-row" onClick=${() => onSelectMember && onSelectMember(member)}>
                      <span className="connection-row__label">${nodeLabel(member)}</span>
                      <span className="connection-row__name">
                        ${renderNodeIcon(member, 'connection-row__icon')}
                        <span className="connection-row__text">${member.id}</span>
                      </span>
                    </button>
                  `)}
                </div>`}
          </div>

          <div className="panel">
            <div className="panel__title">${t('connections')}</div>
            ${connections.length === 0
              ? html`<div className="panel__empty">${t('noConnections')}</div>`
              : html`<div className="connection-list">
                  ${connections.map((item) => html`
                    <button key=${item.rel.id} type="button" className="connection-row" onClick=${() => onSelectNode && onSelectNode(item.other)}>
                      <span className="connection-row__label">${formatRelationLabel(locale, item.rel)}</span>
                      <span className="connection-row__name">
                        ${renderNodeIcon(item.other, 'connection-row__icon')}
                        <span className="connection-row__text">${item.other.display_name || item.other.name || item.other.id}</span>
                      </span>
                    </button>
                  `)}
                </div>`}
          </div>
        </aside>
      `;
    }

    const title = nodeLabel(node);
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
          ${panelHeading(title, node)}
          <div className="detail-list">
              ${detailEntries(node, locale).map(([key, value]) => html`
                <div className="detail-row" key=${key}>
                  <span className="detail-row__key">${key}</span>
                  <span className="detail-row__value">${displayDetailValue(value)}</span>
                </div>
            `)}
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">${t('connections')}</div>
          ${connections.length === 0
            ? html`<div className="panel__empty">${t('noConnections')}</div>`
            : html`<div className="connection-list">
                ${connections.map((c) => html`
                  <button key=${c.rel.id} type="button" className="connection-row" onClick=${() => onSelectNode && onSelectNode(c.other)}>
                    <span className="connection-row__label">${formatRelationLabel(locale, c.rel)}</span>
                    <span className="connection-row__name">
                      ${renderNodeIcon(c.other, 'connection-row__icon')}
                      <span className="connection-row__text">${nodeLabel(c.other)}</span>
                    </span>
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
    const t = props.t;
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
          <div className="panel__title">${t('importGraph')}</div>
          <div className="mode-switch">
            <button className=${'mode-switch__button ' + (mode === 'json' ? 'is-active' : '')} onClick=${() => setMode('json')}>${t('json')}</button>
            <button className=${'mode-switch__button ' + (mode === 'csv' ? 'is-active' : '')} onClick=${() => setMode('csv')}>${t('csv')}</button>
          </div>
          <textarea className="modal__textarea" value=${text} onInput=${(e) => setText(e.target.value)} placeholder=${t('importPlaceholders')[mode]}></textarea>
          <div className="modal__actions">
            <button className="toolbar__button" onClick=${onClose}>${t('close')}</button>
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
              ${t('importAction')}
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
    const iconCacheRef = useRef(new Map());

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
      const iconCache = iconCacheRef.current;
      processed.nodes.forEach((node) => {
        const url = iconUrlForNode(node);
        if (!url || iconCache.has(url)) return;
        const image = new Image();
        image.crossOrigin = 'anonymous';
        iconCache.set(url, { image: image, loaded: false, failed: false });
        image.onload = () => {
          const entry = iconCache.get(url);
          if (entry) entry.loaded = true;
          render();
        };
        image.onerror = () => {
          const entry = iconCache.get(url);
          if (entry) entry.failed = true;
          render();
        };
        image.src = url;
      });

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

      const rootNode = processed.nodes.find((node) => node.kind === 'you');
      if (rootNode) {
        rootNode.fx = width / 2;
        rootNode.fy = height / 2;
      }

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

      const centerOnFocus = () => {
        if (!focusNodeId) return;
        const focusNode = processed.nodes.find((node) => node.id === focusNodeId);
        if (!focusNode || !Number.isFinite(focusNode.x) || !Number.isFinite(focusNode.y)) return;
        const scale = 1.35;
        const nextTransform = d3.zoomIdentity
          .translate(width / 2 - focusNode.x * scale, height / 2 - focusNode.y * scale)
          .scale(scale);
        d3.select(canvas).call(zoom.transform, nextTransform);
      };

      const linked = new Map();
      processed.links.forEach((link) => {
        const key = [link.source, link.target].sort().join('::');
        linked.set(key, link);
      });

      const render = () => {
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(5, 11, 20, 0.68)';
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
          ctx.strokeStyle = active ? 'rgba(150, 224, 247, 0.56)' : 'rgba(150, 224, 247, 0.16)';
          ctx.lineWidth = active ? 1.6 : 0.7;
          ctx.quadraticCurveTo((sx + tx) / 2, (sy + ty) / 2 - dr * 0.06, tx, ty);
          ctx.stroke();
        });

        processed.nodes.forEach((node) => {
          const active = isActiveNode(node);
          const hasIcon = Boolean(iconUrlForNode(node));
          const r = node.kind === 'you' ? 27 : node.kind === 'account' ? 17 : node.kind === 'provider' || node.kind === 'identifier' || node.kind === 'platform' ? 22 : 13;
          const fill = node.kind === 'you'
            ? '#ff5c7a'
            : node.kind === 'account'
              ? 'rgba(248, 250, 252, 0.85)'
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

          const iconUrl = iconUrlForNode(node);
          const icon = iconUrl ? iconCache.get(iconUrl) : null;
          if (icon && icon.loaded && !icon.failed) {
            const size = r * 1.18;
            if (iconUrl === spideySpriteUrl) {
              const sourceSize = Math.min(icon.image.width, icon.image.height);
              ctx.drawImage(icon.image, 0, 0, sourceSize, sourceSize, x - size / 2, y - size / 2, size, size);
            } else {
              ctx.drawImage(icon.image, x - size / 2, y - size / 2, size, size);
            }
          } else if (hasIcon || node.kind === 'provider' || node.kind === 'platform') {
            ctx.fillStyle = '#d7ecff';
            ctx.font = '800 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initialsForNode(node), x, y + 1);
          } else if (node.kind === 'account') {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();

          const shouldLabel = node.kind === 'you'
            || node.kind === 'provider'
            || node.kind === 'identifier'
            || node.id === selectedNodeId
            || (focused && activeNodeIds?.has(node.id) && !node.synthetic);
          if (shouldLabel) {
            const baseLabel = node.kind === 'account'
              ? (node.username || node.name || node.id)
              : (node.display_name || node.name || node.id);
            const label = node.synthetic && node.memberCount > 1
              ? baseLabel + ' (' + node.memberCount + ')'
              : baseLabel;
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
      simulation.on('end', centerOnFocus);
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
        if (node && node.kind !== 'you') {
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
        if (rootNode) {
          rootNode.fx = nextWidth / 2;
          rootNode.fy = nextHeight / 2;
        }
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
    const [locale, setLocale] = useState('zh');
    const [query, setQuery] = useState('');
    const [layoutMode, setLayoutMode] = useState('spider');
    const [displayMode, setDisplayMode] = useState('overview');
    const [viewMode, setViewMode] = useState('graph');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [filters, setFilters] = useState({ kinds: visibleKinds, depth: 1 });
    const [graph, setGraph] = useState({ nodes: [], relationships: [] });
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedRelationship, setSelectedRelationship] = useState(null);
    const [neighbors, setNeighbors] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [dataState, setDataState] = useState('loading');
    const [searchState, setSearchState] = useState('idle');
    const t = createT(locale);

    const loadGraph = async () => {
      setDataState('loading');
      try {
        const data = await getOverview(1000);
        if (Array.isArray(data?.nodes) && Array.isArray(data?.relationships)) {
          setGraph({ nodes: data.nodes, relationships: data.relationships });
          setDataState(data.nodes.length > 0 ? 'ready' : 'empty');
          return;
        }
        throw new Error('Invalid graph response');
      } catch {
        setGraph({ nodes: [], relationships: [] });
        setDataState('error');
      }
    };

    useEffect(() => {
      loadGraph();
    }, []);

    const displayGraph = useMemo(() => (
      displayMode === 'overview' ? buildOverviewGraph(graph) : graph
    ), [graph, displayMode]);

    const neighborIds = useMemo(() => {
      if (!neighbors?.nodes) return null;
      return new Set(neighbors.nodes.map((node) => node.id));
    }, [neighbors]);

    const graphHighlightIds = useMemo(() => {
      const localNeighborIds = selectedNode
        ? new Set(displayGraph.relationships
            .filter((rel) => rel.source === selectedNode.id || rel.target === selectedNode.id)
            .map((rel) => rel.source === selectedNode.id ? rel.target : rel.source))
        : null;
      const sourceIds = neighborIds || localNeighborIds;
      if (!sourceIds || displayMode !== 'overview') return sourceIds;
      const accountGroupIds = new Map();
      displayGraph.nodes.filter((node) => node.synthetic).forEach((group) => {
        (group.members || []).forEach((member) => accountGroupIds.set(member.id, group.id));
      });
      return new Set([...sourceIds].map((id) => accountGroupIds.get(id) || id));
    }, [neighborIds, displayGraph, displayMode, selectedNode]);

    const filteredGraph = useMemo(() => {
      const nodes = displayGraph.nodes.filter((node) => filters.kinds.includes(node.kind));
      const nodeIds = new Set(nodes.map((node) => node.id));
      const relationships = displayGraph.relationships.filter(
        (rel) => nodeIds.has(rel.source) && nodeIds.has(rel.target)
      );
      return { nodes: nodes, relationships: relationships };
    }, [displayGraph, filters]);

    const displayStats = useMemo(() => ({
      nodes: filteredGraph.nodes.length,
      relationships: filteredGraph.relationships.length
    }), [filteredGraph]);

    const searchMessage = searchState === 'empty'
      ? t('noSearchResults')
      : searchState === 'error'
        ? t('searchFailed')
        : null;

    const handleSearch = async () => {
      const term = query.trim();
      if (!term) {
        setSearchState('idle');
        return;
      }
      try {
        const results = await searchNodes(term);
        if (!Array.isArray(results) || results.length === 0) {
          setSearchState('empty');
          return;
        }
        setSearchState('ready');
        setDisplayMode('full');
        const merged = dedupeById([...graph.nodes, ...results]);
        setGraph({ nodes: merged, relationships: graph.relationships });
        if (results[0]) {
          setSelectedNode(results[0]);
          setSelectedRelationship(null);
          setNeighbors(null);
          setIsDetailsOpen(true);
          try {
            const data = await getNeighbors(results[0].id, 1);
            setNeighbors(data);
          } catch {
            setNeighbors(null);
          }
        }
      } catch {
        setSearchState('error');
      }
    };

    const handleSelectNode = async (node) => {
      if (!node) return;
      setSelectedNode(node);
      setSelectedRelationship(null);
      setNeighbors(null);
      setIsDetailsOpen(true);
      if (node.synthetic) return;
      try {
        const data = await getNeighbors(node.id, 1);
        setNeighbors(data);
      } catch {
        setNeighbors(null);
      }
    };

    const handleSelectMember = async (node) => {
      setDisplayMode('full');
      await handleSelectNode(node);
    };

    const handleSelectRelationship = (relationship) => {
      setSelectedRelationship(relationship);
      setSelectedNode(null);
      setNeighbors(null);
      setIsDetailsOpen(true);
    };

    const handleAddNode = async () => {
      const id = window.prompt(t('nodeIdPrompt'));
      if (!id) return;
      const kind = window.prompt(t('nodeKindPrompt'), 'account') || 'account';
      const name = window.prompt(t('nodeNamePrompt'));
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
      const id = window.prompt(t('relationshipIdPrompt'));
      if (!id) return;
      const source = window.prompt(t('sourceNodeIdPrompt'));
      const target = window.prompt(t('targetNodeIdPrompt'));
      const relation_type = window.prompt(t('relationTypePrompt'), 'related_to') || 'related_to';
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
          displayMode=${displayMode}
          onToggleDisplayMode=${() => {
            const next = displayMode === 'overview' ? 'full' : 'overview';
            setDisplayMode(next);
            setSelectedNode(null);
            setSelectedRelationship(null);
            setNeighbors(null);
          }}
          viewMode=${viewMode}
          onToggleView=${() => setViewMode((mode) => (mode === 'graph' ? 'list' : 'graph'))}
          locale=${locale}
          t=${t}
          onToggleLanguage=${() => setLocale((current) => (current === 'zh' ? 'en' : 'zh'))}
          onAddNode=${handleAddNode}
          onAddRelationship=${handleAddRelationship}
          onImport=${() => setImportOpen(true)}
          onToggleSidebar=${() => setIsSidebarOpen((open) => !open)}
          onToggleDetails=${() => setIsDetailsOpen((open) => !open)}
          isSidebarOpen=${isSidebarOpen}
          isDetailsOpen=${isDetailsOpen}
          searchMessage=${searchMessage}
        />

        <div className="content">
          <div className="theme-radar" aria-hidden="true"></div>
          ${isSidebarOpen
            ? html`<${Sidebar}
                filters=${filters}
                setFilters=${setFilters}
                stats=${displayStats}
                locale=${locale}
                t=${t}
                onClose=${() => setIsSidebarOpen(false)}
              />`
            : null}
          <main className="graph-area">
            ${dataState !== 'ready'
              ? html`<div className="graph-status graph-status--${dataState}">${t(dataState === 'loading' ? 'loading' : dataState === 'empty' ? 'emptyGraph' : 'loadFailed')}</div>`
              : viewMode === 'graph'
              ? html`
                  <${GraphCanvas}
                    nodes=${filteredGraph.nodes}
                    relationships=${filteredGraph.relationships}
                    layoutMode=${layoutMode}
                    selectedNodeId=${selectedNode?.id}
                    focusNodeId=${selectedNode?.id}
                    highlightIds=${graphHighlightIds}
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
                    locale=${locale}
                    t=${t}
                  />
                `}
          </main>
          ${isDetailsOpen
            ? html`<${DetailPanel}
                node=${selectedNode}
                relationship=${selectedRelationship}
                neighbors=${neighbors}
                graphNodes=${filteredGraph.nodes}
                graphRelationships=${filteredGraph.relationships}
                onSelectNode=${handleSelectNode}
                onSelectMember=${handleSelectMember}
                onClose=${() => setIsDetailsOpen(false)}
                locale=${locale}
                t=${t}
              />`
            : null}
        </div>

        <${ImportDialog}
          open=${importOpen}
          onClose=${() => setImportOpen(false)}
          onImportJson=${handleImportJson}
          onImportCsv=${handleImportCsv}
          locale=${locale}
          t=${t}
        />
      </div>
    `;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
})();
