import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Share } from "@capacitor/share";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  disconnectSync, fetchServerItems, hasSyncLogin, loginSync, queueItem, syncNow,
  getLocalItems, selectItemsForSync,
  deleteLocalItem, getLocallyDeletedIds,
  getItemVersions, getLocalTrash, restoreLocalTrashItem, permanentlyDeleteLocalTrashItem,
} from "./sync";
import HistoryImport from "./HistoryImport";
import ProjectWorkspace from "./ProjectWorkspace";
import WebsitePublish from "./WebsitePublish";
import { openTargetDraft } from "./nativeDraft";
import { shareOrDownloadArticleImages } from "./longImage";

type Tab = "项目" | "创作" | "博客" | "设置";

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
  const [tab, setTab] = useState<Tab>("项目");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showLogin, setShowLogin] = useState(!connected);
  const [username, setUsername] = useState("littlehou");
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
  const [editingMetadata, setEditingMetadata] = useState<Record<string, any>>({});
  const [autoSavedAt, setAutoSavedAt] = useState(String(initialEditorDraft.savedAt || ""));
  const [showTrash, setShowTrash] = useState(false);
  const [versionItem, setVersionItem] = useState<any>(null);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogType, setBlogType] = useState("全部");
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
      item.payload.content?.sourceLabel || ""}\n${item.payload.content?.publishedAt || ""}`
      .toLowerCase().includes(query);
    return typeMatch && searchMatch;
  }), [blogItems, blogSearch, blogType]);
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
    if (!hasSyncLogin()) return;
    setLoading(true);
    try {
      if (uploadPending) await syncNow(true);
      const serverItems = await fetchServerItems();
      const localItems = getLocalItems();
      const localIds = new Set(localItems.map((item: any) => item.id));
      const deletedIds = getLocallyDeletedIds();
      setItems([...localItems.filter((item: any) => !deletedIds.has(item.id)),
        ...serverItems.filter((item: any) => !localIds.has(item.id) && !deletedIds.has(item.id))]);
      setMessage(uploadPending ? "已同步所选内容到情晓录云端" : "已读取情晓录云端数据");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "同步失败";
      setMessage(reason);
      if (reason.includes("登录状态已失效")) {
        setConnected(false);
        setShowLogin(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (connected) void refresh(false); }, [connected]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!title.trim() && !body.trim() && !images.length) {
        localStorage.removeItem("qx_editor_autosave");
        return;
      }
      const savedAt = new Date().toISOString();
      localStorage.setItem("qx_editor_autosave", JSON.stringify({
        title, body, images, creationType, projectId: activeProjectId, editingId, savedAt,
      }));
      setAutoSavedAt(savedAt);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [title, body, images, creationType, activeProjectId, editingId]);

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
    if (!title.trim() && !body.trim()) return setMessage("请先写一点内容");
    const savedTitle = title.trim() || body.trim().slice(0, 20);
    const { _baseRevision, ...cleanMetadata } = metadata;
    const savedContent = {
      text: body, status: "draft", images: type === "article" ? images : [], ...cleanMetadata,
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
    setTitle("");
    setBody("");
    setImages([]);
    setEditingId("");
    setEditingMetadata({});
    localStorage.removeItem("qx_editor_autosave");
    setMessage(metadata.syncToServer ? "已保存，并同步这篇稿件" : "已保存到本地");
    if (metadata.syncToServer) await refresh();
    setTab("博客");
  }

  async function addProject() {
    if (!projectTitle.trim()) return;
    await queueItem("project", projectTitle.trim(), { description: "", cover: null });
    setProjectTitle("");
    await refresh(false);
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
    await selectItemsForSync(selectedForSync);
    await refresh();
    setSelectedForSync([]);
    setBatchSyncMode(false);
    setMessage(`已同步 ${count} 篇稿件`);
  }

  function editItem(item: any) {
    setEditingId(String(item.id));
    setTitle(String(item.payload.title || ""));
    setBody(String(item.payload.content?.text || ""));
    setImages(Array.isArray(item.payload.content?.images) ? item.payload.content.images : []);
    setCreationType(item.payload.itemType === "idea" ? "idea" : "article");
    setActiveProjectId(String(item.payload.projectId || item.payload.content?.projectId || ""));
    setEditingMetadata({ ...(item.payload.content || {}), _baseRevision: Number(item.revision || 0) });
    setTab("创作");
  }

  async function removeItem(item: any) {
    if (!window.confirm(`确定删除《${item.payload.title || "未命名稿件"}》吗？`)) return;
    deleteLocalItem(item);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setSelectedForSync((current) => current.filter((id) => id !== item.id));
    setMessage("稿件已从当前设备删除，服务器内容未改动");
  }

  function goToMainTab(next: Tab) {
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
    {(["项目", "创作", "博客", "设置"] as Tab[]).map((name) =>
      <button className={tab === name ? "active" : ""} key={name} onClick={() => goToMainTab(name)}>{name}</button>)}
  </nav>;
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
    onWrite={() => {
      setActiveProjectId(String(openProject.id));
      setOpenProject(null);
      setTab("创作");
    }} onUpdated={(nextTitle, content) => {
      setItems((current) => current.map((item) => item.id === openProject.id ? {
        ...item, payload: { ...item.payload, title: nextTitle, content },
      } : item));
      setOpenProject((current: any) => current ? {
        ...current, payload: { ...current.payload, title: nextTitle, content },
      } : current);
    }} />);
  if (websiteItem || showWebsiteSettings) return pageWithNavigation(<WebsitePublish item={websiteItem}
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
  if (tab === "创作") return <ArticleEditor
    title={title}
    body={body}
    images={images}
    onTitle={setTitle}
    onBody={setBody}
    onImages={setImages}
    onBack={() => setTab("项目")}
    projects={projects}
    creationType={creationType}
    onCreationType={setCreationType}
    onNavigate={setTab}
    initialProjectId={activeProjectId}
    initialMetadata={editingMetadata}
    autoSavedAt={autoSavedAt}
    onSave={(metadata) => void save(creationType, metadata)}
  />;

  return (
    <main className="real-app">
      <header>
        <div><b>情晓录</b><span>{connected ? "情晓录云端已连接" : "尚未连接情晓录云端"}</span></div>
        <button onClick={() => connected ? void refresh() : setShowLogin(true)}>{loading ? "同步中…" : "同步"}</button>
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

        {tab === "博客" && <>
          <h1>我的博客</h1>
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
          </div>
          {!batchSyncMode ? <div className="batch-sync-entry">
            <button onClick={() => setBatchSyncMode(true)}>批量同步</button>
            <button onClick={() => setShowAiProjectPicker(true)}>AI 联动</button>
          </div> : <div className="batch-sync-bar">
            <button className="plain" onClick={() => {
              const ids = [...articles, ...ideas].map((item) => item.id);
              setSelectedForSync(selectedForSync.length === ids.length ? [] : ids);
            }}>{selectedForSync.length === articles.length + ideas.length ? "取消全选" : "全选"}</button>
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
                <header><span className="blog-avatar">晓</span><div><b>littlehou</b>
                  <small>{item.payload.itemType === "idea" ? "灵感" :
                    item.payload.content?.imported ? item.payload.content?.sourceLabel || "历史导入" : "稿件"}</small></div></header>
                {!!item.payload.title && <h2>{item.payload.title}</h2>}
                {!!item.payload.content?.text && <p>{item.payload.content.text}</p>}
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
          <h2 className="setting-title">工具</h2>
          <button className="tool-entry" onClick={() => setShowImport(true)}>
            <span><b>历史导入</b><small>微博、QQ 空间、朋友圈、一言</small></span><i>›</i>
          </button>
          <div className="setting-row"><span>同步服务器</span><b>poem.timelordtty.cn</b></div>
          <button className="tool-entry" onClick={() => setShowWebsiteSettings(true)}>
            <span><b>指定网站接口</b><small>登录 LovePoem，上传允许公开的稿件</small></span><i>›</i>
          </button>
          <button className="tool-entry" onClick={() => setShowTrash(true)}>
            <span><b>本地回收站</b><small>恢复或永久删除当前设备上的稿件</small></span><i>›</i>
          </button>
          <button className="disconnect" onClick={() => { disconnectSync(); setConnected(false); setShowLogin(true); }}>
            断开并重新登录
          </button>
        </>}
      </section>

      <nav>{(["项目", "创作", "博客", "设置"] as Tab[]).map((name) =>
        <button className={tab === name ? "active" : ""} key={name} onClick={() => setTab(name)}>{name}</button>)}</nav>

      {showLogin && <div className="sync-login-mask"><div className="sync-login-card">
        <h2>连接服务器</h2><p>使用 Poem 账户登录，数据将保存到服务器。</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="账户" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="密码" />
        {message && <small>{message}</small>}
        <div>{connected && <button onClick={() => setShowLogin(false)}>关闭</button>}
          <button className="primary" onClick={() => void connect()}>登录并连接</button></div>
      </div></div>}
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
  const dirty = Boolean(title.trim() || body.trim() || images.length);
  const selectedProject = projects.find((project) => String(project.id) === String(projectId));
  const projectChapters = Array.isArray(selectedProject?.payload?.content?.chapters)
    ? selectedProject.payload.content.chapters : [];

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
    const encoded = await Promise.all(accepted.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));
    onImages([...images, ...encoded].slice(0, 9));
  }

  return (
    <main className="article-editor qzone-editor">
      <header>
        <button className="editor-cancel" onClick={onBack}>取消</button>
        <div><b>{creationType === "article" ? "发表新稿件" : "记录新灵感"}</b></div>
        <button className="editor-publish" disabled={!dirty}
          onClick={() => onSave({
            visibility,
            tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
            projectId,
            chapterId: chapterId || undefined,
            syncToServer,
            shareTargets,
            publicationState,
          })}>保存</button>
      </header>

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
        {documentMode && <>
          <input className="document-title" value={title} onChange={(event) => onTitle(event.target.value)}
            placeholder="文档标题" maxLength={100} />
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
        <textarea ref={editor} value={body} onChange={(event) => onBody(event.target.value)}
          placeholder={documentMode ? "开始编辑文档正文……" : "这一刻，想写点什么……"} autoFocus />
        {!!images.length && <div className="qzone-images compact">{images.map((image, index) =>
          <figure key={`${image.slice(-16)}-${index}`}><img src={image} alt={`插图 ${index + 1}`} referrerPolicy="no-referrer" />
            <button onClick={() => onImages(images.filter((_, at) => at !== index))}>×</button></figure>)}
        </div>}
        <input ref={imagePicker} hidden multiple type="file" accept="image/*"
          onChange={(event) => void addImages(Array.from(event.target.files || []))} />
      </section>

      <section className="publish-options">
        <button onClick={() => imagePicker.current?.click()}><span>加入照片</span>
          <em>{images.length ? `已选 ${images.length} 张　›` : "选择照片　›"}</em></button>
        <label><span>标题</span><input value={title} onChange={(event) => onTitle(event.target.value)}
          placeholder="选填，长文建议填写" maxLength={100} /></label>
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
        <button onClick={() => setVisibility(visibility === "qingxiaolu" ? "public" : "qingxiaolu")}>
          <span>可见范围</span><em>{visibility === "public" ? "允许公开发布" : "仅情晓录可见"}　›</em>
        </button>
        <button onClick={() => setPublicationState(publicationState === "editing" ? "ready" : "editing")}>
          <span>稿件状态</span><em>{publicationState === "ready" ? "可发布" : "待编辑"}　›</em>
        </button>
        <button onClick={() => setDocumentMode(true)}><span>更多编辑</span><em>Word 文档式编辑　›</em></button>
        <div className="draft-sync-options">
          <h3>同步</h3>
          <label className="server-sync-choice">
            <span>同步这篇稿件到服务器</span>
            <input type="checkbox" checked={syncToServer}
              onChange={(event) => setSyncToServer(event.target.checked)} />
          </label>
          <p>只影响当前稿件，未勾选时仅保存到本地。</p>
          <h3>转到其他 App 的草稿框</h3>
          <div className="share-target-grid">
            {["QQ说说", "微信朋友圈", "一言", "微博"].map((target) =>
              <label key={target}><input type="checkbox" checked={shareTargets.includes(target)}
                onChange={(event) => setShareTargets((current) => event.target.checked
                  ? [...current, target] : current.filter((name) => name !== target))} />{target}</label>)}
          </div>
          <p>保存后从稿件的“转发”打开目标 App；正文同时复制，便于放入草稿框。</p>
        </div>
      </section>

      <div className="compose-status"><span>{body.replace(/\s/g, "").length} 字</span>
        <span>{autoSavedAt ? `已自动保存 ${new Date(autoSavedAt).toLocaleTimeString([], {
          hour: "2-digit", minute: "2-digit",
        })}` : syncToServer ? "此稿件将同步" : "仅保存到本地"}</span></div>
      <nav className="editor-main-nav">
        {(["项目", "创作", "博客", "设置"] as Tab[]).map((name) =>
          <button className={name === "创作" ? "active" : ""} key={name} onClick={() => onNavigate(name)}>{name}</button>)}
      </nav>
    </main>
  );
}
