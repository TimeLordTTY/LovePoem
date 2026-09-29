const API = "https://poem.timelordtty.cn/qingxiaolu-api";
const $ = (id) => document.getElementById(id);
let conversation = null;
let projectChanges = new Map();

async function storedToken() {
  return (await chrome.storage.local.get("qingxiaoluToken")).qingxiaoluToken || "";
}

function showMessage(text) {
  $("message").textContent = text;
}

async function api(path, options = {}) {
  const token = await storedToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `请求失败（${response.status}）`);
  return response.json();
}

async function loadProjects() {
  let cursor = 0;
  const latest = new Map();
  let more = true;
  while (more) {
    const page = await api(`/v1/sync/pull?cursor=${cursor}&limit=500`);
    page.changes.forEach((change) => latest.set(change.id, change));
    cursor = page.nextCursor;
    more = page.hasMore;
  }
  const projects = [...latest.values()].filter((change) =>
    change.operation !== "delete" && change.payload?.itemType === "project");
  projectChanges = new Map(projects.map((change) => [change.id, change]));
  $("project").innerHTML = projects.map((change) =>
    `<option value="${change.id}">${escapeHtml(change.payload.title || "未命名项目")}</option>`).join("");
  $("login").hidden = true;
  $("sync").hidden = false;
}

function escapeHtml(text) {
  const node = document.createElement("span");
  node.textContent = String(text);
  return node.innerHTML;
}

async function readCurrentConversation() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("https://chatgpt.com/")) throw new Error("请先打开一个 ChatGPT 讨论页面");
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const messages = [...document.querySelectorAll("[data-message-author-role]")].map((node) => ({
        role: node.getAttribute("data-message-author-role"),
        text: (node.innerText || "").trim(),
      })).filter((item) => item.text);
      const title = document.title.replace(/\s*-\s*ChatGPT\s*$/i, "").trim();
      return { title, url: location.href, messages };
    },
  });
  if (!result?.messages?.length) throw new Error("当前页面没有读取到讨论，请先打开并滚动加载对话");
  conversation = result;
  $("title").value ||= result.title;
  const count = result.messages.length;
  $("preview").textContent = `已读取 ${count} 条消息：${result.messages.slice(-2).map((item) => item.text.slice(0, 70)).join(" / ")}`;
}

function conversationText() {
  const includeUser = $("includeUser").checked;
  return conversation.messages.filter((item) => includeUser || item.role !== "user")
    .map((item) => `${item.role === "user" ? "我" : "ChatGPT"}：\n${item.text}`).join("\n\n");
}

$("loginButton").addEventListener("click", async () => {
  showMessage("正在登录…");
  try {
    const result = await api("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: $("username").value.trim(), password: $("password").value }),
    });
    await chrome.storage.local.set({ qingxiaoluToken: result.token });
    $("password").value = "";
    await loadProjects();
    showMessage("已登录，登录状态已记住");
  } catch (error) { showMessage(error.message); }
});

$("previewButton").addEventListener("click", async () => {
  showMessage("正在读取当前讨论…");
  try { await readCurrentConversation(); showMessage("请确认项目和保存位置"); }
  catch (error) { showMessage(error.message); }
});

$("syncButton").addEventListener("click", async () => {
  try {
    if (!conversation) await readCurrentConversation();
    const id = crypto.randomUUID();
    const title = $("title").value.trim() || conversation.title || "ChatGPT 讨论";
    const category = $("category").value;
    const projectId = $("project").value;
    const text = conversationText();
    let change;
    if (category === "讨论记录") {
      change = {
        id, itemType: "article", projectId, title, baseRevision: 0,
        content: {
          text, status: "draft", visibility: "qingxiaolu",
          publicationState: "editing", imported: true, sourceLabel: "ChatGPT",
          sourceUrl: conversation.url, category, importedAt: new Date().toISOString(),
        },
      };
    } else {
      const current = projectChanges.get(projectId);
      if (!current) throw new Error("没有找到所选项目，请重新打开同步助手");
      const content = structuredClone(current.payload.content || {});
      const block = `## ${title}\n${text}`;
      if (category === "人物") {
        content.characterCards = [...(content.characterCards || []), {
          id: crypto.randomUUID(), name: title, role: "ChatGPT 讨论整理", description: text,
        }];
      } else if (category === "世界观") {
        content.world = `${content.world || ""}${content.world ? "\n\n" : ""}${block}`;
      } else if (category === "大纲") {
        content.chapters = [...(content.chapters || []), {
          id: crypto.randomUUID(), title, summary: text, status: "待修改",
        }];
      } else if (category === "情节") {
        content.plot = `${content.plot || ""}${content.plot ? "\n\n" : ""}${block}`;
      } else if (category === "时间轴") {
        content.timelineEvents = [...(content.timelineEvents || []), {
          id: crypto.randomUUID(), time: "", title, detail: text,
        }];
      }
      change = {
        id: projectId, itemType: "project", title: current.payload.title,
        content, baseRevision: current.revision,
      };
    }
    const discussionRecord = {
      id, itemType: "article", projectId, title, baseRevision: 0,
      content: {
        text, status: "draft", visibility: "qingxiaolu",
        publicationState: "editing", imported: true, sourceLabel: "ChatGPT",
        sourceUrl: conversation.url, category, importedAt: new Date().toISOString(),
      },
    };
    const changes = category === "讨论记录" ? [discussionRecord] : [change, discussionRecord];
    const result = await api("/v1/sync/push", {
      method: "POST",
      body: JSON.stringify({ deviceId: "chatgpt-browser-helper", changes }),
    });
    if (!result.applied?.length) throw new Error("服务器没有接受这次同步");
    showMessage("已同步到情晓录，打开 App 后点击同步即可看到");
  } catch (error) { showMessage(error.message); }
});

$("logoutButton").addEventListener("click", async () => {
  await chrome.storage.local.remove("qingxiaoluToken");
  $("sync").hidden = true;
  $("login").hidden = false;
  showMessage("已退出同步助手");
});

(async () => {
  if (await storedToken()) {
    try { await loadProjects(); showMessage("已恢复登录状态"); }
    catch { await chrome.storage.local.remove("qingxiaoluToken"); }
  }
})();
