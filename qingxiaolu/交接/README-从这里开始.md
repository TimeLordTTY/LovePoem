# 情晓录跨电脑接续说明

核对日期：2026-09-29。此目录给另一台电脑上的 Codex 使用。先读本文件，再读同目录的《产品与开发现状》和《环境部署与联调》。

当前 Windows 环境与服务器接续先看《本机环境接续》。2026-10-02 持续进行的作者使用审计、修复和线上验收见《作者实用审计与迭代台账》；表中的未验收事项仍需继续完成。下文保留最初跨电脑迁移时的历史情况。
当前完成边界与缺少的真实验收条件见《当前验收状态-20261004》，不要把模拟通过或构建成功当成所有功能已完成。
2026-10-04 电脑端规划核对、本机工作台、WPS 文件读回、文件同步预览与线上复测见《电脑端验收与接续-20261004》；用户提供的产品目标保存在《电脑端功能规划-20261004》。
2026-10-04 用户明确授权采用新签名；Android 1.7 已构建、原生验收并提供下载，见《Android-1.7新签名发布-20261004》。旧 1.6 不自动覆盖，原签名请求不再阻塞本轮 APK 发布。
2026-10-06 实机反馈的项目删除误入编辑及安卓文本导出无效已修复，网页、电脑助手和同签名 Android 1.8 已更新，见《按钮修复与Android-1.8-20261006》。
2026-10-06 后续作者操作复测修复预览查找不响应和安卓选段复制失败，最新 Android 1.9 与网页已发布，见《作者写作操作复测-Android1.9-20261006》。

## 文件在哪里

- 情晓录工作目录：`poemapp`，位于原电脑的 `C:\Users\houyx\Documents\BaiduSyncdisk\临时文件夹-侯\工作\太保工作\idi\ai应用测试\`。
- 同步盘中的整个 `poemapp` 文件夹可直接迁移；如同步盘没有完整同步，使用本目录旁的 `outputs/情晓录-跨电脑源码-20260929.zip`。在空的 `poemapp` 文件夹内解压，压缩包根目录直接是 `mobile/`、`android/`、`交接/` 等。
- `outputs/情晓录-跨电脑素材-20260929.zip` 是从 `public/imports/qqzone` 单独打包的历史图片素材，属私人内容；需要继续处理 QQ 空间导入时在 `poemapp` 根目录解压。
- `outputs/情晓录-历史基线-20260929.bundle` 是当前 Git 早期提交的离线备份。它只有历史基线，近期代码仍以源码 ZIP 为准。若想保留原 Git 历史，可先 `git clone <bundle文件路径> poemapp`，再将源码 ZIP 解压覆盖到该工作目录；否则直接在空目录解压源码 ZIP 即可。
- LovePoem 网站源码在另一仓库：[TimeLordTTY/LovePoem](https://github.com/TimeLordTTY/LovePoem)，本机只读联调副本位于 `poemapp/integration/LovePoem`。新电脑应获得该私有仓库权限后克隆到相同的相对目录。

## Git 现状，务必先看

| 对象 | 地址或状态 | 用途 |
| --- | --- | --- |
| LovePoem 私有仓库 | `https://github.com/TimeLordTTY/LovePoem.git` | 网站 Vue 前端、Java 后端、数据库脚本；本机联调副本的 `origin` |
| 情晓录当前目录的 `sites` 远端 | `https://git.chatgpt-team.site/5cd225f0-25e9-40c1-9249-99688b30579a/appgprj_6a62cef2f0208191b076f2575fde44c4.git` | 早期 Codex Sites 项目远端，不能当成当前完整源码的交接地址 |
| 情晓录当前 Git 分支 | `main`，最近提交 `2bc11d1810e0fbe4a9a8f8914b5612f145b61e97`（2026-07-24） | 最近提交仍为早期原型；Android、移动端、同步服务和大量网页改动仍在工作树中 |
| LovePoem 本机副本 | `master`，本机最近提交 `8977a9060dca27e4b2d5f045cc0829212962b627`（2026-03-12） | 可能落后于 GitHub 当前状态；另有两个自动生成的前端声明文件被修改 |

目前**不能仅克隆任何一个 Git 地址来恢复现有情晓录**。跨电脑以本次源码包或完整同步盘目录为准。不要在新电脑执行会覆盖未提交内容的 `git reset --hard`、`git checkout -- .` 或直接用远端覆盖工作树。日后要建立正式 Git 备份时，先核对私人图片、环境文件、APK 和构建产物，再提交情晓录源码；不要改动 LovePoem 既有代码。

## 新电脑上第一轮操作

1. 把 `poemapp` 源码放到新电脑任意可写目录。若使用 ZIP，同时按需解压素材 ZIP。
2. 用有权访问私有仓库的 GitHub 账号，将 LovePoem 克隆到 `poemapp/integration/LovePoem`。不要执行初始化 SQL 到线上数据库。
3. 安装 Node.js 22.13+、JDK 17、Android SDK 34 和 Android Build Tools 34。仅在需要本地运行 LovePoem 时安装 MySQL 8.x 与 Maven 3.9+。
4. 在 `poemapp` 执行 `npm ci`；网页版与 APK 的命令见《环境部署与联调》。
5. 首先运行 `npm run mobile:build`、`node --check sync-server/server.mjs`。若从 Git bundle 克隆或迁移了完整 `.git`，再运行 `git status --short --branch`；仅解压源码 ZIP 时暂时没有 Git 元数据。有实体手机再验 Android 转发。
6. 将《CODEX-接续提示词》发给新电脑上的 Codex，让它先读取源码和现状，再继续开发。

## 账号与密钥

- 服务器：`124.220.229.91`，SSH 用户 `root`，端口 `22`。
- 原电脑 SSH 私钥位于 `C:\Users\houyx\Downloads\124.220.229.91_id_ed25519`；交接 ZIP 不包含私钥。新电脑可通过安全途径单独转移该私钥，或创建新密钥并由服务器管理员加入授权。
- 网站和同步服务的密码、令牌不在交接文档或 ZIP 中。服务器同步配置在 `/etc/qingxiaolu-sync/qingxiaolu-sync.env`；先确认现有配置，再决定是否需要为新电脑另配本地联调凭据。
- 历史上的 `Downloads/poem小说随笔APP对接信息.md` 含旧测试凭据与过时的接口假设，不纳入交接包；以源码和本次文档为准。
