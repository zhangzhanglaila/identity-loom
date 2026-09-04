(function () {
  const { useEffect, useMemo, useState, useRef, useCallback } = React;
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
    login_by: { zh: '登录', en: 'Login', zhRev: '用于登录', enRev: 'Used by' },
    binds: { zh: '绑定', en: 'Binds', zhRev: '绑定账号', enRev: 'Bound by' },
    belongs_to: { zh: '属于平台', en: 'Belongs to', zhRev: '旗下账号', enRev: 'Accounts' },
    owns: { zh: '拥有', en: 'Owns', zhRev: '拥有者', enRev: 'Owner' },
    verifies: { zh: '验证', en: 'Verifies', zhRev: '验证', enRev: 'Verifies' },
    registered_by: { zh: '注册于', en: 'Registered by', zhRev: '注册于', enRev: 'Registered by' },
    uses: { zh: '使用', en: 'Uses', zhRev: '使用者', enRev: 'Used by' }
  };

  // reversed: 当前查看的节点处于关系的 target 一端时，使用反向文案
  function formatRelationLabel(locale, relationship, reversed) {
    const raw = relationship?.label || relationship?.relation_type || 'related_to';
    const item = relationLabels[raw];
    if (!item) return raw;
    if (reversed) return item[locale + 'Rev'] || item[locale];
    return item[locale];
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

  const spideyAvatarUrl = '/assets/spider-theme/spidey-x-avatar.jpg';

  function svgDataUrl(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function textIcon(bgColor, text, fontSize) {
    const fs = fontSize || (text.length > 3 ? 28 : text.length > 2 ? 34 : 44);
    const y = fs > 40 ? 80 : fs > 30 ? 76 : 72;
    return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${bgColor}"/><text x="64" y="${y}" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${fs}" font-weight="700" fill="#ffffff">${text}</text></svg>`);
  }

  const platformIcons = {
    google: 'https://cdn.simpleicons.org/google/ffffff',
    '谷歌': 'https://cdn.simpleicons.org/google/ffffff',
    github: 'https://cdn.simpleicons.org/github/ffffff',
    wechat: 'https://cdn.simpleicons.org/wechat/ffffff',
    '微信': 'https://cdn.simpleicons.org/wechat/ffffff',
    qq: 'https://cdn.simpleicons.org/qq/ffffff',
    '腾讯qq': 'https://cdn.simpleicons.org/qq/ffffff',
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
    cloudflare: 'https://cdn.simpleicons.org/cloudflare/ffffff',
    docker: 'https://cdn.simpleicons.org/docker/ffffff',
    postman: 'https://cdn.simpleicons.org/postman/ffffff',
    redis: 'https://cdn.simpleicons.org/redis/ffffff',
    neo4j: 'https://cdn.simpleicons.org/neo4j/ffffff',
    cisco: 'https://cdn.simpleicons.org/cisco/ffffff',
    codeforces: 'https://cdn.simpleicons.org/codeforces/ffffff',
    deepseek: 'https://cdn.simpleicons.org/deepseek/ffffff',
    leetcode: 'https://cdn.simpleicons.org/leetcode/ffffff',
    minimax: 'https://cdn.simpleicons.org/minimax/ffffff',
    apifox: 'https://cdn.simpleicons.org/apifox/ffffff',
    alipay: 'https://cdn.simpleicons.org/alipay/ffffff',
    huawei: 'https://cdn.simpleicons.org/huawei/ffffff',
    xiaomi: 'https://cdn.simpleicons.org/xiaomi/ffffff',
    baidu: 'https://cdn.simpleicons.org/baidu/ffffff',
    csdn: 'https://cdn.simpleicons.org/csdn/ffffff'
  };

  const localPlatformIcons = {
    qq: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#12b7f5"/><circle cx="46" cy="52" r="14" fill="#ffffff"/><circle cx="82" cy="52" r="14" fill="#ffffff"/><ellipse cx="64" cy="79" rx="30" ry="12" fill="#ffffff"/><path d="M39 66c4-18 14-28 25-28s21 10 25 28" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>'),
    tencentqq: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#12b7f5"/><circle cx="46" cy="52" r="14" fill="#ffffff"/><circle cx="82" cy="52" r="14" fill="#ffffff"/><ellipse cx="64" cy="79" rx="30" ry="12" fill="#ffffff"/><path d="M39 66c4-18 14-28 25-28s21 10 25 28" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>'),
    microsoftoutlook: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0f6cbd"/><rect x="22" y="30" width="84" height="68" rx="12" fill="#ffffff"/><path d="M28 42l36 24 36-24" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 86l28-20 8 6 36-26" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="48" r="16" fill="#0f6cbd"/><text x="92" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">O</text></svg>'),
    outlook: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0f6cbd"/><rect x="22" y="30" width="84" height="68" rx="12" fill="#ffffff"/><path d="M28 42l36 24 36-24" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 86l28-20 8 6 36-26" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="48" r="16" fill="#0f6cbd"/><text x="92" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">O</text></svg>'),
    wust: textIcon('#1e5aa8', '武科'),
    '武科大': textIcon('#1e5aa8', '武科'),
    '武科大助手': textIcon('#1e5aa8', '助手'),
    '武科大acm': textIcon('#1e5aa8', 'ACM', 36),
    server: textIcon('#4a5568', 'Server', 30),
    '服务器': textIcon('#4a5568', '服务器', 30),
    '服务器监控': textIcon('#4a5568', '监控'),
    database: textIcon('#336791', 'DB'),
    '数据库': textIcon('#336791', '数据库', 30),
    '微信小程序': textIcon('#07c160', '小程序', 32),
    wechatminiapp: textIcon('#07c160', '小程序', 32),
    doubao: textIcon('#3370ff', '豆包'),
    '豆包': textIcon('#3370ff', '豆包'),
    quark: textIcon('#0066ff', '夸克'),
    '夸克': textIcon('#0066ff', '夸克'),
    netease: textIcon('#e60012', '163'),
    '网易': textIcon('#e60012', '网易'),
    '163': textIcon('#e60012', '163'),
    tencent: textIcon('#0052d9', '腾讯'),
    '腾讯': textIcon('#0052d9', '腾讯'),
    aliyun: textIcon('#ff6a00', '阿里云', 30),
    '阿里云': textIcon('#ff6a00', '阿里云', 30),
    amap: textIcon('#00b4ff', '高德'),
    '高德': textIcon('#00b4ff', '高德'),
    baidumap: textIcon('#2932e1', '地图'),
    '百度地图': textIcon('#2932e1', '地图'),
    baiduzhidao: textIcon('#2932e1', '知道'),
    '百度知道': textIcon('#2932e1', '知道'),
    chsi: textIcon('#2b5fb8', '学信'),
    '学信网': textIcon('#2b5fb8', '学信'),
    chinamobile: textIcon('#0085d0', '移动'),
    '中国移动': textIcon('#0085d0', '移动'),
    icbc: textIcon('#c8161d', '工行'),
    '工商银行': textIcon('#c8161d', '工行'),
    unionpay: textIcon('#e60012', '闪付'),
    '云闪付': textIcon('#e60012', '闪付'),
    '国家反诈中心': textIcon('#d4302c', '反诈', 32),
    '智慧团建': textIcon('#e60012', '团建'),
    zhihuituangjian: textIcon('#e60012', '团建'),
    chaoxing: textIcon('#1d6dd1', '超星'),
    '超星': textIcon('#1d6dd1', '超星'),
    xueyinonline: textIcon('#0066cc', '学银'),
    '学银在线': textIcon('#0066cc', '学银'),
    ulearning: textIcon('#0099ff', '优学'),
    '优学院': textIcon('#0099ff', '优学'),
    eudic: textIcon('#ff6600', '欧路'),
    '欧路词典': textIcon('#ff6600', '欧路'),
    saikr: textIcon('#ff6600', '赛氪'),
    '赛氪': textIcon('#ff6600', '赛氪'),
    ezviz: textIcon('#0099ff', '萤石'),
    '萤石': textIcon('#0099ff', '萤石'),
    '鲨鱼记账': textIcon('#00b4ff', '鲨鱼'),
    shayuzhangdan: textIcon('#00b4ff', '鲨鱼'),
    '一元机场': textIcon('#667eea', '机场'),
    ygcloud: textIcon('#667eea', '机场'),
    '领航网盘': textIcon('#3370ff', '领航'),
    lanzou: textIcon('#3370ff', '领航'),
    '大学搜题酱': textIcon('#ff6600', '搜题'),
    soujiao: textIcon('#ff6600', '搜题'),
    '希冀': textIcon('#0099ff', '希冀'),
    hduhelp: textIcon('#0099ff', '希冀'),
    '四级': textIcon('#1e5aa8', '四级'),
    '湖北文旅': textIcon('#1e5aa8', '文旅'),
    '白描': textIcon('#4a5568', '白描'),
    baimiao: textIcon('#4a5568', '白描'),
    '智慧树': textIcon('#0099ff', '智慧树', 30),
    zhihuishu: textIcon('#0099ff', '智慧树', 30),
    '优课': textIcon('#0099ff', '优课'),
    uclass: textIcon('#0099ff', '优课'),
    '睿抗': textIcon('#4a5568', '睿抗'),
    vjudge: textIcon('#4a5568', '睿抗'),
    '刘阳下载器': textIcon('#3370ff', '下载'),
    liuyang: textIcon('#3370ff', '下载'),
    '硅基流动': textIcon('#0066ff', '硅基'),
    siliconflow: textIcon('#0066ff', '硅基'),
    pin: textIcon('#bd081c', 'PIN', 36),
    oj: textIcon('#4a5568', 'OJ', 36),
    pta: textIcon('#4a5568', 'PTA', 32),
    neea: textIcon('#1e5aa8', 'NEEA', 28),
    wsl: textIcon('#0078d4', 'WSL', 36),
    wifi: textIcon('#0099ff', 'WiFi', 36),
    mac: textIcon('#555555', 'Mac', 38),
    xshell: textIcon('#4a5568', 'XSh', 36),
    vmware: textIcon('#607078', 'VM', 40),
    cpolar: textIcon('#4a5568', 'cpolar', 28),
    pika: textIcon('#ff6b6b', 'pika', 32),
    trae: textIcon('#000000', 'TRAE', 32),
    codex: textIcon('#10a37f', 'Codex', 28),
    claudecode: textIcon('#d97757', 'CC', 44),
    claude: textIcon('#d97757', 'Claude', 28),
    elastic: textIcon('#005571', 'ES', 40),
    fastgpt: textIcon('#0066ff', 'FGPT', 32),
    goodnotes: textIcon('#ff6b6b', 'GN', 44),
    anythingllm: textIcon('#6c5ce7', 'ALLM', 28),
    oneapi: textIcon('#0099ff', '1API', 32),
    aihubmix: textIcon('#6c5ce7', 'AIHub', 28),
    modelscope: textIcon('#ff6a00', 'ModelScope', 22),
    huggingface: textIcon('#ffd21e', 'HF', 44),
    openai: textIcon('#10a37f', 'OpenAI', 26),
    chatgpt: textIcon('#10a37f', 'ChatGPT', 24),
    anger: textIcon('#4a5568', 'anger', 28),
    clustrmaps: textIcon('#4a5568', 'CM', 40),
    doc2markdown: textIcon('#4a5568', 'd2m', 36),
    freenote: textIcon('#4a5568', 'freenote', 24),
    ipinfo: textIcon('#4a5568', 'ipinfo', 26),
    jable: textIcon('#4a5568', 'Jable', 28),
    taonga: textIcon('#4a5568', 'Taonga', 26),
    terabox: textIcon('#4a5568', 'TeraBox', 24),
    usatoday: textIcon('#4a5568', 'USA', 36),
    x: textIcon('#000000', 'X', 52),
    serpapi: textIcon('#4a5568', 'SerpAPI', 24),
    tavily: textIcon('#4a5568', 'Tavily', 26)
  };

  const iconAliases = {
    tencentqq: 'qq',
    '腾讯qq': 'qq',
    qqmail: 'qq',
    'qq邮箱': 'qq',
    qqmailcom: 'qq',
    microsoftoutlook: 'outlook',
    outlookmail: 'outlook',
    outlookcom: 'outlook',
    office365: 'outlook',
    microsoft365: 'outlook',
    hotmail: 'outlook',
    live: 'outlook'
  };

  const platformDomains = {
    apple: 'apple.com',
    '苹果': 'apple.com',
    microsoft: 'microsoft.com',
    '微软': 'microsoft.com',
    email: 'mail.google.com',
    '邮箱': 'mail.google.com',
    phone: 'phonepe.com',
    '手机号': 'phonepe.com',
    outlook: 'outlook.live.com',
    gmail: 'mail.google.com',
    googlemail: 'mail.google.com',
    chatgpt: 'openai.com',
    openai: 'openai.com',
    codex: 'openai.com',
    claude: 'anthropic.com',
    claudecode: 'anthropic.com',
    wechat: 'weixin.qq.com',
    '微信': 'weixin.qq.com',
    '微信小程序': 'mp.weixin.qq.com',
    tencent: 'tencent.com',
    '腾讯': 'tencent.com',
    netease: '163.com',
    '网易': '163.com',
    aliyun: 'aliyun.com',
    '阿里云': 'aliyun.com',
    baidumap: 'map.baidu.com',
    '百度地图': 'map.baidu.com',
    baiduzhidao: 'zhidao.baidu.com',
    '百度知道': 'zhidao.baidu.com',
    chinamobile: '10086.cn',
    '中国移动': '10086.cn',
    unionpay: 'unionpay.com',
    '云闪付': 'unionpay.com',
    icbc: 'icbc.com.cn',
    '工商银行': 'icbc.com.cn',
    amap: 'amap.com',
    '高德': 'amap.com',
    chsi: 'chsi.com.cn',
    '学信网': 'chsi.com.cn',
    xueyinonline: 'xueyinonline.com',
    '学银在线': 'xueyinonline.com',
    ulearning: 'ulearning.cn',
    '优学院': 'ulearning.cn',
    uclass: 'uclass.com.cn',
    '优课': 'uclass.com.cn',
    wust: 'wust.edu.cn',
    '武科大': 'wust.edu.cn',
    acmwust: 'acm.wust.edu.cn',
    '武科大acm': 'acm.wust.edu.cn',
    '武科大助手': 'wust.edu.cn',
    eudic: 'eudic.net',
    '欧路词典': 'eudic.net',
    baimiaoapp: 'baimiaoapp.com',
    '白描': 'baimiaoapp.com',
    doubao: 'doubao.com',
    '豆包': 'doubao.com',
    chaoxing: 'chaoxing.com',
    '超星': 'chaoxing.com',
    zhihuishu: 'zhihuishu.com',
    '智慧树': 'zhihuishu.com',
    zyh365: 'zyh365.com',
    '志愿汇': 'zyh365.com',
    saikr: 'saikr.com',
    '赛氪': 'saikr.com',
    ezviz: 'ezviz.com',
    '萤石': 'ezviz.com',
    lanzou: 'lanzou.com',
    '领航网盘': 'lanzou.com',
    ygcloud: 'yg.cloud',
    '一元机场': 'yg.cloud',
    ceair: 'ceair.com',
    '东方航空': 'ceair.com',
    '国家反诈中心': '12321.cn',
    elastic: 'elastic.co',
    fastgpt: 'fastgpt.io',
    goodnotes: 'goodnotes.com',
    soujiao: 'soujiao.com',
    '大学搜题酱': 'soujiao.com',
    quark: 'quark.cn',
    '夸克': 'quark.cn',
    xiaomi: 'mi.com',
    '小米': 'mi.com',
    hduhelp: 'hduhelp.com',
    '希冀': 'hduhelp.com',
    alipay: 'alipay.com',
    '支付宝': 'alipay.com',
    database: 'database.org',
    '数据库': 'database.org',
    localhost: 'localhost',
    '服务器': 'localhost',
    '服务器监控': 'localhost',
    vjudge: 'vjudge.net',
    '睿抗': 'vjudge.net',
    siliconflow: 'siliconflow.cn',
    '硅基流动': 'siliconflow.cn',
    shayuzhangdan: 'shayuzhangdan.com',
    '鲨鱼记账': 'shayuzhangdan.com',
    aihubmix: 'aihubmix.com',
    anythingllm: 'anythingllm.com',
    apifox: 'apifox.com',
    csdn: 'csdn.net',
    cisco: 'cisco.com',
    claudecode: 'anthropic.com',
    cloudflare: 'cloudflare.com',
    codeforces: 'codeforces.com',
    deepseek: 'deepseek.com',
    docker: 'docker.com',
    jable: 'jable.tv',
    mac: 'apple.com',
    minimax: 'minimax.chat',
    neea: 'neea.edu.cn',
    neo4j: 'neo4j.com',
    oj: 'oj.com',
    oneapi: 'oneapi.dev',
    pin: 'pinterest.com',
    pta: 'pta.pku.edu.cn',
    pornhub: 'pornhub.com',
    postman: 'postman.com',
    redis: 'redis.io',
    serpapi: 'serpapi.com',
    steam: 'steampowered.com',
    trae: 'trae.ai',
    taonga: 'taonga.com',
    tavily: 'tavily.com',
    terabox: 'terabox.com',
    usatoday: 'usatoday.com',
    unipus: 'unipus.cn',
    vmware: 'vmware.com',
    wsl: 'microsoft.com',
    wifi: 'wifi.org',
    x: 'x.com',
    xshell: 'netsarang.com',
    anger: 'github.com',
    clustrmaps: 'clustrmaps.com',
    cpolar: 'cpolar.com',
    doc2markdown: 'doc2markdown.com',
    freenote: 'freenote.com',
    ipinfo: 'ipinfo.io',
    pika: 'pika.art',
    vercel: 'vercel.com',
    huggingface: 'huggingface.co',
    modelscope: 'modelscope.cn'
  };

  function faviconUrlForDomain(domain) {
    return domain ? `https://www.google.com/s2/favicons?sz=64&domain_url=https://${domain}` : null;
  }

  function normalizeIconKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_./-]+/g, '');
  }

  function resolvedIconKey(value) {
    const key = normalizeIconKey(value);
    return iconAliases[key] || key;
  }

  function iconUrlForNode(node) {
    if (!node) return null;
    if (node.kind === 'you') return spideyAvatarUrl;
    if (node.kind !== 'provider' && node.kind !== 'platform' && node.kind !== 'account') return null;
    const key = resolvedIconKey(node.platform || node.name);
    return localPlatformIcons[key] || platformIcons[key] || faviconUrlForDomain(platformDomains[key]) || null;
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
    });

    // 多账号平台：平台与成员账号都显示（平台→账号→绑定/登录）；单账号平台折叠成一个点
    const expandedMembers = new Set();
    accountGroups.forEach((group) => {
      group.members.forEach((member) => {
        if (group.memberCount > 1) {
          expandedMembers.add(member.id);
        } else {
          accountToGroup.set(member.id, group.id);
        }
      });
    });

    const visibleRelationships = sourceRelationships.filter(isUserVisibleRelationship);
    const participatingIds = new Set();
    visibleRelationships.forEach((relationship) => {
      participatingIds.add(relationship.source);
      participatingIds.add(relationship.target);
    });

    const nodes = sourceNodes
      .filter((node) => {
        if (node.kind === 'platform' || node.kind === 'tag') return false;
        if (node.kind === 'account') return expandedMembers.has(node.id);
        if (node.kind === 'you') return true;
        return participatingIds.has(node.id);
      })
      .map((node) => ({ ...node, overviewMember: expandedMembers.has(node.id) }));
    nodes.push(...accountGroups.values());

    const nodeIds = new Set(nodes.map((node) => node.id));
    const relationshipMap = new Map();
    const pushOverviewLink = (source, target, relationType, raw) => {
      if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;
      const key = [source, target, relationType].sort().join('::');
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, {
          id: 'overview-link:' + relationshipMap.size,
          source,
          target,
          relation_type: relationType,
          label: (raw && raw.label) || relationType,
          count: 0,
          member_ids: []
        });
      }
      const aggregated = relationshipMap.get(key);
      aggregated.count += 1;
      if (raw) aggregated.member_ids.push({ source: raw.source, target: raw.target });
    };
    visibleRelationships.forEach((relationship) => {
      const source = accountToGroup.get(relationship.source) || relationship.source;
      const target = accountToGroup.get(relationship.target) || relationship.target;
      pushOverviewLink(source, target, relationship.relation_type || relationship.label || 'related_to', relationship);
    });
    // 多账号平台补 平台组→成员账号 的层级连线
    accountGroups.forEach((group) => {
      if (group.memberCount > 1) {
        group.members.forEach((member) => pushOverviewLink(group.id, member.id, 'belongs_to', null));
      }
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
          <div className="detail-card">
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
          <div className="detail-card">
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
          <div className="detail-card">
            ${panelHeading(title, node)}
            <div className="detail-list">
              <div className="detail-row">
                <span className="detail-row__key">${t('accounts')}</span>
                <span className="detail-row__value">${members.length}</span>
              </div>
            </div>
          </div>

          <div className="detail-card">
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

          <div className="detail-card">
            <div className="panel__title">${t('connections')}</div>
            ${connections.length === 0
              ? html`<div className="panel__empty">${t('noConnections')}</div>`
              : html`<div className="connection-list">
                  ${connections.map((item) => html`
                    <button key=${item.rel.id} type="button" className="connection-row" onClick=${() => onSelectNode && onSelectNode(item.other)}>
                      <span className="connection-row__label">${formatRelationLabel(locale, item.rel, item.rel.target === node.id)}</span>
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
        <div className="detail-card">
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

        <div className="detail-card">
          <div className="panel__title">${t('connections')}</div>
          ${connections.length === 0
            ? html`<div className="panel__empty">${t('noConnections')}</div>`
            : html`<div className="connection-list">
                ${connections.map((c) => html`
                  <button key=${c.rel.id} type="button" className="connection-row" onClick=${() => onSelectNode && onSelectNode(c.other)}>
                    <span className="connection-row__label">${formatRelationLabel(locale, c.rel, c.rel.target === node.id)}</span>
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
    const onClearSelection = props.onClearSelection;
    const svgRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const iconCacheRef = useRef(new Map());
    const positionCacheRef = useRef(new Map());
    const transformRef = useRef(d3.zoomIdentity);
    const selectionStateRef = useRef({ selectedNodeId: null, focusNodeId: null, highlightIds: null });
    const renderFnRef = useRef(null);
    const effectIdRef = useRef(0);

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

    // 未选中任何节点时默认点亮的核心节点: 被其它账号用来登录(login_by)的主账号 + YOU
    const defaultCoreIds = useMemo(() => {
      const core = new Set();
      const kindById = new Map(nodes.map((n) => [n.id, n.kind]));
      relationships.forEach((rel) => {
        const type = rel.relation_type || rel.label;
        if (type !== 'login_by') return;
        const targetId = typeof rel.target === 'object' ? rel.target?.id : rel.target;
        if (targetId && kindById.get(targetId) === 'account') core.add(targetId);
      });
      nodes.forEach((n) => { if (n.kind === 'you') core.add(n.id); });
      return core;
    }, [nodes, relationships]);

    const youNodeId = useMemo(() => {
      const you = nodes.find((n) => n.kind === 'you');
      return you ? you.id : null;
    }, [nodes]);

    useEffect(() => {
      selectionStateRef.current = { selectedNodeId, focusNodeId, highlightIds };
      if (renderFnRef.current) renderFnRef.current();
    }, [selectedNodeId, focusNodeId, highlightIds]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const _sel = selectionStateRef.current;
      const selectedNodeId = _sel.selectedNodeId;
      const focusNodeId = _sel.focusNodeId;
      const highlightIds = _sel.highlightIds;
      const myEffectId = ++effectIdRef.current;
      const iconCache = iconCacheRef.current;
      processed.nodes.forEach((node) => {
        const url = iconUrlForNode(node);
        if (!url || iconCache.has(url)) return;
        const image = new Image();
        iconCache.set(url, { image: image, loaded: false, failed: false });
        image.onload = () => {
          if (myEffectId !== effectIdRef.current) return;
          const entry = iconCache.get(url);
          if (entry) entry.loaded = true;
          if (renderFnRef.current) renderFnRef.current();
        };
        image.onerror = () => {
          if (myEffectId !== effectIdRef.current) return;
          const entry = iconCache.get(url);
          if (entry) entry.failed = true;
          if (renderFnRef.current) renderFnRef.current();
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

      const idOf = (x) => (x && typeof x === 'object' ? x.id : x);
      const positionCache = positionCacheRef.current;

      processed.nodes.forEach((node) => {
        const cached = positionCache.get(node.id);
        if (cached) {
          node.x = cached.x;
          node.y = cached.y;
          node.vx = cached.vx;
          node.vy = cached.vy;
        }
      });

      const simulation = d3.forceSimulation(processed.nodes)
        .force('link', d3.forceLink(processed.links).id((d) => d.id).distance(layoutMode === 'layered' ? 180 : 120))
        .force('charge', d3.forceManyBody().strength(layoutMode === 'layered' ? -280 : -230))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius((d) => (d.kind === 'account' ? 26 : d.kind === 'you' ? 34 : 22)));

      const rootNode = processed.nodes.find((node) => node.kind === 'you');
      const shouldPinRoot = rootNode && !positionCache.has(rootNode.id);
      if (shouldPinRoot) {
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
        transformRef.current = event.transform;
        // render 在本 effect 下方才用 const 声明; 恢复 transform 时会同步触发本回调,
        // 经 renderFnRef 间接调用以避免 "Cannot access 'render' before initialization"
        if (renderFnRef.current) renderFnRef.current();
      });
      let transform = transformRef.current || d3.zoomIdentity;
      d3.select(canvas).call(zoom);
      if (transformRef.current && (transformRef.current.x || transformRef.current.y || transformRef.current.k !== 1)) {
        d3.select(canvas).call(zoom.transform, transformRef.current);
      }

      const linked = new Map();
      processed.links.forEach((link) => {
        const key = [link.source, link.target].sort().join('::');
        linked.set(key, link);
      });

      const render = () => {
        const _rs = selectionStateRef.current;
        const selectedNodeId = _rs.selectedNodeId;
        const highlightIds = _rs.highlightIds;
        const hasSelection = selectedNodeId != null;
        const activeNodeIds = hasSelection ? new Set([selectedNodeId, ...(highlightIds ? [...highlightIds] : [])]) : null;
        const isActiveNode = (d) => !hasSelection
          ? defaultCoreIds.has(d.id)
          : (activeNodeIds && activeNodeIds.has(d.id));
        const isActiveLink = (d) => {
          if (hasSelection) {
            return idOf(d.source) === selectedNodeId || idOf(d.target) === selectedNodeId;
          }
          const fromYou = idOf(d.source) === youNodeId;
          const toYou = idOf(d.target) === youNodeId;
          return (fromYou && defaultCoreIds.has(idOf(d.target)))
            || (toYou && defaultCoreIds.has(idOf(d.source)));
        };
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(5, 11, 20, 0.68)';
        ctx.fillRect(0, 0, width, height);

        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        processed.links.forEach((link) => {
          const sx = link.source?.x;
          const sy = link.source?.y;
          const tx = link.target?.x;
          const ty = link.target?.y;
          if (sx == null || sy == null || tx == null || ty == null) return;
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
            ? '#050608'
            : node.kind === 'account'
              ? 'rgba(248, 250, 252, 0.85)'
              : '#0f172a';
          const stroke = node.kind === 'provider'
            ? '#96e0f7'
            : node.kind === 'identifier'
              ? '#c792ea'
              : node.kind === 'you'
                ? '#ff5c55'
              : node.kind === 'account'
                ? '#96e0f7'
                : '#0a1630';
          const x = node.x;
          const y = node.y;
          if (x == null || y == null) return;

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
            const size = node.kind === 'you' ? r * 1.28 : r * 1.18;
            ctx.drawImage(icon.image, x - size / 2, y - size / 2, size, size);
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

          const shouldLabel = hasSelection
            ? (node.kind === 'you'
              || node.kind === 'provider'
              || node.kind === 'identifier'
              || node.overviewMember
              || node.id === selectedNodeId
              || (activeNodeIds?.has(node.id) && !node.synthetic))
            : (node.kind === 'you' || defaultCoreIds.has(node.id));
          if (shouldLabel) {
            const preferReadableName = !hasSelection && defaultCoreIds.has(node.id);
            const baseLabel = node.kind === 'account'
              ? (preferReadableName
                ? (node.name || node.display_name || node.username || node.id)
                : (node.username || node.name || node.id))
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
            ctx.fillStyle = node.kind === 'you' ? '#ff5c55' : '#96e0f7';
            ctx.textAlign = 'left';
            ctx.fillText(node.kind.toUpperCase(), node.x + 20, node.y - 20);
            ctx.restore();
          }
        }

        ctx.restore();
      };

      const ticked = () => {
        processed.nodes.forEach((node) => {
          positionCache.set(node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
        });
        render();
      };
      simulation.on('tick', ticked);
      renderFnRef.current = render;
      render();

      let dragNode = null;
      let downClientX = 0;
      let downClientY = 0;
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
        downClientX = event.clientX;
        downClientY = event.clientY;
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
        const moved = Math.hypot(event.clientX - downClientX, event.clientY - downClientY);
        if (moved > 5) return;
        const rect = canvas.getBoundingClientRect();
        const node = findNode(event.clientX - rect.left, event.clientY - rect.top);
        if (node) {
          onSelectNode(node);
          return;
        }
        const [px, py] = transform.invert([event.clientX - rect.left, event.clientY - rect.top]);
        let picked = null;
        processed.links.forEach((link) => {
          if (link.source?.x == null || link.target?.x == null) return;
          const mx = (link.source.x + link.target.x) / 2;
          const my = (link.source.y + link.target.y) / 2;
          const dx = px - mx;
          const dy = py - my;
          if (Math.sqrt(dx * dx + dy * dy) < 20) {
            picked = link;
          }
        });
        if (picked) {
          onSelectRelationship(picked);
        } else if (onClearSelection) {
          onClearSelection();
        }
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
        if (shouldPinRoot) {
          rootNode.fx = nextWidth / 2;
          rootNode.fy = nextHeight / 2;
        }
        processed.nodes.forEach((node) => {
          positionCache.set(node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
        });
        simulation.alpha(0.35).restart();
      });
      resizeObserver.observe(container);

      return () => {
        simulation.stop();
        renderFnRef.current = null;
        resizeObserver.disconnect();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerUp);
        canvas.removeEventListener('click', onClick);
      };
    }, [processed, layoutMode, onSelectNode, onSelectRelationship, onClearSelection]);

    return html`
      <div ref=${containerRef} className="graph-canvas-wrap">
        <canvas ref=${canvasRef} className="graph-canvas"></canvas>
      </div>
    `;
  }

  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error: error };
    }
    componentDidCatch(error, info) {
      try { console.error('[IdentityGraph] render error:', error, info); } catch (e) {}
    }
    render() {
      if (this.state.error) {
        const message = (this.state.error && this.state.error.message) || String(this.state.error);
        return html`
          <div style=${{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(3,8,16,0.92)', color: '#d7ecff', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div style=${{ maxWidth: 480, width: '100%', background: '#0f172a', border: '1px solid #23324a', borderRadius: 12, padding: '28px', textAlign: 'center', boxShadow: '0 18px 60px rgba(0,0,0,0.5)' }}>
              <div style=${{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>图谱渲染出现异常</div>
              <pre style=${{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: '#fda4a4', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 12, margin: '0 0 18px', textAlign: 'left' }}>${message}</pre>
              <button type="button" onClick=${() => window.location.reload()} style=${{ cursor: 'pointer', padding: '9px 22px', borderRadius: 8, border: '1px solid #96e0f7', background: 'rgba(150,224,247,0.12)', color: '#d7ecff', fontWeight: 700 }}>重新加载图谱</button>
            </div>
          </div>`;
      }
      return this.props.children;
    }
  }

  function App() {
    const [locale, setLocale] = useState('zh');
    const [query, setQuery] = useState('');
    const [layoutMode, setLayoutMode] = useState('spider');
    const [displayMode, setDisplayMode] = useState('full');
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
    const loadRetryRef = useRef(null);
    const neighborReqRef = useRef(0);
    const t = createT(locale);

    const clearLoadRetry = useCallback(() => {
      if (loadRetryRef.current) {
        window.clearTimeout(loadRetryRef.current);
        loadRetryRef.current = null;
      }
    }, []);

    const loadGraph = async (attempt = 1) => {
      clearLoadRetry();
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
        if (attempt < 10) {
          setDataState('loading');
          loadRetryRef.current = window.setTimeout(() => {
            loadGraph(attempt + 1);
          }, 1500);
          return;
        }
        setGraph({ nodes: [], relationships: [] });
        setDataState('error');
      }
    };

    useEffect(() => {
      loadGraph();
      return () => {
        clearLoadRetry();
      };
    }, []);

    const displayGraph = useMemo(() => graph, [graph]);

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
      displayGraph.nodes.filter((node) => node.synthetic && node.memberCount === 1).forEach((group) => {
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
      clearLoadRetry();
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

    const handleSelectNode = useCallback(async (node) => {
      if (!node) return;
      clearLoadRetry();
      if (!node.synthetic) {
        setGraph((prev) => {
          const exists = prev.nodes.some((n) => n.id === node.id);
          if (exists) return prev;
          return { ...prev, nodes: dedupeById([...prev.nodes, node]) };
        });
      }
      setSelectedNode(node);
      setSelectedRelationship(null);
      setNeighbors(null);
      setIsDetailsOpen(true);
      if (node.synthetic) return;
      const reqId = ++neighborReqRef.current;
      try {
        const data = await getNeighbors(node.id, 1);
        if (reqId !== neighborReqRef.current) return;
        setNeighbors(data);
      } catch {
        if (reqId === neighborReqRef.current) setNeighbors(null);
      }
    }, [clearLoadRetry]);

    const handleSelectMember = useCallback(async (node) => {
      setDisplayMode('full');
      await handleSelectNode(node);
    }, [handleSelectNode]);

    const handleSelectRelationship = useCallback((relationship) => {
      neighborReqRef.current++;
      setSelectedRelationship(relationship);
      setSelectedNode(null);
      setNeighbors(null);
      setIsDetailsOpen(true);
    }, []);

    const handleClearSelection = useCallback(() => {
      neighborReqRef.current++;
      setSelectedNode(null);
      setSelectedRelationship(null);
      setNeighbors(null);
      setIsDetailsOpen(false);
    }, []);

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
                    focusNodeId=${null}
                    highlightIds=${graphHighlightIds}
                    onSelectNode=${handleSelectNode}
                    onSelectRelationship=${handleSelectRelationship}
                    onClearSelection=${handleClearSelection}
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

  ReactDOM.createRoot(document.getElementById('root')).render(html`<${ErrorBoundary}><${App} /><//>`);
})();
