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

function textIcon(bgColor, text, fontSize) {
  const fs = fontSize || (text.length > 3 ? 28 : text.length > 2 ? 34 : 44);
  const y = fs > 40 ? 80 : fs > 30 ? 76 : 72;
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${bgColor}"/><text x="64" y="${y}" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="${fs}" font-weight="700" fill="#ffffff">${text}</text></svg>`);
}

const localPlatformIcons = {
  qq: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#12b7f5"/><circle cx="46" cy="52" r="14" fill="#ffffff"/><circle cx="82" cy="52" r="14" fill="#ffffff"/><ellipse cx="64" cy="79" rx="30" ry="12" fill="#ffffff"/><path d="M39 66c4-18 14-28 25-28s21 10 25 28" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>'),
  tencentqq: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#12b7f5"/><circle cx="46" cy="52" r="14" fill="#ffffff"/><circle cx="82" cy="52" r="14" fill="#ffffff"/><ellipse cx="64" cy="79" rx="30" ry="12" fill="#ffffff"/><path d="M39 66c4-18 14-28 25-28s21 10 25 28" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>'),
  outlook: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0f6cbd"/><rect x="22" y="30" width="84" height="68" rx="12" fill="#ffffff"/><path d="M28 42l36 24 36-24" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 86l28-20 8 6 36-26" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="48" r="16" fill="#0f6cbd"/><text x="92" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">O</text></svg>'),
  microsoftoutlook: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0f6cbd"/><rect x="22" y="30" width="84" height="68" rx="12" fill="#ffffff"/><path d="M28 42l36 24 36-24" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 86l28-20 8 6 36-26" fill="none" stroke="#0f6cbd" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="48" r="16" fill="#0f6cbd"/><text x="92" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff">O</text></svg>'),
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

const platformIcons = {
  google: 'https://cdn.simpleicons.org/google/ffffff',
  '谷歌': 'https://cdn.simpleicons.org/google/ffffff',
  github: 'https://cdn.simpleicons.org/github/ffffff',
  apple: 'https://cdn.simpleicons.org/apple/ffffff',
  microsoft: 'https://cdn.simpleicons.org/microsoft/ffffff',
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
  csdn: 'https://cdn.simpleicons.org/csdn/ffffff',
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
  huggingface: 'huggingface.co',
  modelscope: 'modelscope.cn',
  doubao: 'doubao.com',
  '豆包': 'doubao.com',
  '湖北文旅': 'hubei.gov.cn',
  '白描': 'baimiaoapp.com',
  baimiao: 'baimiaoapp.com',
  '智慧团建': 'zhtj.youth.cn',
  '欧路词典': 'eudic.net',
  eudic: 'eudic.net',
  '武科大助手': 'wust.edu.cn',
  '武科大acm': 'wust.edu.cn',
  '四级': 'neea.edu.cn',
  '刘阳下载器': 'lyzyy.love',
  liuyang: 'lyzyy.love'
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
  return localPlatformIcons[key] || platformIcons[key] || faviconUrlForDomain(platformDomains[key]) || null;
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
  const positionCacheRef = useRef(new Map());
  const transformRef = useRef(d3.zoomIdentity);
  const nodeLayerRef = useRef(null);
  const linkLayerRef = useRef(null);

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

    const zoom = d3.zoom().scaleExtent([0.2, 2.5]).on('zoom', (event) => {
        root.attr('transform', event.transform);
        transformRef.current = event.transform;
      });
    svg.call(zoom);
    if (transformRef.current && (transformRef.current.x || transformRef.current.y || transformRef.current.k !== 1)) {
      svg.call(zoom.transform, transformRef.current);
    }

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

    nodeLayerRef.current = node;
    linkLayerRef.current = link;

    const label = root.append('g').attr('class', 'labels');

    simulation.on('tick', () => {
      processed.nodes.forEach((node) => {
        positionCache.set(node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
      });

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
  }, [processed, layoutMode, onSelectNode, onSelectRelationship]);

  useEffect(() => {
    const node = nodeLayerRef.current;
    const link = linkLayerRef.current;
    if (!node || !link) return;

    const focused = focusNodeId != null;
    const idOf = (x) => (x && typeof x === 'object' ? x.id : x);
    const isActiveNode = (d) => !focused || d.id === focusNodeId || (highlightIds && highlightIds.has(d.id));
    const isActiveLink = (d) => !focused || idOf(d.source) === focusNodeId || idOf(d.target) === focusNodeId;

    node.attr('opacity', (d) => (isActiveNode(d) ? 1 : 0.22));
    node.select('circle')
      .attr('stroke', (d) => (d.id === selectedNodeId ? '#ffffff' : '#0a1630'))
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : 2));
    link.attr('stroke-opacity', (d) => (isActiveLink(d) ? 0.7 : 0.08));
  }, [selectedNodeId, focusNodeId, highlightIds]);

  return <svg ref={svgRef} className="graph-canvas" />;
}
