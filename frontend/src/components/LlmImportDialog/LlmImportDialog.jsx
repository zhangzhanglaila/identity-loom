import React, { useEffect, useState } from 'react';
import { applyLlmChanges, extractWithLlm, getLlmStatus } from '../../api/client';

const REL_TYPES = ['owns', 'belongs_to', 'binds', 'verifies', 'login_by'];
const NODE_KINDS = ['account', 'provider', 'identifier', 'you'];

export function LlmImportDialog({ open, onClose, onApplied }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [nodeChecks, setNodeChecks] = useState({});
  const [nodeEdits, setNodeEdits] = useState({});
  const [relChecks, setRelChecks] = useState({});
  const [relEdits, setRelEdits] = useState({});

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError('');
    getLlmStatus()
      .then(setStatus)
      .catch((e) => setError(`无法获取 LLM 状态：${e.message}`));
  }, [open]);

  if (!open) return null;

  const runExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await extractWithLlm(text.trim());
      setResult(data);
      const nc = {};
      data.nodes.forEach((n, i) => { nc[i] = n.align_status === 'new'; });
      setNodeChecks(nc);
      const rc = {};
      data.relationships.forEach((r, i) => { rc[i] = r.status !== 'duplicate'; });
      setRelChecks(rc);
      setNodeEdits({});
      setRelEdits({});
    } catch (e) {
      setError(`抽取失败：${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmApply = async () => {
    if (!result) return;
    const nodes = result.nodes
      .map((n, i) => ({ n, i }))
      .filter(({ i }) => nodeChecks[i])
      .map(({ n, i }) => ({ ...n, ...(nodeEdits[i] || {}) }));
    const rels = result.relationships
      .map((r, i) => ({ r, i }))
      .filter(({ i }) => relChecks[i])
      .map(({ r, i }) => ({ ...r, ...(relEdits[i] || {}) }));
    if (!nodes.length && !rels.length) return;
    setApplying(true);
    setError('');
    try {
      const applied = await applyLlmChanges({ nodes, relationships: rels });
      setResult(null);
      setText('');
      await onApplied(applied);
      onClose();
    } catch (e) {
      setError(`写入失败：${e.message}`);
    } finally {
      setApplying(false);
    }
  };

  const checkedCount =
    (result ? result.nodes.filter((_, i) => nodeChecks[i]).length : 0) +
    (result ? result.relationships.filter((_, i) => relChecks[i]).length : 0);

  const edit = (setter, key, field, value) =>
    setter((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

  return (
    <div className="modal-backdrop">
      <div className="modal modal--wide">
        <div className="panel__title">LLM 自然语言导入</div>
        <div className="llm-status">
          {status && (
            status.available
              ? <span className="llm-status__badge llm-status__badge--ok">本地模型可用 · {status.model}</span>
              : <span className="llm-status__badge llm-status__badge--warn">本地模型未运行，将使用规则解析（精度较低，请重点核对）</span>
          )}
          {result && (
            <span className="llm-status__badge">
              {result.source === 'llm' ? `抽取引擎：${result.model}` : '抽取引擎：规则兜底'}
            </span>
          )}
        </div>

        <textarea
          className="modal__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'用自然语言描述，例如：\n"我的谷歌账号绑定了 QQ 邮箱和 180 主号"\n"Telegram 用 150 这个号登录"\n"outlook 邮箱是 zhang@outlook.com"'}
        />
        <div className="modal__actions">
          <button className="toolbar__button" onClick={onClose}>Close</button>
          <button className="toolbar__button" onClick={runExtract} disabled={loading || !text.trim()}>
            {loading ? '抽取中…' : '抽取候选'}
          </button>
        </div>

        {error && <div className="llm-warning">{error}</div>}

        {result && result.warnings.length > 0 && (
          <div className="llm-warning">
            {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
          </div>
        )}

        {result && (
          <div className="llm-confirm">
            <div className="llm-section-title">候选节点（勾选 = 写入，未勾选的已有节点不会改动）</div>
            {result.nodes.length === 0 && <div className="llm-empty">未识别到实体</div>}
            <div className="llm-list">
              {result.nodes.map((node, i) => {
                const kindValue = nodeEdits[i]?.kind ?? node.kind;
                return (
                <div className={`llm-item ${nodeChecks[i] ? 'is-checked' : ''}`} key={i}>
                  <label className="llm-check">
                    <input
                      type="checkbox"
                      checked={!!nodeChecks[i]}
                      onChange={(e) => setNodeChecks((prev) => ({ ...prev, [i]: e.target.checked }))}
                    />
                    <span className={`llm-badge llm-badge--${node.align_status}`}>
                      {node.align_status === 'new' ? '新节点' : '已有'}
                    </span>
                  </label>
                  <div className="llm-item__body">
                    <>
                    <div className="llm-item__row">
                      {node.align_status === 'new' ? (
                        <>
                          <input
                            className="llm-edit llm-edit--id"
                            value={(nodeEdits[i]?.id) ?? node.id}
                            onChange={(e) => edit(setNodeEdits, i, 'id', e.target.value)}
                            title="节点 id"
                          />
                          <input
                            className="llm-edit"
                            value={(nodeEdits[i]?.name) ?? node.name}
                            onChange={(e) => edit(setNodeEdits, i, 'name', e.target.value)}
                            title="节点名称"
                          />
                          <select
                            className="llm-edit llm-edit--select"
                            value={kindValue}
                            onChange={(e) => edit(setNodeEdits, i, 'kind', e.target.value)}
                            title="节点类型"
                          >
                            {NODE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </>
                      ) : (
                        <>
                          <span className="llm-item__name">{node.name} <em>{node.id}</em></span>
                          <span className="llm-item__meta">kind: {node.kind}</span>
                        </>
                      )}
                    </div>
                    {node.align_status === 'new' && kindValue === 'identifier' && (
                      <div className="llm-item__row">
                        <input
                          className="llm-edit llm-edit--id"
                          value={(nodeEdits[i]?.phone) ?? node.phone ?? ''}
                          onChange={(e) => edit(setNodeEdits, i, 'phone', e.target.value)}
                          placeholder="手机号"
                        />
                        <input
                          className="llm-edit llm-edit--id"
                          value={(nodeEdits[i]?.email) ?? node.email ?? ''}
                          onChange={(e) => edit(setNodeEdits, i, 'email', e.target.value)}
                          placeholder="邮箱"
                        />
                      </div>
                    )}
                    {node.align_status === 'new' && (kindValue === 'provider' || kindValue === 'account') && (
                      <div className="llm-item__row">
                        <input
                          className="llm-edit llm-edit--id"
                          value={(nodeEdits[i]?.platform) ?? node.platform ?? ''}
                          onChange={(e) => edit(setNodeEdits, i, 'platform', e.target.value)}
                          placeholder="平台"
                        />
                      </div>
                    )}
                    </>
                    <div className="llm-item__note">
                      置信 {Math.round((node.confidence ?? 0) * 100)}% · {node.reason}
                      {node.align_status === 'existing' && node.matched_node_id ? ` · 对齐到 ${node.matched_node_id}` : ''}
                      {node.mentions?.length > 1 ? ` · 原文：${node.mentions.join(' / ')}` : ''}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="llm-section-title">候选关系（勾选 = 写入，已存在的关系默认不勾）</div>
            {result.relationships.length === 0 && <div className="llm-empty">未识别到关系</div>}
            <div className="llm-list">
              {result.relationships.map((rel, i) => (
                <div className={`llm-item ${relChecks[i] ? 'is-checked' : ''}`} key={i}>
                  <label className="llm-check">
                    <input
                      type="checkbox"
                      checked={!!relChecks[i]}
                      onChange={(e) => setRelChecks((prev) => ({ ...prev, [i]: e.target.checked }))}
                    />
                    <span className={`llm-badge llm-badge--${rel.status === 'duplicate' ? 'dup' : 'new'}`}>
                      {rel.status === 'duplicate' ? '已存在' : '新增'}
                    </span>
                  </label>
                  <div className="llm-item__body">
                    <div className="llm-item__row">
                      <select
                        className="llm-edit llm-edit--select"
                        value={(relEdits[i]?.source) ?? rel.source}
                        onChange={(e) => edit(setRelEdits, i, 'source', e.target.value)}
                      >
                        {result.nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
                      </select>
                      <span className="llm-item__arrow">→</span>
                      <select
                        className="llm-edit llm-edit--select"
                        value={(relEdits[i]?.relation_type) ?? rel.relation_type}
                        onChange={(e) => edit(setRelEdits, i, 'relation_type', e.target.value)}
                      >
                        {REL_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                      </select>
                      <span className="llm-item__arrow">→</span>
                      <select
                        className="llm-edit llm-edit--select"
                        value={(relEdits[i]?.target) ?? rel.target}
                        onChange={(e) => edit(setRelEdits, i, 'target', e.target.value)}
                      >
                        {result.nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
                      </select>
                      <span className="llm-item__meta">置信 {Math.round((rel.confidence ?? 0) * 100)}%</span>
                    </div>
                    {rel.note && <div className="llm-item__note">{rel.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="modal__actions">
            <span className="llm-count">已勾选 {checkedCount} 项</span>
            <button
              className="toolbar__button"
              onClick={confirmApply}
              disabled={applying || checkedCount === 0}
            >
              {applying ? '写入中…' : '确认写入图谱'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
