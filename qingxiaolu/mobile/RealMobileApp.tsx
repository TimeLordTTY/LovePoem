import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Share } from "@capacitor/share";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  disconnectSync, fetchServerItems, hasSyncLogin, loginSync, queueItem, syncNow,
  getLocalItems, selectItemsForSync,
  deleteLocalItem, getLocallyDeletedIds,
  getItemVersions, getLocalTrash, restoreLocalTrashItem, permanentlyDeleteLocalTrashItem,
  getSyncConflicts, resolveSyncConflict,
} from "./sync";
import { storeJson } from "./storage";
import { createBackup, downloadBackup, parseBackup, restoreBackup } from "./backup";
import HistoryImport from "./HistoryImport";
import ProjectWorkspace from "./ProjectWorkspace";
import WebsitePublish from "./WebsitePublish";
import WritingPreview from "./WritingPreview";
import { openTargetDraft } from "./nativeDraft";
import { shareOrDownloadArticleImages } from "./longImage";

type Tab = "项目" | "创作" | "稿件库" | "设置";

function blogTime(item: any) {
  const original = Date.parse(String(item.payload?.content?.publishedAt || ""));
  return Number.isFinite(original) ? original : Number(item.seq) || Date.now();
}

function itemTitle(item: any, fallback = "未命名项目") {
  return String(
    item?.payload?.title ||
    item?.payload?.content?.title ||
    item?.title ||
    item?.content?.title ||
    fallback,
  ).trim() || fallback;
}

export default function RealMobileApp() {
  const [initialEditorDraft] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("qx_editor_autosave") || "{}"); } catch { return {}; }
  });
  const [connected, setConnected] = useState(hasSyncLogin());
  const [tab, setTab] = useState<Tab>(initialEditorDraft.body || initialEditorDraft.title ? "创作" : "项目");
  const [editorSession, setEditorSession] = useState(0);
  const [items, setItems] = useState<any[]>(getLocalItems);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showLogin, setShowLogin] = useState(!connected && !localStorage.getItem("qx_local_mode"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState(String(initialEditorDraft.title || ""));
  const [body, setBody] = useState(String(initialEditorDraft.body || ""));
  const [images, setImages] = useState<string[]>(
    Array.isArray(initialEditorDraft.images) ? initialEditorDraft.images : [],
  );
  const [projectTitle, setProjectTitle] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showDocumentImport, setShowDocumentImport] = useState(false);
  const [creationType, setCreationType] = useState<"article" | "idea">(
    initialEditorDraft.creationType === "idea" ? "idea" : "article",
  );
  const [selectedForSync, setSelectedForSync] = useState<string[]>([]);
  const [batchSyncMode, setBatchSyncMode] = useState(false);
  const [openProject, setOpenProject] = useState<any>(null);
  const [activeProjectId, setActiveProjectId] = useState(String(initialEditorDraft.projectId || ""));
  const [editingId, setEditingId] = useState(String(initialEditorDraft.editingId || ""));
  const [websiteItem, setWebsiteItem] = useState<any>(null);
  const [showWebsiteSettings, setShowWebsiteSettings] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState<Record<string, any>>(initialEditorDraft.metadata || {});
  const [autoSavedAt, setAutoSavedAt] = useState(String(initialEditorDraft.savedAt || ""));
  const [showTrash, setShowTrash] = useState(false);
  const [versionItem, setVersionItem] = useState<any>(null);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogType, setBlogType] = useState("全部");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [conflicts, setConflicts] = useState<any[]>(getSyncConflicts);
  const [backupBusy, setBackupBusy] = useState(false);
  const backupInput = useRef<HTMLInputElement>(null);
  const editorPosition = useRef(initialEditorDraft.position || { start: 0, end: 0, scroll: 0 });
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [showAiProjectPicker, setShowAiProjectPicker] = useState(false);
  const [openProjectSection, setOpenProjectSection] = useState("项目");
  const [forwardItem, setForwardItem] = useState<any>(null);
  const isNativeApp = Capacitor.isNativePlatform();

  const projects = useMemo(() => items.filter((item) => item.payload.itemType === "project"), [items]);
  const visibleProjects = useMemo(() => projects.filter((item) =>
    showArchivedProjects ? Boolean(item.payload.content?.archived) : !item.payload.content?.archived),
  [projects, showArchivedProjects]);
  const discussions = useMemo(() => items.filter((item) =>
    item.payload?.itemType === "article" && item.payload?.content?.sourceLabel === "ChatGPT"), [items]);
  const articles = useMemo(() => items.filter((item) =>
    item.payload.itemType === "article" && item.payload?.content?.sourceLabel !== "ChatGPT"), [items]);
  const ideas = useMemo(() => items.filter((item) => item.payload.itemType === "idea"), [items]);
  const blogItems = useMemo(() =>
    [...articles, ...ideas].sort((a, b) => blogTime(b) - blogTime(a)), [articles, ideas]);
  const visibleBlogItems = useMemo(() => blogItems.filter((item) => {
    const typeMatch = blogType === "全部" ||
      (blogType === "稿件" && item.payload.itemType === "article" && !item.payload.content?.imported) ||
      (blogType === "灵感" && item.payload.itemType === "idea") ||
      (blogType === "历史导入" && item.payload.content?.imported);
    const query = blogSearch.trim().toLowerCase();
    const searchMatch = !query || `${item.payload.title || ""}\n${item.payload.content?.text || ""}\n${
      item.payload.content?.sourceLabel || ""}\n${item.payload.content?.publishedAt || ""}\n${(item.payload.content?.tags || []).join?.(" ") || item.payload.content?.tags || ""}`
      .toLowerCase().includes(query);
    const projectMatch = !projectFilter || String(item.payload.projectId || item.payload.content?.projectId || "") === projectFilter;
    const statusMatch = !statusFilter || (statusFilter === "ready" ? item.payload.content?.publicationState === "ready" : item.payload.content?.publicationState !== "ready");
    return typeMatch && searchMatch && projectMatch && statusMatch;
  }), [blogItems, blogSearch, blogType, projectFilter, statusFilter]);
  const blogArchive = useMemo(() => {
    const groups = new Map<string, { label: string; count: number }>();
    for (const item of blogItems) {
      const date = new Date(blogTime(item));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = groups.get(key);
      groups.set(key, {
        label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
        count: (current?.count || 0) + 1,
      });
    }
    return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
  }, [blogItems]);

  async function refresh(uploadPending = true) {
    setItems(getLocalItems());
    if (!hasSyncLogin()) return false;
    setLoading(true);
    try {
      if (uploadPending) await syncNow(true);
      await fetchServerItems();
      setItems(getLocalItems());
      setConflicts(getSyncConflicts());
      setMessage(uploadPending ? "已同步所选内容到情晓录云端" : "已读取情晓录云端数据");
      return true;
    } catch (error) {
      setItems(getLocalItems());
      setConflicts(getSyncConflicts());
      const reason = error instanceof Error ? error.message : "同步失败";
      setMessage(`${reason}。本机稿件仍可查看和编辑。`);
      if (reason.includes("登录状态已失效")) {
        setConnected(false);
        setShowLogin(true);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (connected) void refresh(false); }, [connected]);

  async function saveLocalDraft() {
    if (!title.trim() && !body.trim() && !images.length) return;
    const id = editingId || crypto.randomUUID();
    const savedAt = new Date().toISOString();
    const projectId = editingMetadata.projectId ?? activeProjectId;
    const content: Record<string, any> = { ...editingMetadata, text: body, images, status: "draft" };
    delete content._baseRevision;
    delete content.syncToServer;
    storeJson("qx_editor_autosave", { title, body, images, creationType, projectId, editingId: id,
      savedAt, metadata: editingMetadata, position: editorPosition.current });
    const pending = queueItem(creationType, title.trim() || body.trim().slice(0, 20) || "图片稿件", content,
      projectId || undefined, false, id, Number(editingMetadata._baseRevision || 0), false);
    setEditingId(id);
    setAutoSavedAt(savedAt);
    setItems(getLocalItems());
    await pending;
  }

  useEffect(() => {
    if (tab !== "创作") return;
    const timer = window.setTimeout(() => {
      void saveLocalDraft().catch((error) => { setAutoSavedAt(""); setMessage(error.message); });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [title, body, images, creationType, activeProjectId, editingId, editingMetadata, tab]);

  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (tab !== "创作" || (!title && !body && !images.length)) return;
      try { storeJson("qx_editor_autosave", { title, body, images, creationType, projectId: editingMetadata.projectId ?? activeProjectId,
        editingId, metadata: editingMetadata, position: editorPosition.current, savedAt: new Date().toISOString() }); }
      catch { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [title, body, images, creationType, activeProjectId, editingId, editingMetadata, tab]);

  useEffect(() => {
    let handle: { remove: () => Promise<void> } | undefined;
    void CapacitorApp.addListener("backButton", () => {
      if (showImport || showDocumentImport) window.dispatchEvent(new Event("qx-history-back"));
      else if (tab !== "项目") setTab("项目");
      else void CapacitorApp.exitApp();
    }).then((listener) => { handle = listener; });
    return () => { void handle?.remove(); };
  }, [showImport, showDocumentImport, tab]);

  useEffect(() => {
    if (!showImport && !showDocumentImport) return;
    window.history.pushState({ qxImportOverlay: true }, "", window.location.href);
    const handleBrowserBack = () => window.dispatchEvent(new Event("qx-history-back"));
    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, [showImport, showDocumentImport]);

  async function connect() {
    setMessage("正在连接服务器…");
    try {
      await loginSync(username, password);
      setConnected(true);
      setShowLogin(false);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "连接失败");
    }
  }

  async function save(type: "article" | "idea", metadata: Record<string, any> = {}) {
    if (!title.trim() && !body.trim() && !images.length) return setMessage("请先写一点内容");
    try {
    const savedTitle = title.trim() || body.trim().slice(0, 20) || "图片稿件";
    const { _baseRevision, syncToServer, ...cleanMetadata } = metadata;
    const savedContent = {
      text: body, status: "draft", images, ...cleanMetadata,
    };
    const savedId = await queueItem(
      type, savedTitle, savedContent, metadata.projectId || undefined, Boolean(metadata.syncToServer),
      editingId || undefined, Number(_baseRevision || 0),
    );
    setItems((current) => [{
      id: savedId,
      seq: Date.now(),
      payload: { id: savedId, itemType: type, title: savedTitle, content: savedContent },
    }, ...current.filter((item) => String(item.id) !== String(savedId))]);
    setEditingId(savedId);
    setEditingMetadata((current) => ({ ...current, ...metadata }));
    setAutoSavedAt(new Date().toISOString());
    setMessage(metadata.syncToServer ? "本机已保存，正在同步所选稿件…" : "已保存到本机，可以继续写作");
    if (metadata.syncToServer && !hasSyncLogin()) { setMessage("本机已保存，登录后可同步这篇稿件"); setShowLogin(true); }
    else if (metadata.syncToServer) await refresh();
    const updated = getLocalItems().find((item) => item.id === savedId);
    if (updated) setEditingMetadata((current) => ({ ...current, _baseRevision: Number(updated.revision || 0) }));
    } catch (error) { setAutoSavedAt(""); setMessage(error instanceof Error ? error.message : "保存失败，请保留编辑内容"); }
  }

  async function addProject() {
    if (!projectTitle.trim()) return;
    try { await queueItem("project", projectTitle.trim(), { description: "", cover: null }); }
    catch (error) { return setMessage((error as Error).message); }
    setProjectTitle("");
    await refresh(false);
  }

  async function exportAll() {
    setBackupBusy(true);
    setMessage("正在生成完整备份并读取图片…");
    try {
      const draft = title || body || images.length ? { id: editingId || crypto.randomUUID(), revision: editingMetadata._baseRevision || 0, position: editorPosition.current,
        payload: { id: editingId, itemType: creationType, title: title || body.slice(0, 20), projectId: editingMetadata.projectId ?? activeProjectId,
          content: { ...editingMetadata, text: body, images } } } : undefined;
      downloadBackup(await createBackup(undefined, draft), "情晓录"); setMessage("完整备份已生成，包含稿件、资料、图片和版本记录。");
    }
    catch (error) { setMessage((error as Error).message); }
    finally { setBackupBusy(false); }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      if (!window.confirm(`备份包含 ${backup.items.length} 条内容。仅补充当前设备缺少的稿件，相同稿件保留本机版本。继续恢复吗？`)) return;
      const result = restoreBackup(backup);
      setItems(getLocalItems());
      setMessage(`已恢复 ${result.restored} 条，保留本机已有 ${result.skipped} 条。恢复内容尚未上传云端。`);
    } catch (error) { setMessage((error as Error).message); }
    finally { if (backupInput.current) backupInput.current.value = ""; }
  }

  async function forward(item: any, target?: string) {
    const text = String(item.payload.content?.text || "");
    try {
      await navigator.clipboard?.writeText(text);
    } catch { /* 分享面板仍会携带正文 */ }
    if (target) {
      const imageUrls = (Array.isArray(item.payload.content?.images) ? item.payload.content.images : [])
        .filter(Boolean).map((source: string) => {
          try { return new URL(source, window.location.origin).href; } catch { return source; }
        });
      const result = await openTargetDraft(target, item.payload.title || "情晓录稿件", text, imageUrls);
      if (result.needsAccessibility) {
        setMessage("请在无障碍设置中进入“已下载的应用/已安装的服务”→“情晓录历史采集”→开启“使用服务”，返回情晓录后再点一次QQ说说");
        return;
      }
      if (result.opened) {
        setMessage(`已打开${target}，正文已复制`);
        return;
      }
      setMessage(`没有成功打开${target}，正文已复制`);
      return;
    }
    await Share.share({
      title: item.payload.title || "情晓录稿件",
      text,
      dialogTitle: target ? `打开${target}并建立草稿` : "转发到其他 App",
    });
  }

  async function createLongImage(item: any) {
    setMessage("正在生成手机长图…");
    try {
      const result = await shareOrDownloadArticleImages(
        String(item.payload.title || "情晓录稿件"),
        String(item.payload.content?.text || ""),
        Array.isArray(item.payload.content?.images) ? item.payload.content.images : [],
      );
      setMessage(result === "shared" ? "长图已交给系统分享" : "长图已下载");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "长图生成失败");
    }
  }

  async function syncSelected() {
    if (!selectedForSync.length) return setMessage("请先勾选要同步的稿件");
    const count = selectedForSync.length;
    try {
      await selectItemsForSync(selectedForSync);
      if (!hasSyncLogin()) { setShowLogin(true); return setMessage("所选内容已留在待同步队列，登录后点击同步"); }
      if (await refresh()) {
        setSelectedForSync([]); setBatchSyncMode(false); setMessage(`已同步所选 ${count} 篇稿件`);
      }
    } catch (error) { setMessage((error as Error).message); }
  }

  function editItem(item: any) {
    if (tab === "创作") void saveLocalDraft().catch((error) => setMessage(error.message));
    editorPosition.current = { start: 0, end: 0, scroll: 0 };
    setEditorSession((value) => value + 1);
    setEditingId(String(item.id));
    setTitle(String(item.payload.title || ""));
    setBody(String(item.payload.content?.text || ""));
    setImages(Array.isArray(item.payload.content?.images) ? item.payload.content.images : []);
    setCreationType(item.payload.itemType === "idea" ? "idea" : "article");
    setActiveProjectId(String(item.payload.projectId || item.payload.content?.projectId || ""));
    setEditingMetadata({ ...(item.payload.content || {}), _baseRevision: Number(item.revision || 0) });
    setTab("创作");
  }

  async function newDraft(projectId = "", chapterId = "") {
    try {
      await saveLocalDraft();
      setTitle(""); setBody(""); setImages([]); setEditingId(""); setAutoSavedAt("");
      setEditingMetadata({ projectId, chapterId }); setActiveProjectId(projectId);
      localStorage.removeItem("qx_editor_autosave");
      editorPosition.current = { start: 0, end: 0, scroll: 0 };
      setEditorSession((value) => value + 1);
      setOpenProject(null); setTab("创作"); setMessage("");
    } catch (error) { setMessage((error as Error).message); }
  }

  async function resolveConflict(id: string, choice: "cloud" | "local" | "both") {
    if (choice !== "both" && !window.confirm(choice === "local" ? "保留本机版并重新加入同步队列？" : "使用云端版？本机版会保留在版本记录中。")) return;
    try {
      await resolveSyncConflict(id, choice); setConflicts(getSyncConflicts()); setItems(getLocalItems());
      const updated = getLocalItems().find((item) => item.id === id);
      if (editingId === id && updated) {
        setTitle(updated.payload.title || ""); setBody(updated.payload.content?.text || ""); setImages(updated.payload.content?.images || []);
        setEditingMetadata({ ...updated.payload.content, projectId: updated.payload.projectId, _baseRevision: updated.revision || 0, syncToServer: false });
        setEditorSession((value) => value + 1);
      }
      setMessage(choice === "local" ? "已保留本机版，请点击同步上传" : "已处理冲突，保留的稿件可在稿件库查看");
    }
    catch (error) { setMessage((error as Error).message); }
  }

  async function removeItem(item: any) {
    if (!window.confirm(`确定删除《${item.payload.title || "未命名稿件"}》吗？`)) return;
    try {
    deleteLocalItem(item);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setSelectedForSync((current) => current.filter((id) => id !== item.id));
    setMessage("稿件已从当前设备删除，服务器内容未改动");
    if (editingId === item.id) {
      setTitle(""); setBody(""); setImages([]); setEditingId(""); setEditingMetadata({});
      localStorage.removeItem("qx_editor_autosave"); setEditorSession((value) => value + 1);
    }
    } catch (error) { setMessage((error as Error).message); }
  }

  function goToMainTab(next: Tab) {
    if (tab === "创作") void saveLocalDraft().catch((error) => setMessage(error.message));
    setShowImport(false);
    setShowDocumentImport(false);
    setOpenProject(null);
    setWebsiteItem(null);
    setShowWebsiteSettings(false);
    setShowTrash(false);
    setVersionItem(null);
    setTab(next);
  }

  const fixedNavigation = <nav className="global-main-nav">
    {(["项目", "创作", "稿件库", "设置"] as Tab[]).map((name) =>
      <button className={tab === name ? "active" : ""} key={name} onClick={() => goToMainTab(name)}>{name}</button>)}
  </nav>;
  const loginPanel = showLogin && <div className="sync-login-mask"><div className="sync-login-card">
    <h2>连接创作云端</h2><p>登录后可同步自己选择的稿件，也可以先在本机写作。</p>
    <label>账户<input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="账户" autoComplete="username" /></label>
    <label>密码<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="密码" autoComplete="current-password" /></label>
    {message && <small role="status">{message}</small>}
    <div><button onClick={() => { localStorage.setItem("qx_local_mode", "1"); setShowLogin(false); }}>{connected ? "关闭" : "先在本机使用"}</button>
      <button className="primary" onClick={() => void connect()}>登录并连接</button></div>
  </div></div>;
  const pageWithNavigation = (page: ReactNode) =>
    <div className="global-page-shell">{page}{fixedNavigation}</div>;

  if (showImport) return pageWithNavigation(<HistoryImport kind="history" close={() => { setShowImport(false); void refresh(false); }} />);
  if (showDocumentImport) return pageWithNavigation(<HistoryImport kind="documents" projects={projects}
    close={() => { setShowDocumentImport(false); void refresh(false); }} />);
  if (openProject) return pageWithNavigation(<ProjectWorkspace project={openProject}
    initialSection={openProjectSection}
    articles={articles.filter((item) =>
      String(item.payload?.projectId || item.payload?.content?.projectId || "") === String(openProject.id))}
    discussions={discussions.filter((item) =>
      String(item.payload?.projectId || item.payload?.content?.projectId || "") === String(openProject.id) &&
      item.payload?.content?.sourceLabel === "ChatGPT")}
    onEditArticle={(article) => {
      setOpenProject(null);
      editItem(article);
    }}
    close={() => setOpenProject(null)}
    onNewArticle={(chapterId = "") => void newDraft(String(openProject.id), chapterId)}
    onWrite={() => {
      const recent = articles.filter((item) => String(item.payload.projectId || item.payload.content?.projectId || "") === String(openProject.id))
        .sort((a, b) => Number(b.seq || 0) - Number(a.seq || 0))[0];
      if (recent) { setOpenProject(null); editItem(recent); return; }
      setActiveProjectId(String(openProject.id));
      setOpenProject(null);
      setTab("创作");
    }} onUpdated={(nextTitle, content) => {
      setItems(getLocalItems());
      setOpenProject((current: any) => current ? {
        ...current, payload: { ...current.payload, title: nextTitle, content },
      } : current);
    }} />);
  if (websiteItem || showWebsiteSettings) return pageWithNavigation(<WebsitePublish item={websiteItem}
    items={[...articles, ...ideas]}
    onLogin={() => { setWebsiteItem(null); setShowWebsiteSettings(false); setConnected(false); setShowLogin(true); }}
    close={() => { setWebsiteItem(null); setShowWebsiteSettings(false); }} />);
  if (showTrash) return pageWithNavigation(<LocalTrash close={() => setShowTrash(false)} onRestore={(item) => {
    setItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
  }} />);
  if (versionItem) return pageWithNavigation(<VersionHistory item={versionItem} close={() => setVersionItem(null)}
    onRestore={(version) => {
      setEditingId(String(versionItem.id));
      setTitle(String(version.title || ""));
      setBody(String(version.content?.text || ""));
      setImages(Array.isArray(version.content?.images) ? version.content.images : []);
      setCreationType(version.itemType === "idea" ? "idea" : "article");
      setActiveProjectId(String(version.projectId || ""));
      setEditingMetadata(version.content || {});
      setVersionItem(null);
      setTab("创作");
    }} />);
  if (tab === "创作") return <><ArticleEditor key={editorSession}
    title={title}
    body={body}
    images={images}
    onTitle={setTitle}
    onBody={setBody}
    onImages={setImages}
    onBack={() => goToMainTab("项目")}
    projects={projects}
    creationType={creationType}
    onCreationType={setCreationType}
    onNavigate={goToMainTab}
    initialProjectId={activeProjectId}
    initialMetadata={editingMetadata}
    autoSavedAt={autoSavedAt}
    message={message}
    onMetadata={setEditingMetadata}
    position={editorPosition.current}
    onPosition={(value) => { editorPosition.current = value; }}
    onNewDraft={() => void newDraft(editingMetadata.projectId ?? activeProjectId)}
    onBackup={() => void exportAll()}
    onSave={(metadata) => void save(creationType, metadata)}
  />{loginPanel}</>;

  return (
    <main className="real-app">
      <header>
        <div><b>情晓录</b><span>{connected ? `云端已连接${localStorage.getItem("qx_last_sync") ? ` · 上次同步 ${new Date(localStorage.getItem("qx_last_sync")!).toLocaleString()}` : " · 尚未同步"}` : "本机写作 · 可离线使用"}</span></div>
        <button disabled={loading} onClick={() => connected ? void refresh() : setShowLogin(true)}>{loading ? "同步中…" : "同步"}</button>
      </header>

      {message && <div className="real-message">{message}</div>}

      <section className="real-content">
        {tab === "项目" && <>
          <h1>创作项目</h1>
          <div className="inline-create">
            <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="新项目名称" />
            <button onClick={() => void addProject()}>新建</button>
          </div>
          <button className="project-import-entry" onClick={() => setShowDocumentImport(true)}>
            <span><b>导入本地文档</b><small>DOCX、PDF、XMind、OPML、Markdown、CSV、JSON</small></span><i>›</i>
          </button>
          <div className="project-view-switch">
            <button className={!showArchivedProjects ? "active" : ""} onClick={() => setShowArchivedProjects(false)}>当前项目</button>
            <button className={showArchivedProjects ? "active" : ""} onClick={() => setShowArchivedProjects(true)}>已归档</button>
          </div>
          <div className="real-list">
            {visibleProjects.length === 0 && <p className="empty">{showArchivedProjects ? "没有已归档项目。" : "还没有项目，可以先新建一个。"}</p>}
            {visibleProjects.map((item) => <article className="project-card" key={item.id}
              onClick={() => { setOpenProjectSection("项目"); setOpenProject(item); }}><small>{item.payload.content?.archived ? "已归档" : "项目"}</small>
              <h2 title={itemTitle(item)}>{itemTitle(item)}</h2><div><button>进入项目</button>
                <button className="delete-project" onClick={(event) => {
                  event.stopPropagation();
                  if (!window.confirm(`从当前设备删除项目《${itemTitle(item)}》吗？`)) return;
                  deleteLocalItem(item);
                  setItems((current) => current.filter((entry) => entry.id !== item.id));
                }}>本地删除</button></div></article>)}
          </div>
        </>}

        {tab === "稿件库" && <>
          <h1>稿件库</h1>
          {!!conflicts.length && <section className="conflict-list"><h2>待处理的版本冲突</h2><p>两版都保留着。可以对照后选择，或保留双方。</p>
            {conflicts.map((conflict) => <article key={conflict.id}><h3>{conflict.local?.title || conflict.server?.title || "稿件"}</h3>
              <div className="conflict-columns"><div><b>本机版</b><pre>{conflict.local?.content?.text || JSON.stringify(conflict.local?.content, null, 2)}</pre></div>
                <div><b>云端版 · 第 {conflict.server.revision} 版</b><pre>{(() => { try { const content = typeof conflict.server.content_json === "string" ? JSON.parse(conflict.server.content_json) : conflict.server.content_json; return content?.text || JSON.stringify(content, null, 2); } catch { return "无法读取云端内容，请先保留双方并导出备份"; } })()}</pre></div></div>
              <button onClick={() => void resolveConflict(conflict.id, "both")}>保留双方</button>
              <button onClick={() => void resolveConflict(conflict.id, "local")}>保留本机版</button>
              <button onClick={() => void resolveConflict(conflict.id, "cloud")}>使用云端版</button>
            </article>)}
          </section>}
          <p className="subline">按时间浏览稿件、灵感和导入的旧内容。</p>
          <div className="blog-tools">
            <label className="blog-search"><span aria-hidden="true">⌕</span>
              <input value={blogSearch} onChange={(event) => setBlogSearch(event.target.value)}
                aria-label="搜索历史内容" placeholder="搜索正文、来源或日期" />
              {!!blogSearch && <button type="button" onClick={() => setBlogSearch("")}>清除</button>}
            </label>
            <select value={blogType} onChange={(event) => setBlogType(event.target.value)}>
              {["全部", "稿件", "灵感", "历史导入"].map((name) => <option key={name}>{name}</option>)}
            </select>
            <select aria-label="筛选项目" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="">全部项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.payload.title}</option>)}
            </select>
            <select aria-label="筛选稿件状态" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option><option value="editing">待修改</option><option value="ready">已定稿</option>
            </select>
          </div>
          {!batchSyncMode ? <div className="batch-sync-entry">
            <button onClick={() => setBatchSyncMode(true)}>批量同步</button>
            <button onClick={() => setShowAiProjectPicker(true)}>AI 联动</button>
          </div> : <div className="batch-sync-bar">
            <button className="plain" onClick={() => {
              const ids = visibleBlogItems.map((item) => item.id);
              setSelectedForSync(ids.every((id) => selectedForSync.includes(id)) ? [] : ids);
            }}>{visibleBlogItems.length > 0 && visibleBlogItems.every((item) => selectedForSync.includes(item.id)) ? "取消全选" : "全选当前结果"}</button>
            <span>已选择 {selectedForSync.length} 篇</span>
            <button disabled={!selectedForSync.length} onClick={() => void syncSelected()}>同步已选</button>
            <button className="plain" onClick={() => {
              setSelectedForSync([]);
              setBatchSyncMode(false);
            }}>取消</button>
          </div>}
          <div className="blog-layout">
          <div className="blog-feed">
            {visibleBlogItems.length === 0 && <p className="empty">{blogItems.length ? "没有符合条件的内容。" : "还没有内容。"}</p>}
            {visibleBlogItems.map((item) => {
              const itemDate = new Date(blogTime(item));
              const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
              return <article key={item.id} data-blog-month={monthKey}>
                {batchSyncMode && <label className="item-sync-check">
                  <input type="checkbox" checked={selectedForSync.includes(item.id)}
                    onChange={(event) => setSelectedForSync((current) => event.target.checked
                      ? [...current, item.id] : current.filter((id) => id !== item.id))} />
                  选择同步
                </label>}
                <header><span className="blog-avatar">晓</span><div><b>{projects.find((project) => project.id === (item.payload.projectId || item.payload.content?.projectId))?.payload.title || "我的稿件"}</b>
                  <small>{item.payload.itemType === "idea" ? "灵感" :
                    item.payload.content?.imported ? item.payload.content?.sourceLabel || "历史导入" : "稿件"}</small></div></header>
                {!!item.payload.title && <h2>{item.payload.title}</h2>}
                <small className={`sync-state ${item.syncState || "local"}`}>{
                  conflicts.some((entry) => entry.id === item.id) ? "版本冲突 · 两版已保留" :
                  item.syncState === "synced" ? "云端已保存 · 本机可离线查看" :
                  item.syncState === "pending" ? "等待同步" : "仅本机"}</small>
                <small>{new Date(blogTime(item)).toLocaleString()} · {item.payload.content?.publicationState === "ready" ? "已定稿" : "待修改"}</small>
                {!!item.payload.content?.text && <details className="manuscript-excerpt"><summary>{String(item.payload.content.text).slice(0, 160)}{item.payload.content.text.length > 160 ? "…展开阅读全文" : ""}</summary><p>{item.payload.content.text}</p></details>}
                {!!item.payload.content?.images?.length && <div className="blog-images">
                  {item.payload.content.images.slice(0, 9).map((image: string, index: number) =>
                    image && <img key={index} src={image} alt="" referrerPolicy="no-referrer" />)}
                </div>}
                <div className="article-actions"><button onClick={() => editItem(item)}>继续编辑</button>
                  {item.payload.content?.publicationState === "ready" &&
                    item.payload.content?.visibility === "public" &&
                    <button onClick={() => setWebsiteItem(item)}>上传网站</button>}
                  {isNativeApp && <button onClick={() => setForwardItem(item)}>转发</button>}
                  <button onClick={() => void createLongImage(item)}>生成长图</button>
                  <button onClick={() => setVersionItem(item)}>版本</button>
                  <button className="delete-article" onClick={() => void removeItem(item)}>删除</button></div>
                {isNativeApp && !!item.payload.content?.shareTargets?.length && <div className="draft-target-actions">
                  {item.payload.content.shareTargets.map((target: string) =>
                    <button key={target} onClick={() => void forward(item, target)}>转到{target}</button>)}
                </div>}
              </article>;
            })}
          </div>
          {!!blogArchive.length && <aside className="blog-date-archive">
            <h2>日期</h2>
            <div>{blogArchive.map((month) =>
              <button key={month.key} onClick={() => {
                document.querySelector(`[data-blog-month="${month.key}"]`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}><span>{month.label}</span><small>{month.count}</small></button>)}
            </div>
          </aside>}
          </div>
        </>}

        {tab === "设置" && <>
          <h1>设置</h1>
          <h2 className="setting-title">创作备份</h2>
          <p>完整备份包含本机稿件、图片、项目资料和版本记录。恢复后先保存在本机。</p>
          <button className="tool-entry" disabled={backupBusy} onClick={() => void exportAll()}><span><b>{backupBusy ? "正在整理图片…" : "下载完整备份"}</b><small>备份文件不含账号令牌和 AI 密钥</small></span></button>
          <button className="tool-entry" onClick={() => backupInput.current?.click()}><span><b>从完整备份恢复</b><small>先预览数量，保留本机已有稿件</small></span></button>
          <input ref={backupInput} hidden type="file" accept=".json" onChange={(event) => void importBackup(event.target.files?.[0])} />
          <h2 className="setting-title">工具</h2>
          <button className="tool-entry" onClick={() => setShowImport(true)}>
            <span><b>历史导入</b><small>微博、QQ 空间、朋友圈、一言</small></span><i>›</i>
          </button>
          <div className="setting-row"><span>同步服务器</span><b>poem.timelordtty.cn</b></div>
          <button className="tool-entry" onClick={() => setShowWebsiteSettings(true)}>
            <span><b>上传网站</b><small>沿用当前账户，上传所选稿件为网站草稿</small></span><i>›</i>
          </button>
          <button className="tool-entry" onClick={() => setShowTrash(true)}>
            <span><b>本地回收站</b><small>恢复或永久删除当前设备上的稿件</small></span><i>›</i>
          </button>
          <button className="disconnect" onClick={() => { disconnectSync(); setConnected(false); setShowLogin(true); }}>
            断开并重新登录
          </button>
        </>}
      </section>

      <nav>{(["项目", "创作", "稿件库", "设置"] as Tab[]).map((name) =>
        <button className={tab === name ? "active" : ""} key={name} onClick={() => goToMainTab(name)}>{name}</button>)}</nav>

      {loginPanel}
      {showAiProjectPicker && <div className="sync-login-mask"><div className="sync-login-card ai-project-picker">
        <h2>选择AI联动项目</h2><p>讨论和生成内容将保存在项目内。</p>
        <div className="ai-project-options">{projects.map((project) => <button key={project.id} onClick={() => {
          setOpenProjectSection("AI 讨论");
          setOpenProject(project);
          setShowAiProjectPicker(false);
        }}>{itemTitle(project)}</button>)}</div>
        {!projects.length && <small>请先新建一个项目。</small>}
        <div><button onClick={() => setShowAiProjectPicker(false)}>关闭</button></div>
      </div></div>}
      {isNativeApp && forwardItem && <div className="sync-login-mask"><div className="sync-login-card forward-picker">
        <h2>转发到</h2>
        <p>正文会复制到剪贴板，图片会交给目标 App 的分享页面。</p>
        <div className="forward-targets">{["QQ说说", "微信朋友圈", "一言", "微博"].map((target) =>
          <button key={target} onClick={() => {
            const item = forwardItem;
            setForwardItem(null);
            void forward(item, target);
          }}>{target}</button>)}</div>
        <button className="forward-cancel" onClick={() => setForwardItem(null)}>取消</button>
      </div></div>}
    </main>
  );
}

function LocalTrash({ close, onRestore }: { close: () => void; onRestore: (item: any) => void }) {
  const [trash, setTrash] = useState<any[]>(() => getLocalTrash());
  return <main className="local-manager-page">
    <header><button onClick={close}>‹ 返回</button><b>本地回收站</b><span /></header>
    <section>
      {!trash.length && <p className="empty">回收站为空。</p>}
      {trash.map((item) => <article key={item.id}>
        <small>{item.deletedAt ? new Date(item.deletedAt).toLocaleString() : ""}</small>
        <h2>{item.payload?.title || item.title || "未命名稿件"}</h2>
        <p>{String(item.payload?.content?.text || item.content?.text || "").slice(0, 180)}</p>
        <div><button onClick={() => {
          const restored = restoreLocalTrashItem(String(item.id));
          if (restored) onRestore(restored);
          setTrash((current) => current.filter((entry) => entry.id !== item.id));
        }}>恢复</button><button className="danger" onClick={() => {
          if (!window.confirm("永久删除这条本地记录吗？")) return;
          permanentlyDeleteLocalTrashItem(String(item.id));
          setTrash((current) => current.filter((entry) => entry.id !== item.id));
        }}>永久删除</button></div>
      </article>)}
    </section>
  </main>;
}

function VersionHistory({
  item, close, onRestore,
}: {
  item: any; close: () => void; onRestore: (version: any) => void;
}) {
  const versions = getItemVersions(String(item.id));
  return <main className="local-manager-page">
    <header><button onClick={close}>‹ 返回</button><b>版本记录</b><span /></header>
    <section>
      <h1>{item.payload?.title}</h1>
      {!versions.length && <p className="empty">这篇稿件还没有较早版本。再次修改并保存后会自动保留旧版本。</p>}
      {versions.map((version: any, index: number) => <article key={`${version.versionSavedAt}-${index}`}>
        <small>{version.versionSavedAt ? new Date(version.versionSavedAt).toLocaleString() : `版本 ${index + 1}`}</small>
        <h2>{version.title || "未命名版本"}</h2>
        <p>{String(version.content?.text || "").slice(0, 220)}</p>
        <div><button onClick={() => onRestore(version)}>恢复此版本并编辑</button></div>
      </article>)}
    </section>
  </main>;
}

function ArticleEditor({
  title, body, images, onTitle, onBody, onImages, onBack, onSave, projects, creationType, onCreationType, onNavigate,
  initialProjectId,
  initialMetadata,
  autoSavedAt,
  message, onMetadata, position, onPosition, onNewDraft, onBackup,
}: {
  title: string;
  body: string;
  images: string[];
  onTitle: (value: string) => void;
  onBody: (value: string) => void;
  onImages: (value: string[]) => void;
  onBack: () => void;
  onSave: (metadata: Record<string, any>) => void;
  projects: any[];
  creationType: "article" | "idea";
  onCreationType: (type: "article" | "idea") => void;
  onNavigate: (tab: Tab) => void;
  initialProjectId: string;
  initialMetadata: Record<string, any>;
  autoSavedAt: string;
  message: string;
  onMetadata: (metadata: Record<string, any>) => void;
  position: { start: number; end: number; scroll: number };
  onPosition: (position: { start: number; end: number; scroll: number }) => void;
  onNewDraft: () => void;
  onBackup: () => void;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const imagePicker = useRef<HTMLInputElement>(null);
  const [visibility, setVisibility] = useState(
    initialMetadata.visibility === "public" ? "public" : "qingxiaolu",
  );
  const [publicationState, setPublicationState] = useState(
    initialMetadata.publicationState === "ready" ? "ready" : "editing",
  );
  const [tags, setTags] = useState(
    Array.isArray(initialMetadata.tags)
      ? initialMetadata.tags.join("，")
      : String(initialMetadata.tags || ""),
  );
  const [projectId, setProjectId] = useState(initialProjectId);
  const [chapterId, setChapterId] = useState(String(initialMetadata.chapterId || ""));
  const [documentMode, setDocumentMode] = useState(false);
  const [syncToServer, setSyncToServer] = useState(false);
  const [shareTargets, setShareTargets] = useState<string[]>(
    Array.isArray(initialMetadata.shareTargets) ? initialMetadata.shareTargets : [],
  );
  const [focused, setFocused] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [findText, setFindText] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  useEffect(() => {
    onMetadata({ ...initialMetadata, visibility, publicationState, tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      projectId, chapterId: chapterId || undefined, syncToServer, shareTargets });
  }, [visibility, publicationState, tags, projectId, chapterId, syncToServer, shareTargets]);
  useEffect(() => {
    const field = editor.current;
    if (field) { field.setSelectionRange(position.start, position.end); field.scrollTop = position.scroll; }
  }, []);

  function findNext() {
    if (!findText || !editor.current) return;
    const start = editor.current.selectionEnd;
    const next = body.indexOf(findText, start);
    const at = next >= 0 ? next : body.indexOf(findText);
    if (at >= 0) { editor.current.focus(); editor.current.setSelectionRange(at, at + findText.length); }
  }
  const dirty = Boolean(title.trim() || body.trim() || images.length);
  const selectedProject = projects.find((project) => String(project.id) === String(projectId));
  const projectChapters = Array.isArray(selectedProject?.payload?.content?.chapters)
    ? selectedProject.payload.content.chapters : [];
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave({ visibility, publicationState, tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
          projectId, chapterId: chapterId || undefined, syncToServer, shareTargets, _baseRevision: initialMetadata._baseRevision });
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onSave, visibility, publicationState, tags, projectId, chapterId, syncToServer, shareTargets, initialMetadata._baseRevision]);

  function insert(before: string, after = "") {
    const field = editor.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = body.slice(start, end);
    onBody(body.slice(0, start) + before + selected + after + body.slice(end));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + before.length, end + before.length);
    });
  }

  async function addImages(files: File[]) {
    const accepted = files.filter((file) => file.type.startsWith("image/") && file.size <= 4 * 1024 * 1024);
    setImageMessage(files.length !== accepted.length || accepted.length + images.length > 9 ? "最多加入 9 张图片，每张不超过 4 MB；超出限制的图片没有加入。" : "");
    const encoded = await Promise.all(accepted.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));
    onImages([...images, ...encoded].slice(0, 9));
  }

  return (
    <main className={`article-editor qzone-editor ${focused ? "writing-focused" : ""}`}>
      <header>
        <button className="editor-cancel" onClick={onBack}>返回</button>
        <div><b>{creationType === "article" ? "写作" : "记录灵感"}</b></div>
        <button className="editor-publish" disabled={!dirty}
          onClick={() => onSave({
            visibility,
            tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
            projectId,
            chapterId: chapterId || undefined,
            syncToServer,
            shareTargets,
            publicationState,
            _baseRevision: initialMetadata._baseRevision,
          })}>保存</button>
      </header>
      {message && <div className="real-message" role="status">{message}</div>}
      <div className="writing-tools">
        <button onClick={onNewDraft}>新稿件</button>
        <button onClick={onBackup}>完整备份</button>
        <button className="focus-toggle" onClick={() => { if (!focused) setShowReference(false); setFocused(!focused); }}>{focused ? "退出专注" : "专注写作"}</button>
        <button onClick={() => setShowReference(!showReference)}>{showReference ? "收起资料" : "查看项目资料"}</button>
        <button onClick={() => setPreview(!preview)}>{preview ? "返回编辑" : "排版预览"}</button>
        <input aria-label="正文查找" placeholder="查找正文" value={findText} onChange={(event) => setFindText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") findNext(); }} />
        <button onClick={findNext}>下一处</button>
      </div>
      {showReference && <aside className="writing-reference"><b>当前项目资料</b>
        {!selectedProject ? <p>先在下方选择所属项目，即可边写边查资料。</p> : <>
          <h3>{selectedProject.payload.title}</h3>
          <h4>章节大纲</h4>{projectChapters.map((chapter: any) => <details key={chapter.id}><summary>{chapter.title || "未命名章节"}</summary><p>{chapter.summary}</p></details>)}
          <h4>人物</h4>{selectedProject.payload.content?.characterCards?.map((card: any) => <details key={card.id}><summary>{card.name}</summary><p>{card.role}\n{card.description}</p></details>)}
          <h4>世界观</h4><p>{selectedProject.payload.content?.world || "尚未填写"}</p>
          <h4>情节与伏笔</h4><p>{selectedProject.payload.content?.plot || "尚未填写"}</p>
        </>}
      </aside>}

      <section className={documentMode ? "qzone-compose document-compose" : "qzone-compose"}>
        <div className="compose-mode-row">
          <div className="creation-switch">
            <button className={creationType === "article" ? "active" : ""} onClick={() => onCreationType("article")}>稿件</button>
            <button className={creationType === "idea" ? "active" : ""} onClick={() => onCreationType("idea")}>灵感</button>
          </div>
          <button className="more-edit" onClick={() => setDocumentMode(!documentMode)}>
            {documentMode ? "简洁编辑" : "更多编辑"}
          </button>
        </div>
        <input className="document-title" value={title} onChange={(event) => onTitle(event.target.value)}
          aria-label="稿件标题" placeholder="稿件标题（可选）" maxLength={100} />
        {documentMode && <>
          <div className="word-toolbar">
            <button onClick={() => insert("# ")}>标题 1</button>
            <button onClick={() => insert("**", "**")}><b>B</b></button>
            <button onClick={() => insert("*", "*")}><i>I</i></button>
            <button onClick={() => insert("<u>", "</u>")}><u>U</u></button>
            <button onClick={() => insert("> ")}>引用</button>
            <button onClick={() => insert("- ")}>列表</button>
            <button onClick={() => insert("[^注释]", "\n\n[^注释]: ")}>注释</button>
            <button onClick={() => insert("\n---\n")}>分隔线</button>
          </div>
        </>}
        {preview ? <WritingPreview text={body} /> : <textarea ref={editor} value={body} onChange={(event) => onBody(event.target.value)}
          onSelect={(event) => { const field = event.currentTarget; onPosition({ start: field.selectionStart, end: field.selectionEnd, scroll: field.scrollTop }); }}
          onScroll={(event) => { const field = event.currentTarget; onPosition({ start: field.selectionStart, end: field.selectionEnd, scroll: field.scrollTop }); }}
          placeholder={documentMode ? "开始编辑文档正文……" : "这一刻，想写点什么……"} autoFocus />}
        {!!images.length && <div className="qzone-images compact">{images.map((image, index) =>
          <figure key={`${image.slice(-16)}-${index}`}><img src={image} alt={`插图 ${index + 1}`} referrerPolicy="no-referrer" />
            <button onClick={() => onImages(images.filter((_, at) => at !== index))}>×</button></figure>)}
        </div>}
        <input ref={imagePicker} hidden multiple type="file" accept="image/*"
          onChange={(event) => void addImages(Array.from(event.target.files || [])).catch(() => setImageMessage("图片无法读取，请重新选择"))} />
        {imageMessage && <p role="status">{imageMessage}</p>}
      </section>

      <section className="publish-options">
        <button onClick={() => imagePicker.current?.click()}><span>加入照片</span>
          <em>{images.length ? `已选 ${images.length} 张　›` : "选择照片　›"}</em></button>
        <label><span>归入项目</span><select value={projectId} onChange={(event) => {
          setProjectId(event.target.value);
          setChapterId("");
        }}>
          <option value="">未归入项目</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.payload.title}</option>)}
        </select></label>
        {!!projectChapters.length && <label><span>对应章节</span><select value={chapterId}
          onChange={(event) => setChapterId(event.target.value)}>
          <option value="">暂不关联章节</option>
          {projectChapters.map((chapter: any, index: number) => <option key={chapter.id} value={chapter.id}>
            第 {index + 1} 章 · {chapter.title || "未命名章节"}
          </option>)}
        </select></label>}
        <label><span>标签</span><input value={tags} onChange={(event) => setTags(event.target.value)}
          placeholder="添加标签" /></label>
        <button onClick={() => setPublicationState(publicationState === "editing" ? "ready" : "editing")}>
          <span>稿件状态</span><em>{publicationState === "ready" ? "已定稿" : "待修改"}　›</em>
        </button>
        <details className="optional-publication"><summary>对外使用选项</summary>
          <button onClick={() => setVisibility(visibility === "qingxiaolu" ? "public" : "qingxiaolu")}>{visibility === "public" ? "允许公开发布" : "仅情晓录可见"} · 点击切换</button>
          <p>保存与云端备份不会自动对外发布。</p>
        </details>
        <button onClick={() => setDocumentMode(true)}><span>格式工具</span><em>Markdown 标记，支持排版预览　›</em></button>
        <div className="draft-sync-options">
          <h3>同步</h3>
          <label className="server-sync-choice">
            <span>同步这篇稿件到服务器</span>
            <input type="checkbox" checked={syncToServer}
              onChange={(event) => setSyncToServer(event.target.checked)} />
          </label>
          <p>只影响当前稿件，未勾选时仅保存到本地。</p>
          {Capacitor.isNativePlatform() && <><h3>转到其他 App 的草稿框</h3>
          <div className="share-target-grid">
            {["QQ说说", "微信朋友圈", "一言", "微博"].map((target) =>
              <label key={target}><input type="checkbox" checked={shareTargets.includes(target)}
                onChange={(event) => setShareTargets((current) => event.target.checked
                  ? [...current, target] : current.filter((name) => name !== target))} />{target}</label>)}
          </div>
          <p>保存后从稿件的“转发”打开目标 App；正文同时复制，便于放入草稿框。</p></>}
        </div>
      </section>

      <div className="compose-status"><span>{body.replace(/\s/g, "").length} 字</span>
        <span>{autoSavedAt ? `已自动保存 ${new Date(autoSavedAt).toLocaleTimeString([], {
          hour: "2-digit", minute: "2-digit",
        })}` : syncToServer ? "此稿件将同步" : "仅保存到本地"}</span></div>
      <nav className="editor-main-nav">
        {(["项目", "创作", "稿件库", "设置"] as Tab[]).map((name) =>
          <button className={name === "创作" ? "active" : ""} key={name} onClick={() => onNavigate(name)}>{name}</button>)}
      </nav>
    </main>
  );
}
