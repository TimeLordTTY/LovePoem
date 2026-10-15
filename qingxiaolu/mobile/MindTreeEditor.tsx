import { useEffect, useMemo, useRef, useState } from 'react';
import { addMindNode, branchIds, childrenOf, layoutMindTree, moveMindNode, newMindTree, parseMindTreeFile, MIND_TREE_FILE_BYTES,
  removeMindBranch, validateMindTrees, type MindNode, type MindRef, type MindTree } from './mindTree';
import { exportTextFile } from './fileExport';
import './mindTree.css';

export type MindTarget = { key: string; label: string; ref: MindRef; open: () => Promise<void> | void };
type View = { treeId: string; nodeId: string };
export default function MindTreeEditor({ projectId, trees, targets, onChange, checkpoint, view, onView, onBusy, backAction }: {
  projectId: string; trees: MindTree[]; targets: MindTarget[]; onChange: (trees: MindTree[]) => void;
  checkpoint: () => Promise<boolean>; view: View; onView: (value: View) => void; onBusy: (busy: boolean) => void;
  backAction: { current: (() => boolean) | null };
}) {
  const [message, setMessage] = useState(''); const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [camera, setCamera] = useState({ x: 20, y: 20, scale: 1 });
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [fullscreen, setFullscreen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [targetKey, setTargetKey] = useState(''); const [parentId, setParentId] = useState('');
  const [, redraw] = useState(0); const current = useRef(trees); current.current = trees;
  const lastOwn = useRef(JSON.stringify(trees)); const group = useRef('');
  const history = useRef<{ past: MindTree[][]; future: MindTree[][] }>({ past: [], future: [] });
  const fileInput = useRef<HTMLInputElement>(null); const viewport = useRef<HTMLDivElement>(null);
  const pointer = useRef(new Map<number, { x: number; y: number; onNode: boolean }>());
  const gesture = useRef<{ camera: typeof camera; center: { x: number; y: number }; distance: number } | null>(null);
  const dragging = useRef<string | null>(null);
  const [pendingFile, setPendingFile] = useState<MindTree | null>(null);
  useEffect(() => {
    const signature = JSON.stringify(trees);
    if (signature !== lastOwn.current) { history.current = { past: [], future: [] }; group.current = ''; setMessage('已读取外部资料；旧的导图撤销记录已清空。'); }
    lastOwn.current = signature;
  }, [trees]);
  let error = ''; try { validateMindTrees(trees); } catch (failure) { error = (failure as Error).message; }
  const tree = !error ? trees.find(item => item.id === view.treeId) || trees[0] : undefined;
  const node = tree?.nodes.find(item => item.id === view.nodeId) || tree?.nodes.find(item => item.id === tree.rootNodeId);
  const points = useMemo(() => tree ? layoutMindTree(tree) : [], [tree]);
  const targetFor = (ref?: MindRef) => ref && targets.find(target => target.ref.kind === ref.kind &&
    (ref.kind === 'projectSection' ? (target.ref as { section: string }).section === ref.section : (target.ref as { id: string }).id === ref.id));
  const label = (item: MindNode) => item.text || (item.ref ? targetFor(item.ref)?.label || '引用已失效' : '未命名想法');
  const matchIds = tree && query.trim() ? tree.nodes.filter(item => `${label(item)} ${item.note}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(item => item.id) : [];
  const [matchIndex, setMatchIndex] = useState(0);
  const pointMap = new Map(points.map(point => [point.node.id, point]));
  const forbiddenParents = tree && node ? branchIds(tree, node.id) : new Set<string>();
  useEffect(() => {
    if (!viewport.current || !node) return;
    const point = points.find(item => item.node.id === node.id);
    if (point) setCamera({ scale: 1, x: viewport.current.clientWidth / 2 - point.x - 100, y: viewport.current.clientHeight / 2 - point.y - 34 });
  }, [tree?.id, mode]);
  useEffect(() => {
    backAction.current = () => { if (!fullscreen) return false; setFullscreen(false); return true; };
    return () => { backAction.current = null; };
  }, [fullscreen, backAction]);
  useEffect(() => {
    if (!fullscreen) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setFullscreen(false); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [fullscreen]);
  useEffect(() => {
    const element = viewport.current; if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) { const box = element.getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.1 : .9, event.clientX - box.left, event.clientY - box.top); }
      else setCamera(old => ({ ...old, x: old.x - event.deltaX, y: old.y - event.deltaY }));
    };
    element.addEventListener('wheel', wheel, { passive: false }); return () => element.removeEventListener('wheel', wheel);
  }, [tree?.id, mode]);

  function commit(next: MindTree[], grouping = '') {
    if (busyRef.current) return;
    try { validateMindTrees(next); } catch (failure) { setMessage((failure as Error).message); return; }
    const before = current.current; if (JSON.stringify(before) === JSON.stringify(next)) return;
    if (!grouping || group.current !== grouping) {
      history.current.past.push(before);
      // 为连续输入合并撤销步骤，且给操作历史设置明确内存上限。
      while (history.current.past.length > 30 || (history.current.past.length > 1 && JSON.stringify(history.current.past).length > 8_000_000)) history.current.past.shift();
    }
    history.current.future = []; group.current = grouping;
    current.current = next; lastOwn.current = JSON.stringify(next); onChange(next); redraw(value => value + 1);
  }
  function updateTree(next: MindTree, grouping = '') { commit(current.current.map(item => item.id === next.id ? next : item), grouping); }
  function updateNode(change: Partial<MindNode>, grouping = '') {
    const latestTree = current.current.find(item => item.id === tree?.id); if (!latestTree || !node) return;
    updateTree({ ...latestTree, nodes: latestTree.nodes.map(item => item.id === node.id ? { ...item, ...change } : item) }, grouping);
  }
  function select(treeId: string, nodeId: string) { group.current = ''; onView({ treeId, nodeId }); setParentId(''); setTargetKey(''); }
  function createTree() {
    if (current.current.length >= 100) return setMessage('每个项目最多 100 张树，请先整理或导出。');
    const next = newMindTree(); commit([...current.current, next]); select(next.id, next.rootNodeId); setCamera({ x: 20, y: 20, scale: 1 });
  }
  function add(sibling = false) {
    const latestTree = current.current.find(item => item.id === tree?.id); if (!latestTree || !node) return;
    try { const next = addMindNode(latestTree, sibling ? node.parentId || node.id : node.id); updateTree(next); const added = next.nodes[next.nodes.length - 1]; select(next.id, added.id);
      const point = layoutMindTree(next).find(item => item.node.id === added.id);
      if (point && viewport.current) setCamera({ scale: 1, x: viewport.current.clientWidth / 2 - point.x - 100, y: viewport.current.clientHeight / 2 - point.y - 34 }); }
    catch (failure) { setMessage((failure as Error).message); }
  }
  function undo(redo = false) {
    if (busyRef.current) return;
    const from = redo ? history.current.future : history.current.past; const next = from.pop(); if (!next) return;
    (redo ? history.current.past : history.current.future).push(current.current);
    group.current = ''; current.current = next; lastOwn.current = JSON.stringify(next); onChange(next); redraw(value => value + 1);
    setMessage(redo ? '已重做导图操作，原资料不受影响。' : '已撤销导图操作，原资料不受影响。');
  }
  async function withBusy(action: () => Promise<void>, lockNavigation = true) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); if (lockNavigation) onBusy(true);
    try { await action(); } catch (failure) { setMessage((failure as Error).message || '操作失败，当前导图仍保留。'); }
    finally { busyRef.current = false; setBusy(false); if (lockNavigation) onBusy(false); }
  }
  async function remove(whole = false) {
    if (!tree || !node) return;
    const count = whole ? tree.nodes.length : branchIds(tree, node.id).size;
    if (!window.confirm(`删除${whole ? `整张“${tree.title}”思维树` : `“${label(node)}”及其分支`}（共 ${count} 个节点）？原文章和资料不会删除，可撤销或从项目版本恢复。`)) return;
    const before = JSON.stringify(current.current);
    let next: MindTree[] | undefined;
    await withBusy(async () => {
      if (!await checkpoint()) throw new Error('恢复版本未能保存，尚未删除。请保留当前内容后重试。');
      if (JSON.stringify(current.current) !== before) throw new Error('资料已更新，尚未删除，请检查后重新操作。');
      next = whole ? current.current.filter(item => item.id !== tree.id) : current.current.map(item => item.id === tree.id ? removeMindBranch(item, node.id) : item);
    });
    if (next) { commit(next); if (!whole) select(tree.id, node.parentId || tree.rootNodeId); setMessage('已删除；可撤销，也可从项目资料版本恢复。'); }
  }
  function move(id: string, destination: string, index?: number) {
    const latestTree = current.current.find(item => item.id === tree?.id); if (!latestTree) return;
    try { updateTree(moveMindNode(latestTree, id, destination, index)); setMessage('已移动分支，原资料保持不变。'); }
    catch (failure) { setMessage((failure as Error).message); }
  }
  function reorder(offset: number) {
    if (!tree || !node?.parentId) return;
    const siblings = childrenOf(tree, node.parentId); const index = siblings.findIndex(item => item.id === node.id);
    if (index + offset >= 0 && index + offset < siblings.length) move(node.id, node.parentId, index + offset);
  }
  function focusNode(id: string) {
    if (!tree) return;
    const ancestors = new Set<string>(); const byId = new Map(tree.nodes.map(item => [item.id, item]));
    let next = byId.get(id)?.parentId; while (next) { ancestors.add(next); next = byId.get(next)?.parentId; }
    const expanded = { ...tree, nodes: tree.nodes.map(item => ancestors.has(item.id) ? { ...item, collapsed: false } : item) };
    if (expanded.nodes.some((item, index) => item.collapsed !== tree.nodes[index].collapsed)) updateTree(expanded);
    const point = layoutMindTree(expanded).find(item => item.node.id === id); select(tree.id, id);
    if (point && viewport.current) setCamera({ scale: 1, x: viewport.current.clientWidth / 2 - point.x - 100, y: viewport.current.clientHeight / 2 - point.y - 34 });
  }
  function fit() {
    if (!points.length || !viewport.current) return;
    const width = Math.max(...points.map(item => item.x)) + 250; const height = Math.max(...points.map(item => item.y)) + 110;
    const scale = Math.max(.001, Math.min(1.4, (viewport.current.clientWidth - 32) / width, (viewport.current.clientHeight - 32) / height));
    setCamera({ scale, x: (viewport.current.clientWidth - width * scale) / 2, y: (viewport.current.clientHeight - height * scale) / 2 });
  }
  function zoom(factor: number, x?: number, y?: number) {
    const centerX = x ?? (viewport.current?.clientWidth || 400) / 2, centerY = y ?? (viewport.current?.clientHeight || 400) / 2;
    setCamera(old => { const scale = Math.max(.001, Math.min(2.5, old.scale * factor)); const ratio = scale / old.scale;
      return { scale, x: centerX - (centerX - old.x) * ratio, y: centerY - (centerY - old.y) * ratio }; });
  }
  function resetGesture() {
    const values = [...pointer.current.values()];
    if (!values.length) { gesture.current = null; return; }
    const center = values.length > 1 ? { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 } : values[0];
    gesture.current = { camera, center, distance: values.length > 1 ? Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y) : 0 };
  }
  async function readFile(file?: File) {
    if (!file) return;
    await withBusy(async () => { if (file.size > MIND_TREE_FILE_BYTES) throw new Error('导图文件超过 32MB，请拆分后导入');
      setPendingFile(parseMindTreeFile(await file.text(), projectId)); setMessage('已读取预览，确认前不会写入；跨项目引用需重新关联。'); });
  }

  return <div className="mind-editor">
    <header className="mind-heading"><div><small>把想法慢慢展开</small><h1>思维树</h1><p>整理分支，连接已有作品与资料。</p></div>
      <button disabled={busy || !!error} onClick={createTree}>＋ 新建思维树</button></header>
    <div className="mind-message" role="status">{message || '随项目自动保存到本机；上传沿用项目的同步选择。'}</div>
    {error ? <p role="alert">{error} 请先使用项目完整备份保留当前资料。</p> : <>
      <fieldset disabled={busy} className="mind-controls"><legend className="mind-sr">导图操作</legend>
        <label>当前思维树<select aria-label="当前思维树" value={tree?.id || ''} onChange={event => { const next = trees.find(item => item.id === event.target.value)!; select(next.id, next.rootNodeId); setCamera({ x: 20, y: 20, scale: 1 }); }}>
          {!tree && <option value="">尚未创建</option>}{trees.map(item => <option key={item.id} value={item.id}>{item.title || '未命名思维树'}</option>)}</select></label>
        <button disabled={!history.current.past.length} onClick={() => undo()}>撤销</button><button disabled={!history.current.future.length} onClick={() => undo(true)}>重做</button>
        <button onClick={() => fileInput.current?.click()}>导入导图 JSON</button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={event => { void readFile(event.target.files?.[0]); event.target.value = ''; }} />
        <button disabled={!tree} onClick={() => void withBusy(async () => { const saved = await exportTextFile(`${(tree!.title || '思维树').replace(/[\\/:*?"<>|]/g, '_')}.json`,
          JSON.stringify({ format: 'qingxiaolu-mind-tree', version: 1, projectId, tree }, null, 2), 'application/json'); setMessage(saved ? '导图文件已交给系统保存。' : '已取消保存，导图仍在本机。'); })}>导出导图 JSON</button>
      </fieldset>
      {pendingFile && <aside className="mind-import" aria-label="导图导入预览"><b>导入预览：{pendingFile.title}</b><p>{pendingFile.nodes.length} 个节点，将作为一张新树添加，不覆盖已有内容。跨项目文件已解除原资料关联。</p>
        <button disabled={busy} onClick={() => { commit([...current.current, pendingFile]); select(pendingFile.id, pendingFile.rootNodeId); setPendingFile(null); }}>确认添加导图</button>
        <button disabled={busy} onClick={() => setPendingFile(null)}>取消导入</button></aside>}
      {!tree ? <div className="mind-empty"><span aria-hidden="true">○ ─ ○</span><h2>从一个想法开始</h2><p>自由记录，或把人物、章节与灵感连在一起。</p><button onClick={createTree}>创建第一张思维树</button></div> : <>
        <fieldset disabled={busy} className="mind-tree-title"><legend className="mind-sr">思维树名称</legend><label>树名称<input maxLength={500} aria-label="思维树名称" value={tree.title} onBlur={() => { group.current = ''; }} onChange={event => updateTree({ ...tree, title: event.target.value }, `title:${tree.id}`)} /></label>
          <button onClick={() => void remove(true)}>删除整张树</button></fieldset>
        <div className="mind-toolbar"><label>查找节点<input placeholder="搜索文字、备注或资料名称" value={query} onChange={event => { setQuery(event.target.value); setMatchIndex(0); }} /></label>
          <button disabled={busy || !matchIds.length} onClick={() => { focusNode(matchIds[matchIndex % matchIds.length]); setMatchIndex(value => value + 1); }}>定位下一处</button>
          <span aria-live="polite">{query.trim() ? `${matchIds.length} 处匹配` : `${tree.nodes.length} 个节点`}</span>
          <button onClick={() => setMode(mode === 'map' ? 'list' : 'map')}>{mode === 'map' ? '切换层级视图' : '切换画布'}</button></div>
        <div className={`mind-workbench ${fullscreen ? 'is-fullscreen' : ''} ${showInspector ? 'show-inspector' : ''}`}>
          <div className="mind-map-column">
            <div className="mind-camera"><button onClick={() => zoom(.8)} aria-label="缩小导图">−</button><span>{Math.round(camera.scale * 100)}%</span><button onClick={() => zoom(1.25)} aria-label="放大导图">＋</button>
              <button onClick={fit}>适配全图</button><button onClick={() => node && focusNode(node.id)}>定位选中</button>
              <button onClick={() => { setFullscreen(value => !value); setShowInspector(false); }}>{fullscreen ? '退出全屏' : '全屏整理'}</button>
              <button onClick={() => { setShowInspector(true); window.requestAnimationFrame(() => document.querySelector('.mind-inspector')?.scrollIntoView({ block: 'start', behavior: 'smooth' })); }}>编辑选中节点</button></div>
            {mode === 'map' ? <div ref={viewport} className="mind-viewport" tabIndex={0} aria-label="思维树画布"
              onKeyDown={event => { if (event.nativeEvent.isComposing || (event.target as HTMLElement).matches('input,textarea,select')) return;
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(event.shiftKey); }
                else if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); add(); }
              }}
              onPointerDown={event => { const onNode = !!(event.target as HTMLElement).closest('button');
                if (onNode && event.pointerType === 'mouse') return;
                const box = event.currentTarget.getBoundingClientRect(); pointer.current.set(event.pointerId, { x: event.clientX - box.left, y: event.clientY - box.top, onNode });
                if (!onNode || pointer.current.size > 1) event.currentTarget.setPointerCapture(event.pointerId); resetGesture(); }}
              onPointerMove={event => { if (!pointer.current.has(event.pointerId) || !gesture.current) return;
                const box = event.currentTarget.getBoundingClientRect(); pointer.current.set(event.pointerId, { ...pointer.current.get(event.pointerId)!, x: event.clientX - box.left, y: event.clientY - box.top });
                const values = [...pointer.current.values()], base = gesture.current; const center = values.length > 1 ? { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 } : values[0];
                if (values.length === 1 && values[0].onNode) return;
                const ratio = values.length > 1 && base.distance > 0 ? Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y) / base.distance : 1;
                const scale = Math.max(.001, Math.min(2.5, base.camera.scale * ratio)), actual = scale / base.camera.scale;
                setCamera({ scale, x: center.x - (base.center.x - base.camera.x) * actual, y: center.y - (base.center.y - base.camera.y) * actual }); }}
              onPointerUp={event => { pointer.current.delete(event.pointerId); resetGesture(); }} onPointerCancel={() => { pointer.current.clear(); gesture.current = null; }}>
              <div className="mind-world" style={{ transform: `translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`, width: Math.max(...points.map(p => p.x)) + 240, height: Math.max(...points.map(p => p.y)) + 110 }}>
                <svg className="mind-edges" aria-hidden="true" width="100%" height="100%">{points.map(point => { const parent = pointMap.get(point.node.parentId || ''); if (!parent) return null;
                  return <path key={point.node.id} d={`M ${parent.x + 200} ${parent.y + 34} C ${parent.x + 226} ${parent.y + 34}, ${point.x - 26} ${point.y + 34}, ${point.x} ${point.y + 34}`} />; })}</svg>
                {points.map(point => <button key={point.node.id} className={`mind-node ${node?.id === point.node.id ? 'selected' : ''} ${matchIds.includes(point.node.id) ? 'matched' : ''}`}
                  aria-pressed={node?.id === point.node.id} aria-label={`节点：${label(point.node)}`} title={label(point.node)} style={{ left: point.x, top: point.y }} draggable={!busy && point.node.id !== tree.rootNodeId}
                  onDragStart={event => { dragging.current = point.node.id; event.dataTransfer.setData('text/plain', point.node.id); }} onDragEnd={() => { dragging.current = null; }}
                  onDragOver={event => { if (dragging.current) event.preventDefault(); }} onDrop={event => { if (!dragging.current) return; event.preventDefault(); event.stopPropagation(); move(dragging.current, point.node.id); dragging.current = null; }}
                  onClick={() => select(tree.id, point.node.id)} onDoubleClick={() => document.getElementById('mind-node-text')?.focus()}>
                  <small>{point.node.ref ? (targetFor(point.node.ref) ? '关联资料' : '引用已失效') : (point.node.id === tree.rootNodeId ? '起点' : '想法')}{point.node.collapsed ? ' · 已折叠' : ''}</small><span>{label(point.node)}</span></button>)}
              </div></div> : <div className="mind-list" aria-label="思维树层级列表">{points.map(point => <button key={point.node.id} aria-pressed={node?.id === point.node.id} style={{ paddingLeft: Math.min(point.depth, 12) * 18 + 12 }} onClick={() => select(tree.id, point.node.id)}>
                <small>{point.depth ? `第 ${point.depth} 层 · ` : '起点 · '}{point.node.collapsed ? '已折叠 · ' : ''}</small>{label(point.node)}</button>)}</div>}
            <p className="mind-hint">空白处拖动画布；双指或缩放按钮调整视野。桌面可将节点拖到另一个节点下。</p>
          </div>
          {node && <fieldset disabled={busy} className="mind-inspector"><legend>当前节点</legend>
            <label>节点文字<input id="mind-node-text" aria-label="节点文字" maxLength={2000} value={node.text} placeholder={node.ref ? '留空时跟随原资料名称' : '写下一个想法'} onBlur={() => { group.current = ''; }} onChange={event => updateNode({ text: event.target.value }, `text:${node.id}`)} /></label>
            <label>备注<textarea aria-label="节点备注" maxLength={100000} value={node.note} onBlur={() => { group.current = ''; }} onChange={event => updateNode({ note: event.target.value }, `note:${node.id}`)} /></label>
            <div className="mind-actions"><button onClick={() => add()}>添加子节点</button><button disabled={!node.parentId} onClick={() => add(true)}>添加同级</button>
              <button disabled={!childrenOf(tree, node.id).length} onClick={() => updateNode({ collapsed: !node.collapsed })}>{node.collapsed ? '展开分支' : '折叠分支'}</button>
              <button disabled={!node.parentId} onClick={() => reorder(-1)}>上移</button><button disabled={!node.parentId} onClick={() => reorder(1)}>下移</button></div>
            <label>移动到<select aria-label="移动到父节点" value={parentId} onChange={event => setParentId(event.target.value)}><option value="">选择新的父节点</option>{tree.nodes.filter(item => !forbiddenParents.has(item.id)).map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
            <button disabled={!node.parentId || !parentId} onClick={() => { move(node.id, parentId); setParentId(''); }}>移动分支</button>
            <label>关联原内容<select aria-label="关联原内容" value={targetKey} onChange={event => setTargetKey(event.target.value)}><option value="">选择项目资料或记录</option>{targets.map(target => <option key={target.key} value={target.key}>{target.label}</option>)}</select></label>
            <button disabled={!targetKey} onClick={() => { const target = targets.find(item => item.key === targetKey); if (target) { updateNode({ ref: target.ref }); setTargetKey(''); } }}>关联所选内容</button>
            {node.ref && <div className="mind-reference"><p>{targetFor(node.ref)?.label || '引用已失效：原资料已不在当前项目，节点仍保留。'}</p><button disabled={!targetFor(node.ref)} onClick={() => void withBusy(async () => { await targetFor(node.ref)?.open(); }, false)}>打开原内容</button><button onClick={() => updateNode({ ref: undefined })}>解除关联</button></div>}
            <button className="mind-danger" disabled={!node.parentId} onClick={() => void remove()}>删除节点及分支</button>
            <small>只整理导图，不改动原作品。删除前保留项目版本。</small>
          </fieldset>}
        </div>
      </>}
    </>}
  </div>;
}
