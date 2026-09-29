import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Share } from "@capacitor/share";
import { queueItem } from "./sync";

export type ProjectWorkspaceData = {
  type: string;
  description: string;
  cover: string;
  tags: string;
  characters: string;
  world: string;
  outline: string;
  plot: string;
  timeline: string;
  privateNotes: string;
  characterCards: Array<{ id: string; name: string; role: string; description: string }>;
  chapters: Array<{ id: string; title: string; summary: string; status: string }>;
  timelineEvents: Array<{ id: string; time: string; title: string; detail: string }>;
  archived: boolean;
  aiEndpoint: string;
  aiModel: string;
  aiKey: string;
};

const emptyData: ProjectWorkspaceData = {
  type: "小说",
  description: "",
  cover: "",
  tags: "",
  characters: "",
  world: "",
  outline: "",
  plot: "",
  timeline: "",
  privateNotes: "",
  characterCards: [],
  chapters: [],
  timelineEvents: [],
  archived: false,
  aiEndpoint: "https://api.openai.com/v1",
  aiModel: "gpt-4.1-mini",
  aiKey: "",
};

function load(projectId: string, fallback: Partial<ProjectWorkspaceData> = {}): ProjectWorkspaceData {
  const all = JSON.parse(localStorage.getItem("qx_project_workspaces") || "{}");
  return { ...emptyData, ...fallback, ...(all[projectId] || {}) };
}

function save(projectId: string, data: ProjectWorkspaceData) {
  const all = JSON.parse(localStorage.getItem("qx_project_workspaces") || "{}");
  all[projectId] = data;
  localStorage.setItem("qx_project_workspaces", JSON.stringify(all));
}

export function appendProjectImport(projectId: string, category: string, title: string, text: string) {
  const data = load(projectId);
  if (category === "人物") {
    data.characterCards.push({ id: crypto.randomUUID(), name: title, role: "导入资料", description: text });
  } else if (category === "大纲") {
    data.chapters.push({ id: crypto.randomUUID(), title, summary: text, status: "待修改" });
  } else if (category === "时间轴") {
    data.timelineEvents.push({ id: crypto.randomUUID(), time: "", title, detail: text });
  } else if (category === "背景") {
    data.world = `${data.world}${data.world ? "\n\n" : ""}## ${title}\n${text}`;
  } else {
    data.privateNotes = `${data.privateNotes}${data.privateNotes ? "\n\n" : ""}## ${title}\n${text}`;
  }
  save(projectId, data);
}

function packageText(title: string, data: ProjectWorkspaceData) {
  return `# ${title}

## 项目类型
${data.type}

## 简介
${data.description || "未填写"}

## 标签
${data.tags || "未填写"}

## 人物设定
${data.characters || "未填写"}
${data.characterCards.map((item) => `### ${item.name || "未命名人物"}\n身份：${item.role}\n${item.description}`).join("\n\n")}

## 世界观与背景
${data.world || "未填写"}

## 大纲
${data.outline || "未填写"}
${data.chapters.map((item, index) => `${index + 1}. ${item.title}（${item.status}）\n${item.summary}`).join("\n")}

## 情节与伏笔
${data.plot || "未填写"}

## 小说时间轴
${data.timeline || "未填写"}
${data.timelineEvents.map((item) => `- ${item.time}｜${item.title}：${item.detail}`).join("\n")}

## 私密创作备注
${data.privateNotes || "未填写"}
`;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function xmlEscape(text: string) {
  return text.replace(/[<>&"']/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;",
  }[char] || char));
}

export default function ProjectWorkspace({
  project,
  articles = [],
  discussions = [],
  initialSection = "项目",
  onEditArticle,
  close,
  onWrite,
  onUpdated,
}: {
  project: any;
  articles?: any[];
  discussions?: any[];
  initialSection?: string;
  onEditArticle?: (article: any) => void;
  close: () => void;
  onWrite: () => void;
  onUpdated?: (title: string, content: Record<string, unknown>) => void;
}) {
  const projectId = String(project.id);
  const [title, setTitle] = useState(String(
    project.payload?.title || project.payload?.content?.title || project.title || "未命名项目",
  ));
  const [data, setData] = useState(() => load(projectId, project.payload.content || {}));
  const [section, setSection] = useState(initialSection);
  const [editingMaterial, setEditingMaterial] = useState<Record<string, boolean>>({});
  const [readerChapter, setReaderChapter] = useState(0);
  const [readerPanel, setReaderPanel] = useState<"目录" | "设置" | null>(null);
  const [readerFontSize, setReaderFontSize] = useState(18);
  const [readerTheme, setReaderTheme] = useState<"paper" | "green" | "night">("paper");
  const [syncProject, setSyncProject] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; mobile: boolean } | null>(null);
  const [projectDirectory, setProjectDirectory] = useState<any>(null);
  const [projectDirectoryName, setProjectDirectoryName] = useState("");
  const [rootDirectoryName, setRootDirectoryName] = useState("");
  const coverInput = useRef<HTMLInputElement>(null);

  const markdown = useMemo(() => packageText(title, data), [title, data]);
  const chapterArticles = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const article of articles) {
      const chapterId = String(article.payload?.content?.chapterId || "");
      if (!chapterId) continue;
      groups.set(chapterId, [...(groups.get(chapterId) || []), article]);
    }
    return groups;
  }, [articles]);
  const articleWordCount = useMemo(() => articles.reduce((total, article) =>
    total + String(article.payload?.content?.text || "").replace(/\s/g, "").length, 0), [articles]);
  const completedChapters = data.chapters.filter((chapter) => chapter.status === "已完成").length;
  const wordHtml = useMemo(() =>
    `<html><head><meta charset="utf-8"><title>${xmlEscape(title)}</title></head><body>${markdown.split("\n").map((line) =>
      line.startsWith("# ") ? `<h1>${line.slice(2)}</h1>` :
        line.startsWith("## ") ? `<h2>${line.slice(3)}</h2>` :
          line.startsWith("### ") ? `<h3>${line.slice(4)}</h3>` : `<p>${line || "&nbsp;"}</p>`).join("")}</body></html>`,
  [markdown, title]);
  const patch = (next: Partial<ProjectWorkspaceData>) => setData((current) => ({ ...current, ...next }));

  async function persist() {
    save(projectId, data);
    const { aiKey, ...syncData } = data;
    await queueItem("project", title, syncData, undefined, syncProject, projectId, Number(project.revision || 0));
    onUpdated?.(title, syncData);
    setMessage(syncProject ? "项目资料已保存并同步" : "项目资料已保存到本地");
  }

  async function writeFile(directory: any, name: string, content: string, type = "text/markdown;charset=utf-8") {
    const fileHandle = await directory.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([content], { type }));
    await writable.close();
  }

  function safeFileName(name: string, fallback: string) {
    return (name || fallback).replace(/[\\/:*?"<>|]/g, "_");
  }

  async function rememberDirectory(handle: any) {
    const request = indexedDB.open("qingxiaolu-folders", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("projects");
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const transaction = request.result.transaction("projects", "readwrite");
        transaction.objectStore("projects").put(handle, "qingxiaolu-root");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  useEffect(() => {
    const request = indexedDB.open("qingxiaolu-folders", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("projects");
    request.onsuccess = () => {
      const get = request.result.transaction("projects").objectStore("projects").get("qingxiaolu-root");
      get.onsuccess = async () => {
        const root = get.result;
        if (root && await root.queryPermission?.({ mode: "readwrite" }) === "granted") {
          const projectFolderName = safeFileName(title, "未命名项目");
          const projectFolder = await root.getDirectoryHandle(projectFolderName, { create: true });
          setProjectDirectory(projectFolder);
          setRootDirectoryName(root.name || "情晓录");
          setProjectDirectoryName(projectFolderName);
        }
      };
    };
  }, [projectId, title]);

  async function chooseProjectDirectory() {
    const picker = (window as any).showDirectoryPicker;
    if (!picker) {
      return setMessage("当前环境不支持本地文件夹同步，请在电脑 Edge 或 Chrome 中使用");
    }
    try {
      const root = await picker({ mode: "readwrite" });
      const projectFolderName = safeFileName(title, "未命名项目");
      const projectFolder = await root.getDirectoryHandle(projectFolderName, { create: true });
      setProjectDirectory(projectFolder);
      setRootDirectoryName(root.name || "情晓录");
      setProjectDirectoryName(projectFolderName);
      await rememberDirectory(root);
      setMessage(`已关联情晓录总文件夹“${root.name}”`);
    } catch (error: any) {
      if (error?.name !== "AbortError") setMessage("无法关联所选文件夹");
    }
  }

  async function ensureDirectoryPermission() {
    if (!projectDirectory) return false;
    const permission = await projectDirectory.queryPermission?.({ mode: "readwrite" });
    if (permission === "granted") return true;
    return await projectDirectory.requestPermission?.({ mode: "readwrite" }) === "granted";
  }

  async function syncAppToLocal() {
    if (!projectDirectory) return void chooseProjectDirectory();
    if (!await ensureDirectoryPermission()) return setMessage("未获得文件夹读写权限");
    await writeFile(projectDirectory, "项目信息.md",
      `# ${title}\n\n类型：${data.type}\n\n标签：${data.tags}\n\n${data.description}`);
    await writeFile(projectDirectory, "世界观.md", `# 世界观\n\n${data.world}`);
    await writeFile(projectDirectory, "情节.md", `# 情节\n\n${data.plot}`);
    await writeFile(projectDirectory, "项目全文.doc", wordHtml, "application/msword;charset=utf-8");

    const characterDirectory = await projectDirectory.getDirectoryHandle("人物", { create: true });
    for (const card of data.characterCards) await writeFile(characterDirectory,
      `${safeFileName(card.name, "未命名人物")}.md`, `# ${card.name}\n\n身份：${card.role}\n\n${card.description}`);
    const outlineDirectory = await projectDirectory.getDirectoryHandle("大纲", { create: true });
    for (const [index, chapter] of data.chapters.entries()) await writeFile(outlineDirectory,
      `${String(index + 1).padStart(3, "0")}-${safeFileName(chapter.title, "未命名章节")}.md`,
      `# ${chapter.title}\n\n状态：${chapter.status}\n\n${chapter.summary}`);
    const timelineDirectory = await projectDirectory.getDirectoryHandle("时间轴", { create: true });
    for (const [index, event] of data.timelineEvents.entries()) await writeFile(timelineDirectory,
      `${String(index + 1).padStart(3, "0")}-${safeFileName(event.title, "未命名事件")}.md`,
      `# ${event.title}\n\n时间：${event.time}\n\n${event.detail}`);
    const articleDirectory = await projectDirectory.getDirectoryHandle("正文", { create: true });
    for (const article of articles) await writeFile(articleDirectory,
      `${article.id}--${safeFileName(article.payload?.title, "未命名稿件")}.md`,
      `# ${article.payload?.title || "未命名稿件"}\n\n章节ID：${article.payload?.content?.chapterId || ""}\n\n${article.payload?.content?.text || ""}`);
    const discussionDirectory = await projectDirectory.getDirectoryHandle("AI讨论", { create: true });
    for (const discussion of discussions) await writeFile(discussionDirectory,
      `${discussion.id}--${safeFileName(discussion.payload?.title, "未命名讨论")}.md`,
      `# ${discussion.payload?.title || "未命名讨论"}\n\n来源链接：${discussion.payload?.content?.sourceUrl || ""}\n\n${discussion.payload?.content?.text || ""}`);
    setMessage(`已从 App 同步到“${rootDirectoryName}\\${projectDirectoryName}”`);
  }

  async function readTextFile(directory: any, name: string) {
    try { return await (await directory.getFileHandle(name)).getFile().then((file: File) => file.text()); }
    catch { return ""; }
  }

  async function markdownFiles(directoryName: string) {
    const result: Array<{ name: string; text: string }> = [];
    try {
      const directory = await projectDirectory.getDirectoryHandle(directoryName);
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind === "file" && name.toLowerCase().endsWith(".md")) {
          result.push({ name, text: await (await handle.getFile()).text() });
        }
      }
    } catch { /* 文件夹不存在时保留当前数据 */ }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function syncLocalToApp() {
    if (!projectDirectory) return void chooseProjectDirectory();
    if (!await ensureDirectoryPermission()) return setMessage("未获得文件夹读写权限");
    const world = await readTextFile(projectDirectory, "世界观.md");
    const plot = await readTextFile(projectDirectory, "情节.md");
    const characterFiles = await markdownFiles("人物");
    const chapterFiles = await markdownFiles("大纲");
    const timelineFiles = await markdownFiles("时间轴");
    const articleFiles = await markdownFiles("正文");
    const discussionFiles = await markdownFiles("AI讨论");
    const stripHeading = (text: string) => text.replace(/^# .*\r?\n+/, "");
    const field = (text: string, label: string) => {
      const match = text.match(new RegExp(`${label}：([^\\n\\r]*)`));
      return match?.[1]?.trim() || "";
    };
    const next: ProjectWorkspaceData = {
      ...data,
      world: world ? stripHeading(world).trim() : data.world,
      plot: plot ? stripHeading(plot).trim() : data.plot,
      characterCards: characterFiles.length ? characterFiles.map((file) => ({
        id: crypto.randomUUID(),
        name: file.text.match(/^# (.*)$/m)?.[1]?.trim() || file.name.replace(/\.md$/i, ""),
        role: field(file.text, "身份"),
        description: stripHeading(file.text).replace(/^身份：[^\n\r]*\r?\n+/, "").trim(),
      })) : data.characterCards,
      chapters: chapterFiles.length ? chapterFiles.map((file) => ({
        id: crypto.randomUUID(),
        title: file.text.match(/^# (.*)$/m)?.[1]?.trim() || file.name.replace(/^\d+-/, "").replace(/\.md$/i, ""),
        status: field(file.text, "状态") || "待修改",
        summary: stripHeading(file.text).replace(/^状态：[^\n\r]*\r?\n+/, "").trim(),
      })) : data.chapters,
      timelineEvents: timelineFiles.length ? timelineFiles.map((file) => ({
        id: crypto.randomUUID(),
        title: file.text.match(/^# (.*)$/m)?.[1]?.trim() || file.name.replace(/^\d+-/, "").replace(/\.md$/i, ""),
        time: field(file.text, "时间"),
        detail: stripHeading(file.text).replace(/^时间：[^\n\r]*\r?\n+/, "").trim(),
      })) : data.timelineEvents,
    };
    setData(next);
    save(projectId, next);
    const { aiKey, ...syncData } = next;
    await queueItem("project", title, syncData, undefined, false, projectId);
    for (const file of articleFiles) {
      const articleId = file.name.includes("--") ? file.name.split("--")[0] : crypto.randomUUID();
      const articleTitle = file.text.match(/^# (.*)$/m)?.[1]?.trim() || file.name.replace(/\.md$/i, "");
      await queueItem("article", articleTitle, {
        text: stripHeading(file.text).replace(/^章节ID：[^\n\r]*\r?\n+/, "").trim(),
        projectId, chapterId: field(file.text, "章节ID") || undefined,
        visibility: "qingxiaolu", publicationState: "editing",
      }, projectId, false, articleId);
    }
    for (const file of discussionFiles) {
      const discussionId = file.name.includes("--") ? file.name.split("--")[0] : crypto.randomUUID();
      const discussionTitle = file.text.match(/^# (.*)$/m)?.[1]?.trim() || file.name.replace(/\.md$/i, "");
      await queueItem("article", discussionTitle, {
        text: stripHeading(file.text).replace(/^来源链接：[^\n\r]*\r?\n+/, "").trim(),
        projectId, sourceLabel: "ChatGPT", sourceUrl: field(file.text, "来源链接"),
        imported: true, visibility: "qingxiaolu", publicationState: "editing",
      }, projectId, false, discussionId);
    }
    onUpdated?.(title, syncData);
    setMessage(`已从“${rootDirectoryName}\\${projectDirectoryName}”同步到 App，未上传服务器`);
  }

  async function setCover(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => patch({ cover: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function sharePackage(target: string) {
    await navigator.clipboard?.writeText(markdown).catch(() => undefined);
    await Share.share({ title: `${title}设定包`, text: markdown, dialogTitle: `发送到 ${target}` });
  }

  useEffect(() => {
    const updateSelection = () => {
      const text = window.getSelection()?.toString().trim() || "";
      if (!text) return;
      setSelectedText(text);
      if (window.matchMedia("(max-width: 700px)").matches) {
        setSelectionMenu({ x: 0, y: 0, mobile: true });
      }
    };
    document.addEventListener("selectionchange", updateSelection);
    return () => document.removeEventListener("selectionchange", updateSelection);
  }, []);

  function openSelectionMenu(event: MouseEvent<HTMLElement>) {
    const text = window.getSelection()?.toString().trim() || "";
    if (!text) return;
    event.preventDefault();
    setSelectedText(text);
    setSelectionMenu({ x: event.clientX, y: event.clientY, mobile: false });
  }

  async function copySelection() {
    await navigator.clipboard?.writeText(selectedText);
    setMessage("已复制选中文字");
    setSelectionMenu(null);
  }

  async function sendSelectionToChatGpt() {
    await navigator.clipboard?.writeText(selectedText).catch(() => undefined);
    const opened = window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    if (!opened) await Share.share({ title: `${title}选段`, text: selectedText, dialogTitle: "发送选中文字" });
    setMessage("选中文字已复制并打开 ChatGPT");
    setSelectionMenu(null);
  }

  const textSections: Record<string, [keyof ProjectWorkspaceData, string]> = {
    世界观: ["world", "记录时代、地点、规则、组织、力量体系和背景历史……"],
    情节: ["plot", "记录主线、支线、冲突、伏笔及回收方式……"],
    私密: ["privateNotes", "仅用于自己的创作备注……"],
  };

  return <main className="project-workspace" onContextMenu={openSelectionMenu}
    onClick={(event) => {
      if (selectionMenu && !(event.target as HTMLElement).closest(".selection-action-menu")) setSelectionMenu(null);
    }}>
    <header><button onClick={close}>‹ 返回</button><div><b>{title}</b><span>{data.type}项目</span></div>
      <button className="save-project" onClick={() => void persist()}>保存</button></header>
    {message && <div className="real-message">{message}</div>}
    <nav className="project-section-tabs">
      {["项目", "正文", "人物", "世界观", "大纲", "情节", "时间轴", "AI 讨论", "私密", "导出"].map((name) =>
        <button className={section === name ? "active" : ""} key={name} onClick={() => setSection(name)}>{name}</button>)}
    </nav>
    <section className="project-workspace-body">
      {section === "项目" && <div className="project-home">
        <div className="project-overview-summary">
          <article><b>{articleWordCount.toLocaleString()}</b><span>正文总字数</span></article>
          <article><b>{articles.length}</b><span>稿件</span></article>
          <article><b>{completedChapters}/{data.chapters.length}</b><span>完成章节</span></article>
          <article><b>{data.timelineEvents.length}</b><span>时间轴事件</span></article>
        </div>
        <div className="project-quick-actions">
          <button onClick={onWrite}>继续写作</button>
          <button onClick={() => setSection("正文")}>查看正文</button>
          <button onClick={() => setSection("大纲")}>阅读大纲</button>
          <button onClick={() => setSection("AI 讨论")}>AI讨论</button>
        </div>
        {!!articles.length && <div className="project-recent-writing"><div><small>最近写作</small><h2>{
          articles[0]?.payload?.title || "未命名稿件"
        }</h2><p>{String(articles[0]?.payload?.content?.text || "").slice(0, 120)}</p></div>
          <button onClick={() => onEditArticle?.(articles[0])}>继续编辑</button></div>}
        <div className="project-profile">
        <button className="project-cover-editor" onClick={() => coverInput.current?.click()}>
          {data.cover ? <img src={data.cover} alt="项目封面" /> : <span>＋<small>添加封面</small></span>}
        </button>
        <input ref={coverInput} hidden type="file" accept="image/*"
          onChange={(event) => void setCover(event.target.files?.[0])} />
        <div>
          <label>项目名称<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>项目类型<select value={data.type} onChange={(event) => patch({ type: event.target.value })}>
            {["小说", "随笔日记", "诗歌", "读书札记", "自定义"].map((name) => <option key={name}>{name}</option>)}
          </select></label>
          <label>项目简介<textarea value={data.description}
            onChange={(event) => patch({ description: event.target.value })} /></label>
          <label>分类与标签<input value={data.tags} placeholder="原创、同人、悬疑……"
            onChange={(event) => patch({ tags: event.target.value })} /></label>
          <label className="project-sync-choice"><span>同步本项目资料到服务器</span>
            <input type="checkbox" checked={syncProject} onChange={(event) => setSyncProject(event.target.checked)} /></label>
          <label className="project-sync-choice"><span>归档项目</span>
            <input type="checkbox" checked={data.archived}
              onChange={(event) => patch({ archived: event.target.checked })} /></label>
          <button className="primary-project-action" onClick={onWrite}>在此项目中写稿</button>
        </div>
        </div>
      </div>}
      {section === "正文" && <div className="project-article-library">
        <div className="project-article-library-head">
          <div><small>项目正文</small><h1>{title}</h1></div>
          <button onClick={onWrite}>写新稿件</button>
        </div>
        <div className="project-article-list">
          {articles.length ? [...articles].sort((a, b) => Number(b.seq || 0) - Number(a.seq || 0)).map((article) => {
            const content = article.payload?.content || {};
            const chapterIndex = data.chapters.findIndex((item) => item.id === String(content.chapterId || ""));
            const chapter = chapterIndex >= 0 ? data.chapters[chapterIndex] : undefined;
            const text = String(content.content || content.text || "");
            return <article key={article.id}>
              <div>
                <small>{chapter ? `第 ${chapterIndex + 1} 章 · ${chapter.title || "未命名章节"}` : "未归入章节"}</small>
                <h2>{article.payload?.title || article.title || "无标题稿件"}</h2>
                <p>{text.trim() || "这篇稿件还没有正文。"}</p>
              </div>
              <button onClick={() => onEditArticle?.(article)}>打开编辑</button>
            </article>;
          }) : <div className="project-article-empty">
            <p>这个项目还没有正文。</p><button onClick={onWrite}>写第一篇</button>
          </div>}
        </div>
      </div>}
      {textSections[section] && (section !== "情节" || editingMaterial.情节) && <div className="project-material-editor">
        <div className="material-reader-head"><h1>{section}</h1>
          {section === "情节" && <button onClick={() =>
            setEditingMaterial((current) => ({ ...current, 情节: false }))}>完成编辑</button>}
        </div>
        <textarea value={String(data[textSections[section][0]])}
          placeholder={textSections[section][1]}
          onChange={(event) => patch({ [textSections[section][0]]: event.target.value })} />
      </div>}
      {section === "情节" && !editingMaterial.情节 && <div className="novel-material-reader">
        <div className={`book-reader theme-${readerTheme}`} style={{ "--reader-font-size": `${readerFontSize}px` } as CSSProperties}>
          <header className="book-reader-top"><button onClick={() => setSection("项目")}>‹</button>
            <span>{title}</span><button onClick={() =>
              setEditingMaterial((current) => ({ ...current, 情节: true }))}>编辑</button></header>
          <article className="book-reader-page">
            <small>情节与伏笔</small><h1>{title}</h1>
            {data.plot.trim() ? data.plot.split(/\n{2,}/).map((paragraph, index) =>
              <p key={index}>{paragraph}</p>) : <p className="reader-empty">还没有情节内容。</p>}
          </article>
          <footer className="book-reader-bottom">
            <span>情节梳理</span>
            <button onClick={() => setReaderPanel(readerPanel === "设置" ? null : "设置")}>Aa</button>
          </footer>
          {readerPanel === "设置" && <ReaderSettings fontSize={readerFontSize} theme={readerTheme}
            onFontSize={setReaderFontSize} onTheme={setReaderTheme} />}
        </div>
      </div>}
      {section === "人物" && <StructuredEditor title="人物卡"
        addLabel="新增人物" onAdd={() => patch({ characterCards: [...data.characterCards, {
          id: crypto.randomUUID(), name: "", role: "", description: "",
        }] })}>
        {data.characterCards.map((card, index) => <article className="structured-card" key={card.id}>
          <input value={card.name} placeholder="人物姓名" onChange={(event) => {
            const next = [...data.characterCards]; next[index] = { ...card, name: event.target.value };
            patch({ characterCards: next });
          }} />
          <input value={card.role} placeholder="身份 / 阵营 / 关系" onChange={(event) => {
            const next = [...data.characterCards]; next[index] = { ...card, role: event.target.value };
            patch({ characterCards: next });
          }} />
          <textarea value={card.description} placeholder="性格、目标、秘密、说话方式和人物弧光……"
            onChange={(event) => {
              const next = [...data.characterCards]; next[index] = { ...card, description: event.target.value };
              patch({ characterCards: next });
            }} />
          <button className="remove-structured" onClick={() =>
            patch({ characterCards: data.characterCards.filter((item) => item.id !== card.id) })}>删除人物</button>
        </article>)}
      </StructuredEditor>}
      {section === "大纲" && !editingMaterial.大纲 && <div className="novel-material-reader outline-reader">
        <div className={`book-reader theme-${readerTheme}`} style={{ "--reader-font-size": `${readerFontSize}px` } as CSSProperties}>
          <header className="book-reader-top"><button onClick={() => setSection("项目")}>‹</button>
            <span>{title}</span><button onClick={() =>
              setEditingMaterial((current) => ({ ...current, 大纲: true }))}>编辑</button></header>
          {data.chapters.length ? <article className="book-reader-page">
            <small>第 {readerChapter + 1} 章 · {data.chapters[readerChapter]?.status}</small>
            <h1>{data.chapters[readerChapter]?.title || "未命名章节"}</h1>
            {readerChapter === 0 && data.outline.trim() && <div className="book-introduction">
              {data.outline.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>}
            {(chapterArticles.get(data.chapters[readerChapter]?.id) || []).length ?
              (chapterArticles.get(data.chapters[readerChapter]?.id) || []).map((article) => <section
                className="reader-linked-article" key={article.id}>
                <h2>{article.payload.title}</h2>
                {String(article.payload.content?.text || "").split(/\n{2,}/).map((paragraph, index) =>
                  <p key={index}>{paragraph}</p>)}
              </section>) : <div className="reader-outline-fallback">
                <small>本章尚未关联正文，当前显示大纲摘要</small>
                {data.chapters[readerChapter]?.summary.split(/\n{2,}/).map((paragraph, index) =>
                  <p key={index}>{paragraph}</p>)}
              </div>}
          </article> : <article className="book-reader-page"><p className="reader-empty">还没有章节大纲。</p></article>}
          <div className="book-page-turn">
            <button disabled={readerChapter === 0} onClick={() => setReaderChapter((value) => Math.max(0, value - 1))}>上一章</button>
            <span>{data.chapters.length ? `${readerChapter + 1} / ${data.chapters.length}` : "0 / 0"}</span>
            <button disabled={!data.chapters.length || readerChapter === data.chapters.length - 1}
              onClick={() => setReaderChapter((value) => Math.min(data.chapters.length - 1, value + 1))}>下一章</button>
          </div>
          <footer className="book-reader-bottom">
            <button onClick={() => setReaderPanel(readerPanel === "目录" ? null : "目录")}>☰ 目录</button>
            <span>{data.chapters.length ? Math.round(((readerChapter + 1) / data.chapters.length) * 100) : 0}%</span>
            <button onClick={() => setReaderPanel(readerPanel === "设置" ? null : "设置")}>Aa 设置</button>
          </footer>
          {readerPanel === "目录" && <aside className="book-chapter-drawer">
            <header><b>目录</b><button onClick={() => setReaderPanel(null)}>×</button></header>
            {data.chapters.map((chapter, index) => <button className={readerChapter === index ? "active" : ""}
              key={chapter.id} onClick={() => { setReaderChapter(index); setReaderPanel(null); }}>
              <span>第 {index + 1} 章</span><b>{chapter.title || "未命名章节"}</b>
            </button>)}
          </aside>}
          {readerPanel === "设置" && <ReaderSettings fontSize={readerFontSize} theme={readerTheme}
            onFontSize={setReaderFontSize} onTheme={setReaderTheme} />}
        </div>
      </div>}
      {section === "大纲" && editingMaterial.大纲 && <StructuredEditor title="编辑章节大纲"
        addLabel="新增章节" onAdd={() => patch({ chapters: [...data.chapters, {
          id: crypto.randomUUID(), title: "", summary: "", status: "未开始",
        }] })}>
        <button className="finish-material-edit" onClick={() =>
          setEditingMaterial((current) => ({ ...current, 大纲: false }))}>完成编辑并阅读</button>
        {data.chapters.map((chapter, index) => <article className="structured-card chapter-card" key={chapter.id}>
          <input value={chapter.title} placeholder={`第 ${index + 1} 章标题`} onChange={(event) => {
            const next = [...data.chapters]; next[index] = { ...chapter, title: event.target.value };
            patch({ chapters: next });
          }} />
          <select value={chapter.status} onChange={(event) => {
            const next = [...data.chapters]; next[index] = { ...chapter, status: event.target.value };
            patch({ chapters: next });
          }}>{["未开始", "写作中", "已完成", "待修改"].map((name) => <option key={name}>{name}</option>)}</select>
          <textarea value={chapter.summary} placeholder="章节目标、场景、冲突和转折……" onChange={(event) => {
            const next = [...data.chapters]; next[index] = { ...chapter, summary: event.target.value };
            patch({ chapters: next });
          }} />
          <button className="remove-structured" onClick={() =>
            patch({ chapters: data.chapters.filter((item) => item.id !== chapter.id) })}>删除章节</button>
        </article>)}
      </StructuredEditor>}
      {section === "时间轴" && <div className="story-timeline">
        <div className="story-timeline-head"><div><small>项目设定</small><h1>故事时间轴</h1>
          <p>按故事内部发生顺序整理事件，与创作历史分开。</p></div>
          <button onClick={() => patch({ timelineEvents: [...data.timelineEvents, {
            id: crypto.randomUUID(), time: "", title: "", detail: "",
          }] })}>＋ 新增事件</button>
        </div>
        <div className="story-timeline-list">
          {data.timelineEvents.map((event, index) => <article key={event.id}>
            <div className="timeline-marker"><span>{index + 1}</span></div>
            <div className="timeline-event-content">
              <input className="timeline-time" value={event.time} placeholder="时间，如：星历42年 / 主角18岁"
                onChange={(change) => {
                  const next = [...data.timelineEvents]; next[index] = { ...event, time: change.target.value };
                  patch({ timelineEvents: next });
                }} />
              <input className="timeline-title" value={event.title} placeholder="事件名称" onChange={(change) => {
                const next = [...data.timelineEvents]; next[index] = { ...event, title: change.target.value };
                patch({ timelineEvents: next });
              }} />
              <textarea value={event.detail} placeholder="发生了什么、涉及人物、造成的影响、对应章节……"
                onChange={(change) => {
                  const next = [...data.timelineEvents]; next[index] = { ...event, detail: change.target.value };
                  patch({ timelineEvents: next });
                }} />
              <div className="timeline-event-actions">
                <button disabled={index === 0} onClick={() => {
                  const next = [...data.timelineEvents]; [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  patch({ timelineEvents: next });
                }}>上移</button>
                <button disabled={index === data.timelineEvents.length - 1} onClick={() => {
                  const next = [...data.timelineEvents]; [next[index + 1], next[index]] = [next[index], next[index + 1]];
                  patch({ timelineEvents: next });
                }}>下移</button>
                <button className="timeline-remove" onClick={() =>
                  patch({ timelineEvents: data.timelineEvents.filter((item) => item.id !== event.id) })}>删除</button>
              </div>
            </div>
          </article>)}
          {!data.timelineEvents.length && <div className="timeline-empty"><b>时间轴还是空的</b>
            <p>先添加故事中最早发生的一件事。</p></div>}
        </div>
      </div>}
      {section === "AI 讨论" && <div className="project-discussions">
        <div className="discussion-page-head"><div><small>ChatGPT 项目讨论</small><h1>{title}</h1></div>
          <span>{discussions.length} 条</span></div>
        {discussions.length ? [...discussions].sort((a, b) => Number(b.seq) - Number(a.seq)).map((item) =>
          <article key={item.id}>
            <header><div><b>{item.payload.title || "未命名讨论"}</b>
              <small>{item.payload.content?.category || "讨论记录"} · {
                item.payload.content?.importedAt
                  ? new Date(item.payload.content.importedAt).toLocaleString() : "已同步"
              }</small></div>
              {item.payload.content?.sourceUrl && <a href={item.payload.content.sourceUrl}
                target="_blank" rel="noreferrer">打开原讨论</a>}
            </header>
            <div className="discussion-transcript">{String(item.payload.content?.text || "").split(/\n{2,}/).map(
              (paragraph: string, index: number) => <p key={index}>{paragraph}</p>)}</div>
          </article>) : <div className="discussion-empty">
            <b>尚未导入 ChatGPT 讨论</b>
            <p>ChatGPT 里的原有讨论不会自动出现在这里。请在具体对话页面使用扩展并点击“确认同步”。</p>
          </div>}
      </div>}
      {section === "导出" && <div className="project-ai-panel">
        <h1>项目备份与导出</h1>
        <p>阅读时选中文字，电脑右键或手机长按即可复制、导出或发送；这里用于导出整个项目。</p>
        <div className="local-word-sync">
          <div><b>情晓录总文件夹</b><small>{projectDirectoryName
            ? `当前位置：${rootDirectoryName}\\${projectDirectoryName}`
            : "只需选择一次总文件夹，各项目自动建立独立子文件夹"}</small></div>
          <button onClick={() => void chooseProjectDirectory()}>
            {projectDirectoryName ? "更换总文件夹" : "关联总文件夹"}
          </button>
          <button disabled={!projectDirectory} onClick={() => void syncAppToLocal()}>从 App 同步到本地</button>
          <button disabled={!projectDirectory} onClick={() => void syncLocalToApp()}>从本地同步到 App</button>
        </div>
        <h2>导出项目设定</h2>
        <div className="project-export-actions">
          <button onClick={() => download(`${title}-设定包.md`, markdown, "text/markdown")}>Markdown</button>
          <button onClick={() => download(`${title}-设定包.json`,
            JSON.stringify({ project: title, ...data, aiKey: undefined }, null, 2), "application/json")}>JSON</button>
          <button onClick={() => download(`${title}-设定包.doc`, wordHtml, "application/msword")}>Word</button>
          <button onClick={() => download(`${title}-大纲.opml`,
            `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>${xmlEscape(title)}</title></head><body>` +
            `<outline text="${xmlEscape(title)}">${data.chapters.map((chapter) =>
              `<outline text="${xmlEscape(chapter.title || "未命名章节")}" _note="${xmlEscape(chapter.summary)}"/>`).join("")}` +
            `<outline text="时间轴">${data.timelineEvents.map((event) =>
              `<outline text="${xmlEscape(`${event.time} ${event.title}`.trim())}" _note="${xmlEscape(event.detail)}"/>`).join("")}</outline>` +
            `</outline></body></opml>`, "text/xml")}>OPML</button>
          <button onClick={() => void sharePackage("ChatGPT")}>发送到 ChatGPT</button>
          <button onClick={() => void sharePackage("Grok / 其他 AI")}>发送到 Grok</button>
        </div>
      </div>}
    </section>
    {selectionMenu && selectedText && <aside className={`selection-action-menu ${selectionMenu.mobile ? "mobile" : ""}`}
      style={selectionMenu.mobile ? undefined : { left: selectionMenu.x, top: selectionMenu.y }}>
      <header><b>已选择 {selectedText.length} 字</b><button onClick={() => setSelectionMenu(null)}>×</button></header>
      <p>{selectedText.slice(0, 90)}{selectedText.length > 90 ? "…" : ""}</p>
      <div>
        <button onClick={() => void copySelection()}>复制</button>
        <button onClick={() => { download(`${title}-选段.txt`, selectedText, "text/plain"); setSelectionMenu(null); }}>导出 TXT</button>
        <button onClick={() => { download(`${title}-选段.md`, `> ${selectedText.replace(/\n/g, "\n> ")}`, "text/markdown"); setSelectionMenu(null); }}>导出 Markdown</button>
        <button onClick={() => void sendSelectionToChatGpt()}>打开 ChatGPT</button>
        <button onClick={() => {
          void queueItem("idea", selectedText.slice(0, 20), { text: selectedText, projectId }, projectId);
          setMessage("选中文字已保存为灵感");
          setSelectionMenu(null);
        }}>保存为灵感</button>
      </div>
    </aside>}
  </main>;
}

function StructuredEditor({
  title, addLabel, onAdd, children,
}: {
  title: string; addLabel: string; onAdd: () => void; children: ReactNode;
}) {
  return <div className="structured-editor">
    <div className="structured-head"><h1>{title}</h1><button onClick={onAdd}>＋ {addLabel}</button></div>
    <div className="structured-list">{children}</div>
  </div>;
}

function ReaderSettings({
  fontSize, theme, onFontSize, onTheme,
}: {
  fontSize: number;
  theme: "paper" | "green" | "night";
  onFontSize: (size: number) => void;
  onTheme: (theme: "paper" | "green" | "night") => void;
}) {
  return <aside className="book-reader-settings">
    <div><span>字号</span><button onClick={() => onFontSize(Math.max(15, fontSize - 1))}>A−</button>
      <b>{fontSize}</b><button onClick={() => onFontSize(Math.min(24, fontSize + 1))}>A＋</button></div>
    <div><span>背景</span>
      <button className="theme-dot paper" aria-label="纸张" onClick={() => onTheme("paper")} />
      <button className="theme-dot green" aria-label="护眼" onClick={() => onTheme("green")} />
      <button className="theme-dot night" aria-label="夜间" onClick={() => onTheme("night")} />
    </div>
  </aside>;
}
