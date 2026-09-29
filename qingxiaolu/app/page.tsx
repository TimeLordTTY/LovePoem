"use client";

import { useState, type ReactNode } from "react";
import { queueDraft } from "../mobile/sync";

type Tab = "项目" | "写作" | "资料" | "历史" | "同步" | "设置";
type Panel = "idea" | "publish" | "history" | "ai" | "timeline" | "media" | null;

const tabs: Tab[] = ["项目", "写作", "资料", "历史", "同步", "设置"];

const projectStats = [
  ["作品", "128 篇"],
  ["草稿", "24 篇"],
  ["灵感", "58 条"],
  ["资料", "36 份"],
];

const libraryItems = [
  { icon: "夹", label: "项目文件夹", count: "6 类", tone: "mint" },
  { icon: "纲", label: "大纲与提纲", count: "36 条", tone: "blue" },
  { icon: "摘", label: "摘录与札记", count: "42 条", tone: "gold" },
  { icon: "设", label: "设定与素材", count: "18 份", tone: "rose" },
  { icon: "时", label: "时间轴集", count: "24 节点", tone: "purple", action: "timeline" },
  { icon: "私", label: "私密文件夹", count: "5 条", tone: "black" },
];

const novelShelves = [
  { label: "原创", count: "4 部", tone: "purple" },
  { label: "同人", count: "3 部", tone: "blue" },
  { label: "古风", count: "8 篇", tone: "gold" },
  { label: "都市", count: "6 篇", tone: "rose" },
  { label: "悬疑", count: "5 篇", tone: "black" },
  { label: "自定义标签", count: "12 个", tone: "mint" },
];

const novelSets = [
  ["人物关系", "主角、配角、CP、阵营、出场记录"],
  ["世界观设定", "规则、地图、组织、历史、力量体系"],
  ["时间线", "主线事件、支线事件、章节节点"],
  ["同人设定", "原作来源、角色授权备注、私密草稿"],
  ["人物 AI 对话", "给角色绑定设定，通过接口和人物聊天"],
  ["设定导出", "一键导出给 Grok、ChatGPT、Claude 等工具"],
];

const aiConnectors = [
  ["人物对话接口", "选择角色卡、世界观和记忆范围，生成可对话 API 配置"],
  ["导出到 Grok", "人物、背景、时间线、写作规则提示词/JSON"],
  ["导出到 ChatGPT", "生成项目说明、角色卡、上下文和创作约束"],
  ["通用设定包", "Markdown、JSON、TXT，可给其他 AI 或网站接口使用"],
];

const linkedContext = [
  ["当前作品", "雨后札记 · 街角的潮湿气味", "已连接"],
  ["项目资料", "提纲、摘录、主题线、私密草稿", "可选择"],
  ["小说设定", "人物卡、世界观、同人设定、时间线", "按需连接"],
  ["回存位置", "草稿、新版本、设定补充、灵感碎片", "已设置"],
];

const historyPlatforms = [
  { logo: "微", name: "微博历史", desc: "按微博原发布时间放入历史", tone: "red", state: "需授权" },
  { logo: "Q", name: "QQ 空间历史", desc: "按 QQ 空间显示的发布时间放入历史", tone: "blue", state: "需手机权限" },
  { logo: "圈", name: "朋友圈历史", desc: "按朋友圈原发布时间放入历史", tone: "green", state: "需确认" },
  { logo: "言", name: "一言历史", desc: "按一言原发布时间放入历史", tone: "black", state: "需授权" },
];

const publishTargets = [
  { logo: "站", name: "指定网站", desc: "走接口，上传为网站草稿或正文", tone: "purple" },
  { logo: "微", name: "微博", desc: "跳转打开微博发布页，生成可再编辑草稿", tone: "red" },
  { logo: "Q", name: "QQ 空间", desc: "跳转 QQ 空间或系统分享面板", tone: "blue" },
  { logo: "圈", name: "微信朋友圈", desc: "调用手机分享面板，进入朋友圈编辑", tone: "green" },
  { logo: "言", name: "一言 App", desc: "跳转一言，新建可编辑草稿", tone: "black" },
];

const fileTypes = [
  ["Word 文档", ".docx / .doc", "识别标题、段落、章节、日期和备注"],
  ["思维导图", ".xmind / .mm / .opml", "节点、主题线、时间线事件"],
  ["表格文件", ".xlsx / .csv", "按时间、主题、标签、来源列导入"],
  ["文本与数据", ".md / .txt / .json", "解析为文章、灵感、摘录或资料"],
];

const projectTypes = [
  ["小说项目", "长篇、短篇、角色、背景、时间线"],
  ["随笔日记", "散文、杂感、生活记录、私密日记"],
  ["诗歌本", "诗、短句、歌词、意象库"],
  ["读书札记", "摘录、书评、笔记、引用来源"],
];

export default function Home() {
  const [active, setActive] = useState<Tab>("项目");
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState("");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <main className={active === "历史" ? "app-shell calendar-mode" : "app-shell"}>
      <aside className="desktop-rail">
        <div className="brand-mark">晓</div>
        <div>
          <strong>情晓录</strong>
          <span>多题材创作空间</span>
        </div>
        <div className="rail-divider" />
        {tabs.map((tab) => (
          <button key={tab} className={active === tab ? "rail-item active" : "rail-item"} onClick={() => setActive(tab)}>
            <span>{tabIcon(tab)}</span>{tab}
          </button>
        ))}
        <div className="rail-spacer" />
        <button className="rail-action" onClick={() => setPanel("idea")}>快速记录灵感</button>
        <button className="rail-action" onClick={() => setPanel("ai")}>AI 创作助手</button>
        <div className="sync-state"><i /> 当前页：{active}</div>
      </aside>

      <section className="desktop-workbench">
        <DesktopPage active={active} setActive={setActive} setPanel={setPanel} notify={notify} />
      </section>

      <section className="phone">
        <header className="topbar">
          <button className="avatar" aria-label="打开个人中心">晓</button>
          <div className="mobile-brand">情晓录</div>
          <button className="icon-button" aria-label="搜索">⌕</button>
          <button className="icon-button bell" aria-label="通知">●<b /></button>
        </header>

        <div className="content">
          <MobilePage active={active} setActive={setActive} setPanel={setPanel} notify={notify} />
        </div>

        <nav className="bottom-nav">
          {tabs.map((tab) => (
            <button key={tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>
              <i>{tabIcon(tab)}</i>{tab}
            </button>
          ))}
          <button className="capture" onClick={() => setPanel("idea")} aria-label="快速记录灵感">＋</button>
        </nav>
      </section>

      {panel === "idea" && <IdeaSheet close={() => setPanel(null)} notify={notify} />}
      {panel === "publish" && <PublishSheet close={() => setPanel(null)} notify={notify} />}
      {panel === "history" && <HistorySheet close={() => setPanel(null)} notify={notify} />}
      {panel === "ai" && <AiSheet close={() => setPanel(null)} notify={notify} />}
      {panel === "timeline" && <TimelineSheet close={() => setPanel(null)} notify={notify} />}
      {panel === "media" && <MediaSheet close={() => setPanel(null)} notify={notify} />}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function DesktopPage({ active, setActive, setPanel, notify }: PageProps) {
  if (active === "写作") return <WritingPage setPanel={setPanel} notify={notify} desktop />;
  if (active === "资料") return <LibraryPage setPanel={setPanel} notify={notify} desktop />;
  if (active === "历史") return <HistoryPage setActive={setActive} setPanel={setPanel} notify={notify} desktop />;
  if (active === "同步") return <SyncPage setPanel={setPanel} notify={notify} desktop />;
  if (active === "设置") return <SettingsPage setPanel={setPanel} notify={notify} desktop />;
  return <ProjectPage setActive={setActive} setPanel={setPanel} notify={notify} desktop />;
}

function MobilePage({ active, setActive, setPanel, notify }: PageProps) {
  if (active === "写作") return <WritingPage setPanel={setPanel} notify={notify} />;
  if (active === "资料") return <LibraryPage setPanel={setPanel} notify={notify} />;
  if (active === "历史") return <HistoryPage setActive={setActive} setPanel={setPanel} notify={notify} />;
  if (active === "同步") return <SyncPage setPanel={setPanel} notify={notify} />;
  if (active === "设置") return <SettingsPage setPanel={setPanel} notify={notify} />;
  return <ProjectPage setActive={setActive} setPanel={setPanel} notify={notify} />;
}

type PageProps = {
  active?: Tab;
  desktop?: boolean;
  setActive?: (tab: Tab) => void;
  setPanel: (panel: Panel) => void;
  notify: (message: string) => void;
};

function ProjectPage({ setActive, setPanel, notify, desktop }: PageProps) {
  return (
    <>
      <div className="workbench-head">
        <div>
          <span>{desktop ? "电脑端创作书桌" : "今天继续写"}</span>
          <h1>我的创作空间</h1>
        </div>
        <button onClick={() => setPanel("idea")}>新灵感</button>
      </div>
      <section className="project-card">
        <div className="project-top"><span className="status">连载中</span><button onClick={() => notify("已打开项目设置")}>•••</button></div>
        <p>最近打开</p>
        <h2>雨后札记</h2>
        <div className="project-meta"><span>随笔日记 · 生活观察</span><span>自动保存</span></div>
        <div className="progress"><i /></div>
        <div className="project-bottom">
          <span>未完成 · 街角的潮湿气味</span>
          <button onClick={() => setActive?.("写作")}>继续写作 <b>›</b></button>
        </div>
      </section>
      <section className="project-cover">
        <div>
          <span>项目封面</span>
          <strong>雨后札记</strong>
          <small>用于项目首页、作品列表、发布封面和手机预览。</small>
        </div>
        <button onClick={() => notify("项目封面选择器已打开")}>上传 / 更换封面</button>
      </section>
      <div className="desktop-grid">
        {projectTypes.map(([name, desc]) => (
          <button key={name} onClick={() => notify(`${name}已选中，可新建`)}>
            <strong>{name}</strong><span>{desc}</span><em>新建 ›</em>
          </button>
        ))}
      </div>
      <section className="section-block">
        <div className="section-title">
          <div><h3>小说书架</h3><span>原创、同人、题材标签、设定集</span></div>
          <button onClick={() => notify("已打开小说分类设置")}>设置分类</button>
        </div>
        <div className="tag-cloud">
          {novelShelves.map((item) => (
            <button key={item.label} className={item.tone} onClick={() => notify(`${item.label}分类已打开`)}>
              <strong>{item.label}</strong><span>{item.count}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="desktop-grid">
        {projectStats.map(([label, value]) => (
          <button key={label} onClick={() => notify(`${label}已打开`)}>
            <strong>{label}</strong><span>{value}</span><em>查看 ›</em>
          </button>
        ))}
        <button onClick={() => notify("正在选择本地创作文件夹")}>
          <strong>实时同步文件夹</strong><span>WPS、表格、思维导图、素材自动更新</span><em>绑定 ›</em>
        </button>
      </div>
      <section className="section-block fragments">
        <div className="section-title"><div><h3>最近灵感</h3><span>片段、句子、主题、摘录</span></div><button onClick={() => setPanel("idea")}>添加</button></div>
        <div className="fragment-list">
          {["雨停之后，旧城区的钟比往常多响了一次。", "如果潮汐不是水位变化，而是城市记忆的呼吸呢？"].map((text) => (
            <button className="fragment" key={text} onClick={() => notify("灵感草稿已打开")}>
              <i className="purple" /><span><em>灵感</em>{text}<small>刚刚</small></span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function WritingPage({ setPanel, notify, desktop }: PageProps) {
  return (
    <>
      <div className="workbench-head">
        <div>
          <span>{desktop ? "电脑端写作" : "手机端写作"}</span>
          <h1>街角的潮湿气味</h1>
        </div>
        <button onClick={() => setPanel("publish")}>发布 / 同步</button>
      </div>
      <div className="editor-panel">
        <div className="editor-toolbar">
          <span>《雨后札记》· 新文章编辑界面</span>
          <div><button>B</button><button>I</button><button>H1</button><button onClick={() => setPanel("media")}>插图</button><button onClick={() => setPanel("media")}>注释</button><button onClick={() => notify("正在选择本地创作文件夹")}>WPS/文件夹</button><button onClick={() => setPanel("ai")}>AI</button><button onClick={() => setPanel("publish")}>发布</button></div>
        </div>
        <div className="editor-body">
          <h2>街角的潮湿气味</h2>
          <p>雨停以后，便利店门口的灯牌还亮着。空气里有一点潮湿的铁锈味，像城市刚刚把某个旧念头翻出来，又急着藏回去。</p>
          <p>我在路边站了一会儿，忽然觉得很多生活里的答案并不会出现，它们只是变成了更适合携带的问题。</p>
        </div>
      </div>
      <section className="media-strip">
        <button onClick={() => setPanel("media")}><strong>正文插图</strong><small>图片 / 图注</small></button>
        <button onClick={() => setPanel("media")}><strong>注释</strong><small>脚注 / 批注</small></button>
        <button onClick={() => notify("图片素材库已打开")}><strong>图片素材</strong><small>项目图片 / 引用</small></button>
        <button onClick={() => notify("注释列表已打开")}><strong>注释列表</strong><small>来源 / 备注</small></button>
      </section>
      {desktop && (
        <section className="editor-wps">
          <div>
            <span>电脑端实时同步</span>
            <strong>监听本地创作文件夹</strong>
            <small>WPS 保存、表格变化、思维导图更新后，自动同步到当前项目。</small>
          </div>
          <div>
            <button onClick={() => notify("实时同步已开启")}>开启实时同步</button>
            <button onClick={() => notify("正在打开本地创作文件夹")}>打开文件夹</button>
          </div>
        </section>
      )}
      {desktop && (
        <section className="sync-monitor">
          <div><i /><span><strong>正在监听</strong><small>D:\创作\雨后札记 · 12 个文件 · 最近更新 18:42</small></span></div>
          <button onClick={() => notify("同步记录已打开")}>同步记录</button>
        </section>
      )}
      <div className="publish-strip">
        <div className="publish-copy">
          <span>文章编辑后的动作</span>
          <strong>发布到指定网站 / 跳转平台草稿</strong>
          <small>带标题、正文、标签、封面进入目标平台，用户确认后发布。</small>
        </div>
        <button onClick={() => setPanel("publish")}>打开发布面板</button>
      </div>
      <div className="desktop-grid">
        {[
          ["保存为私密草稿", "仅自己可见，可之后再公开或发布"],
          ["归入随笔日记", "项目、文件夹、公开状态"],
          ["添加标签和来源", "记录主题、出处、平台和写作状态"],
          ["图片与注释", "正文图片、图注、脚注、批注"],
          ["AI 辅助", "润色、扩写、摘要或连接项目资料"],
        ].map(([item, desc]) => (
          <button key={item} onClick={() => item.includes("AI") ? setPanel("ai") : item.includes("图片") ? setPanel("media") : notify(`${item}已执行`)}>
            <strong>{item}</strong><span>{desc}</span><em>可用 ›</em>
          </button>
        ))}
      </div>
    </>
  );
}

function LibraryPage({ setPanel, notify, desktop }: PageProps) {
  return (
    <>
      <div className="workbench-head">
        <div><span>{desktop ? "电脑端资料库" : "手机端资料库"}</span><h1>资料库</h1></div>
        <button onClick={() => setPanel("timeline")}>导入 / 导出</button>
      </div>

      <section className="library-layout">
        <aside className="library-menu">
          <button className="active" onClick={() => notify("已打开全部资料")}>全部资料<span>128</span></button>
          <button onClick={() => notify("已打开作品文件夹")}>作品文件夹<span>6</span></button>
          <button onClick={() => notify("已打开摘录札记")}>摘录札记<span>42</span></button>
          <button onClick={() => notify("已打开设定素材")}>设定素材<span>18</span></button>
          <button onClick={() => setPanel("timeline")}>时间轴 / 主题线<span>24</span></button>
          <button onClick={() => notify("已打开私密文件夹")}>私密文件夹<span>5</span></button>
        </aside>

        <div className="library-main">
          <div className="library-hero">
            <span>当前项目</span>
            <strong>雨后札记</strong>
            <small>随笔日记项目：文章、摘录、主题线、来源和私密草稿集中管理。</small>
          </div>

          <div className="library-list">
            {[
              ["街角的潮湿气味", "文章草稿 · 随笔日记 · 今天"],
              ["七月生活碎片", "主题线 · 8 条内容"],
              ["旧书店摘录", "摘录札记 · 12 条引用"],
              ["雨、灯牌、铁锈味", "素材组 · 文章联想"],
            ].map(([name, meta]) => (
              <button key={name} onClick={() => notify(`${name}已打开`)}>
                <span><strong>{name}</strong><small>{meta}</small></span><em>›</em>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="desktop-timeline">
        <div className="section-title"><div><h3>项目专用资料</h3><span>不同项目类型显示不同资料模板，小说设定集不会强行占满所有项目。</span></div><button onClick={() => notify("已打开模板管理")}>管理模板</button></div>
        {["雨后街角", "旧书店摘录", "七月的生活碎片"].map((item, index) => (
          <div className="timeline-row" key={item}><i>{index + 1}</i><span>{item}</span><button onClick={() => notify(`${item} 已关联作品`)}>关联</button></div>
        ))}
      </section>

      <section className="section-block">
        <div className="section-title">
          <div><h3>小说项目模板</h3><span>原创、同人、人物关系、世界观、时间线</span></div>
          <button onClick={() => notify("已打开小说模板")}>查看</button>
        </div>
        <div className="tag-cloud">
          {["原创", "同人", "人物关系", "世界观", "时间线", "自定义设定集"].map((item) => (
            <button key={item} className="purple" onClick={() => notify(`${item}模板已打开`)}>
              <strong>{item}</strong>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function SyncPage({ setPanel, notify, desktop }: PageProps) {
  return (
    <>
      <div className="workbench-head">
        <div><span>{desktop ? "电脑端同步" : "手机端同步"}</span><h1>导入与同步</h1></div>
        <button onClick={() => setPanel("history")}>历史同步</button>
      </div>
      <div className="import-list">
        {historyPlatforms.map((item) => (
          <button key={item.name} onClick={() => notify(`${item.name} 正在准备授权导入`)}>
            <i className={item.tone}>{item.logo}</i><span><strong>{item.name}</strong><small>{item.desc}</small></span><em>{item.state}</em>
          </button>
        ))}
      </div>
      <div className="publish-strip">
        <div className="publish-copy"><span>文件导入导出</span><strong>时间轴、Word、思维导图、表格</strong><small>导入后生成可编辑节点，可再导出备份。</small></div>
        <button onClick={() => setPanel("timeline")}>文件处理</button>
      </div>
      {desktop && (
        <section className="desktop-wps">
          <div>
            <span>电脑端本地文件</span>
            <strong>实时同步本地文件夹</strong>
            <small>监听 Word、表格、思维导图、图片、素材变化；单个文件可临时拖入。</small>
          </div>
          <div>
            <button onClick={() => notify("实时同步已开启")}>开启实时同步</button>
            <button onClick={() => setPanel("timeline")}>拖入文件</button>
          </div>
        </section>
      )}
    </>
  );
}

function HistoryPage({ setActive, setPanel, notify, desktop }: PageProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  const marked = new Map([
    [3, "随笔"],
    [7, "日记"],
    [12, "发布"],
    [18, "诗"],
    [24, "草稿"],
    [27, "计划"],
  ]);
  return (
    <>
      <div className="workbench-head">
        <div><span>{desktop ? "电脑端历史" : "历史"}</span><h1>创作历史</h1></div>
        <button onClick={() => setPanel("idea")}>写今日记录</button>
      </div>
      <section className="calendar-switch">
        <button className="active" onClick={() => notify("已切换到创作时间轴")}>创作时间轴</button>
        <button onClick={() => notify("已切换到日期筛选")}>日期筛选</button>
      </section>

      <section className="blog-timeline-layout">
        <div className="creation-timeline">
          {[
          ["7月24日", "街角的潮湿气味", "随笔日记 · 草稿 · 2,834 字", "雨停以后，便利店门口的灯牌还亮着。空气里有一点潮湿的铁锈味，像城市刚刚翻出一个旧念头。", "阅读全文"],
          ["7月23日", "旧书店摘录", "读书札记 · 摘录 12 条", "“人总是在离开之后，才开始真正理解自己曾经居住过的地方。”", "查看摘录"],
          ["7月22日", "雨后短诗三首", "诗歌本 · 已归档", "雨声停在窗沿 / 灯光替夜色落款 / 我把未寄出的信折回心里", "直接浏览"],
          ["7月21日", "潮湿、灯牌与铁锈味", "素材组 · 4 张图片 · 2 条注释", "一组用于《街角的潮湿气味》的图像和气味关键词。", "查看素材"],
          ["7月20日", "便利店门口", "灵感碎片 · 3 条", "凌晨两点，便利店像城市没有合上的眼睛。", "直接浏览"],
          ["7月18日", "七月生活碎片", "主题线 · 8 条内容", "雨、旧书、公交末班车、没说出口的话。", "查看主题"],
          ["7月17日", "读《夜航西飞》摘录", "读书札记 · 6 条引用", "关于远行、记忆和一个人如何在陌生地方重新认识自己。", "查看摘录"],
          ["7月15日", "雨声备忘", "随笔日记 · 私密", "今天的雨声很轻，像有人在远处反复修改一句话。", "私密"],
          ["7月12日", "发布稿：夜里的便利店", "指定网站 · 待确认", "发布前草稿，含封面、标签和手机预览长图。", "去发布"],
          ["7月09日", "短句：城市把灯藏起来", "诗歌本 · 短句", "城市把灯藏起来，只给晚归的人留一点影子。", "直接浏览"],
          ["7月07日", "同步本地创作文件夹", "WPS 文档 · 更新 2 份", "《雨后札记.docx》《七月摘录.xlsx》已更新。", "同步记录"],
          ["7月03日", "六月末整理", "归档 · 12 篇", "六月的随笔、诗句、摘录和私密日记已归档。", "查看归档"],
          ["2021年7月19日 20:16", "夏天的傍晚", "随笔 · 来自 QQ 空间", "那天晚上的风很热，我把照片和几句废话一起发到了空间。现在重新看，反而像一枚小小的时间钉。", "来自 QQ 空间"],
          ].map(([date, title, detail, excerpt, action], index) => {
            const isExpanded = expanded === index;
            const fullText = index === 0
              ? `${excerpt} 我在这里站了一会儿，看见玻璃门上映出自己的影子。它不像一个完整的人，更像一段还没写完的句子。后来风把雨后的潮气推过来，纸袋发出很轻的响声，我突然想把这一天留下来。`
              : excerpt;
            return (
            <article className="feed-post" key={`${date}-${title}`}>
              <div className="feed-avatar">晓</div>
              <div className="feed-body">
                <div className="feed-head">
                  <div><strong>{title}</strong><small>{date} · {detail}</small></div>
                  <button onClick={() => notify("更多操作已打开")}>⌄</button>
                </div>
                <p>{isExpanded ? fullText : excerpt}{index === 0 && <button className="inline-expand" onClick={() => setExpanded(isExpanded ? null : index)}>{isExpanded ? "收起" : "展开全文"}</button>}</p>
                {[0, 3, 8].includes(index) && (
                  <div className={`feed-images ${index === 0 ? "feed-images-wide" : index === 8 ? "feed-images-cover" : ""}`}>
                    <i /><i /><i />
                    {index === 8 && <em>封面草稿</em>}
                  </div>
                )}
                <div className="feed-actions">
                  <span>{index === 0 ? "草稿 · 2,834 字" : action === "来自 QQ 空间" ? action : detail}</span>
                  <button onClick={() => { setActive?.("写作"); notify("已进入写作页"); }}>编辑</button>
                  <button onClick={() => setPanel("publish")}>发布</button>
                  <button onClick={() => notify("导出功能待接入")}>导出</button>
                </div>
              </div>
            </article>
          )})}
          <div className="timeline-more">
            <span>已显示最近 12 条</span>
            <strong>继续下滑加载更早内容</strong>
            <small>继续下滑，可以翻到最早的文章、日记、诗、摘录和同步记录。</small>
            <button onClick={() => notify("正在加载更早内容")}>加载更早</button>
          </div>
        </div>

        <aside className="timeline-side">
          <div className="calendar-panel">
            <div className="calendar-head"><strong>2026 年 7 月</strong><span>连续记录 8 天</span></div>
            <div className="week-row">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="month-grid">
              {days.map((day) => (
                <button key={day} className={marked.has(day) ? "marked" : ""} onClick={() => notify(`7月${day}日记录已打开`)}>
                  <strong>{day}</strong>
                  {marked.has(day) && <small>{marked.get(day)}</small>}
                </button>
              ))}
            </div>
          </div>
          <div className="day-panel">
            <span>今天</span>
            <strong>7 月 24 日</strong>
            <p>街角的潮湿气味</p>
            <small>随笔日记 · 2,834 字 · 自动保存</small>
            <button onClick={() => notify("今日草稿已打开")}>继续编辑</button>
            <button onClick={() => setPanel("publish")}>安排发布</button>
          </div>
          <div className="side-filter">
            <strong>内容筛选</strong>
            {["全部", "随笔日记", "诗歌", "摘录", "发布稿", "私密"].map((item) => (
              <button key={item} onClick={() => notify(`${item}筛选已应用`)}>{item}</button>
            ))}
          </div>
        </aside>
      </section>
      <div className="desktop-grid">
        {[
          ["写作记录", "按日期查看文章、灵感和草稿"],
          ["日记归档", "随笔日记自动按日期收纳"],
          ["发布计划", "安排微博、网站或其他平台发布时间"],
          ["提醒事项", "记录截稿、更新、灵感回顾"],
        ].map(([name, desc]) => (
          <button key={name} onClick={() => notify(`${name}已打开`)}>
            <strong>{name}</strong><span>{desc}</span><em>查看 ›</em>
          </button>
        ))}
      </div>
    </>
  );
}

function SettingsPage({ setPanel, notify, desktop }: PageProps) {
  return (
    <>
      <div className="workbench-head">
        <div><span>{desktop ? "电脑端设置" : "手机端设置"}</span><h1>连接、授权与备份</h1></div>
        <button onClick={() => notify("设置已保存")}>保存设置</button>
      </div>
      <div className="desktop-grid">
        <button onClick={() => notify("指定网站接口配置已打开")}><strong>指定网站接口</strong><span>LovePoem / 自定义站点 API</span><em>配置 ›</em></button>
        <button onClick={() => setPanel("ai")}><strong>AI 创作助手</strong><span>管理模型、授权和项目资料连接</span><em>配置 ›</em></button>
        <button onClick={() => notify("平台授权管理已打开")}><strong>平台授权</strong><span>微博、QQ 空间、朋友圈、一言</span><em>管理 ›</em></button>
        <button onClick={() => notify("备份与私密空间已打开")}><strong>备份与隐私</strong><span>私密文件夹、导出备份、本地缓存</span><em>管理 ›</em></button>
      </div>
    </>
  );
}

function IdeaSheet({ close, notify }: SheetProps) {
  const [content, setContent] = useState("雨后的码头，所有影子都朝向海的反方向……");
  const save = async () => {
    if (!content.trim()) return;
    await queueDraft(content.trim().slice(0, 24), content.trim());
    close();
    notify("灵感已保存，后台同步中");
  };
  return (
    <Sheet title="快速记录" subtitle="抓住此刻的灵感" close={close}>
      <textarea autoFocus value={content} onChange={(event) => setContent(event.target.value)} />
      <div className="tag-row"><button className="selected">片段</button><button>句子</button><button>主题</button><button>摘录</button><button>＋</button></div>
      <div className="privacy"><span>保存到「雨后札记 / 灵感碎片」</span><button>私密 ●</button></div>
      <button className="primary" onClick={() => void save()}>保存灵感</button>
    </Sheet>
  );
}

function PublishSheet({ close, notify }: SheetProps) {
  return (
    <Sheet title="发布草稿" subtitle="平台、标题、正文、标签" close={close}>
      <div className="draft-preview">
        <span>当前编辑文章</span><strong>《雨后札记》· 街角的潮湿气味</strong>
        <p>雨停以后，便利店门口的灯牌还亮着……</p>
        <button onClick={() => notify("已回到文章编辑器")}>继续编辑</button>
      </div>
      <p className="publish-label">发布目标</p>
      <div className="platforms">
        {publishTargets.map((item) => (
          <button key={item.name} onClick={() => notify(`${item.name}草稿已准备`)}>
            <i className={item.tone}>{item.logo}</i><span>{item.name}</span><small>{item.desc}</small>
          </button>
        ))}
      </div>
      <div className="share-assets">
        <button onClick={() => notify("手机长图已生成")}><strong>手机长图</strong><small>适合朋友圈、QQ 空间、微博预览</small></button>
        <button onClick={() => notify("手机浏览链接已生成")}><strong>手机预览</strong><small>图文排版、封面、注释预览</small></button>
      </div>
      <div className="sync-rule"><strong>发布内容</strong><span>标题、正文、标签、封面、来源项目</span></div>
      <button className="primary" onClick={() => { close(); notify("正在准备发布草稿"); }}>生成发布草稿</button>
    </Sheet>
  );
}

function HistorySheet({ close, notify }: SheetProps) {
  return (
    <Sheet title="历史内容同步" subtitle="平台文章、日志、收藏" close={close}>
      <div className="sync-options">
        {historyPlatforms.map((item) => (
          <button key={item.name} onClick={() => notify(`${item.name} 将请求权限，并等待用户确认后导入`)}>
            <i className={item.tone}>{item.logo}</i><span><strong>{item.name}</strong><small>{item.desc}</small></span><em>{item.state}</em>
          </button>
        ))}
      </div>
      <div className="sync-rule"><strong>时间</strong><span>微博、QQ 空间、朋友圈、一言等旧内容，按原平台显示的发布时间进入历史；导入时间只作为同步记录保存。</span></div>
      <div className="sync-rule"><strong>边界</strong><span>只有指定网站走接口；其他平台通过手机授权、系统分享、相册权限或导出包导入，不越权抓取。</span></div>
      <button className="primary" onClick={() => { close(); notify("正在准备历史同步"); }}>开始同步旧文章</button>
    </Sheet>
  );
}

function TimelineSheet({ close, notify }: SheetProps) {
  return (
    <Sheet title="批量导入导出" subtitle="时间轴、Word、思维导图等文件一键处理" close={close}>
      <div className="upload-zone" onClick={() => notify("已打开文件选择器")}>
        <strong>拖入文件或点击选择</strong><span>支持 .docx、.doc、.xmind、.mm、.opml、.xlsx、.csv、.md、.txt、.json</span>
      </div>
      <div className="desktop-wps sheet-wps">
        <div>
          <span>电脑端</span>
          <strong>本地文件夹实时同步</strong>
          <small>WPS 文档、时间轴、表格、素材变动后自动同步到当前项目。</small>
        </div>
        <div>
          <button onClick={() => notify("实时同步已开启")}>开启同步</button>
          <button onClick={() => notify("已监听拖入文件")}>拖入上传</button>
        </div>
      </div>
      <div className="file-list sheet-files">
        {fileTypes.map(([name, ext, desc]) => (
          <button key={name} onClick={() => notify(`${name} 已加入导入队列`)}><strong>{name}</strong><small>{ext}</small><span>{desc}</span></button>
        ))}
      </div>
      <div className="export-row"><button onClick={() => notify("已导出 Word")}>导出 Word</button><button onClick={() => notify("已导出思维导图")}>导出思维导图</button><button onClick={() => notify("已导出表格 / JSON")}>导出表格 / JSON</button></div>
      <button className="primary" onClick={() => { close(); notify("文件已导入，并生成时间轴节点"); }}>一键导入文件</button>
    </Sheet>
  );
}

function MediaSheet({ close, notify }: SheetProps) {
  return (
    <Sheet title="正文素材" subtitle="插图与注释" close={close}>
      <div className="media-list">
        {[
          ["正文插图", "0 张", "插入图片"],
          ["图片说明", "0 条", "添加图注"],
          ["脚注", "2 条", "管理脚注"],
          ["批注", "1 条", "查看批注"],
        ].map(([name, state, action]) => (
          <button key={name} onClick={() => notify(`${action}已打开`)}>
            <span><strong>{name}</strong><small>{state}</small></span><em>{action}</em>
          </button>
        ))}
      </div>
      <div className="sync-rule">
        <strong>正文内显示</strong>
        <span>图片、图注、脚注、批注随正文保存，发布前再选择是否一起导出。</span>
      </div>
      <button className="primary" onClick={() => { close(); notify("正文素材已保存"); }}>保存正文素材</button>
    </Sheet>
  );
}

function AiSheet({ close, notify }: SheetProps) {
  return (
    <Sheet title="AI 项目联动" subtitle="选择资料、人物和导出目标" close={close}>
      <div className="gpt-card">
        <span>当前联动项目</span>
        <strong>雨后札记</strong>
        <small>AI 可以读取你勾选的文章、提纲、摘录、设定集和时间线；生成结果可回存到指定位置。</small>
      </div>

      <p className="publish-label">已连接内容</p>
      <div className="link-board">
        {linkedContext.map(([name, desc, state]) => (
          <button key={name} onClick={() => notify(`${name}连接设置已打开`)}>
            <span><strong>{name}</strong><small>{desc}</small></span><em>{state}</em>
          </button>
        ))}
      </div>

      <p className="publish-label">写作动作</p>
      <div className="gpt-actions">
        {["润色这篇文章", "扩写灵感", "整理主题线", "生成发布摘要"].map((item) => (
          <button key={item} onClick={() => notify(`${item} 已交给 AI 助手处理`)}>{item}</button>
        ))}
      </div>

      <div className="sync-rule"><strong>人物 AI 对话接口</strong><span>小说和同人项目可选择人物卡、关系网、世界观和时间线，生成角色对话 API；对话记忆可按项目、章节或私密范围控制。</span></div>
      <div className="gpt-actions">
        {aiConnectors.map(([name, desc]) => (
          <button key={name} onClick={() => notify(`${name}已准备`)}>
            <strong>{name}</strong><small>{desc}</small>
          </button>
        ))}
      </div>

      <div className="export-row">
        <button onClick={() => notify("已生成 Grok 设定包")}>Grok 包</button>
        <button onClick={() => notify("已生成角色对话 API 配置")}>API 配置</button>
        <button onClick={() => notify("已生成 Markdown / JSON")}>导出文件</button>
      </div>
      <div className="sync-rule"><strong>保存到项目</strong><span>生成内容可保存为新草稿、新版本、灵感碎片或设定补充。</span></div>
      <button className="primary" onClick={() => { close(); notify("设定包已生成"); }}>生成 AI 设定包</button>
    </Sheet>
  );
}

type SheetProps = { close: () => void; notify: (message: string) => void };

function Sheet({ title, subtitle, close, children }: { title: string; subtitle: string; close: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={close}>
      <section className="sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head"><div><span>{title}</span><h3>{subtitle}</h3></div><button onClick={close}>×</button></div>
        {children}
      </section>
    </div>
  );
}

function tabIcon(tab: Tab) {
  return tab === "项目" ? "◆" : tab === "资料" ? "◇" : tab === "写作" ? "✎" : tab === "历史" ? "□" : tab === "同步" ? "⇄" : "●";
}
