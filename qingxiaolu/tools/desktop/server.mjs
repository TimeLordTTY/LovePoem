// 仅供本机工作台使用：文件操作限制在用户选择的总文件夹，禁止跨站请求和符号链接。
import http from 'node:http';
import { readFile, writeFile, mkdir, readdir, lstat, realpath, rename, unlink, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fail(message, name = 'Error', status = 400) { throw Object.assign(new Error(message), { name, status }); }
const safePart = value => typeof value === 'string' && value.length > 0 && value.length <= 200 &&
  !/[\\/:*?"<>|\x00-\x1f]/.test(value) && !/[. ]$/.test(value) && value !== '.' && value !== '..' &&
  !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(value);

export async function createDesktopServer({ root, frontend, port = 43127, wpsPath = '', launch = spawn }) {
  const rootPath = await realpath(root), frontendPath = await realpath(frontend);
  const token = randomBytes(32).toString('hex');
  let origin;
  async function resolve(parts) {
    if ((await lstat(rootPath)).isSymbolicLink()) fail('总文件夹已被替换为链接，请重新选择实际目录');
    if (!Array.isArray(parts) || !parts.every(safePart)) fail('文件路径无效，未访问文件夹之外的内容');
    let target = rootPath;
    for (const part of parts) {
      target = path.join(target, part);
      try { if ((await lstat(target)).isSymbolicLink()) fail('此路径是链接，请使用总文件夹内的实际文件'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (!target.startsWith(rootPath + path.sep) && target !== rootPath) fail('文件路径不属于所选总文件夹');
    return target;
  }
  async function bytes(target) { try { return await readFile(target); } catch (error) { if (error.code === 'ENOENT') fail('文件不存在', 'NotFoundError', 404); throw error; } }
  let operations = Promise.resolve();
  async function operation(name, body) {
    const target = await resolve(body.parts);
    if (name === 'directory') {
      if (body.create) await mkdir(target, { recursive: true });
      if (!(await lstat(target)).isDirectory()) fail('此路径不是文件夹');
      return {};
    }
    if (name === 'list') return { entries: (await readdir(target, { withFileTypes: true })).filter(entry => !entry.isSymbolicLink())
      .map(entry => ({ name: entry.name, kind: entry.isDirectory() ? 'directory' : 'file' })) };
    if (name === 'file') {
      if (!body.parts.length) fail('请选择文件');
      if (body.create) { try { const handle = await open(target, 'wx'); await handle.close(); } catch (error) { if (error.code !== 'EEXIST') throw error; } }
      if (!(await lstat(target)).isFile()) fail('此路径不是文件');
      return {};
    }
    if (name === 'read') { const buffer = await bytes(target); return { base64: buffer.toString('base64'), hash: hash(buffer) }; }
    if (name === 'write') {
      if (!body.parts.length || typeof body.base64 !== 'string' || !/^[\w+/]*={0,2}$/.test(body.base64)) fail('文件内容无效');
      const buffer = Buffer.from(body.base64, 'base64');
      if (hash(await bytes(target)) !== body.expectedHash) fail('文件已被其他程序修改，未覆盖，请重新预览后同步', 'ConflictError', 409);
      const temporary = `${target}.qingxiaolu-${randomBytes(8).toString('hex')}.tmp`;
      try {
        await writeFile(temporary, buffer, { flag: 'wx' });
        await resolve(body.parts);
        if (hash(await bytes(target)) !== body.expectedHash) fail('文件已被其他程序修改，未覆盖，请重新预览后同步', 'ConflictError', 409);
        await rename(temporary, target);
      } finally { await unlink(temporary).catch(() => {}); }
      return { hash: hash(buffer) };
    }
    if (name === 'remove') {
      if (!body.parts.length || !(await lstat(target)).isFile()) fail('只能移除本次同步产生的文件');
      await unlink(target); return {};
    }
    if (name === 'open-wps') {
      if (!/\.(docx|doc)$/i.test(target)) fail('请先生成 Word 文件再打开 WPS');
      await bytes(target);
      if (!wpsPath || path.basename(wpsPath).toLowerCase() !== 'wps.exe' || !(await lstat(wpsPath)).isFile()) fail('未找到 WPS。Word 文件已保存，可自行打开；安装 WPS 后重新启动电脑助手。');
      await new Promise((resolve, reject) => {
        const child = launch(wpsPath, [target], { shell: false, detached: true, stdio: 'ignore', windowsHide: true });
        child.once('spawn', () => { child.unref(); resolve(); }); child.once('error', reject);
      });
      return { requested: true };
    }
    fail('不支持此文件操作');
  }
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(value)); };
    try {
      if (req.headers.host !== new URL(origin).host) fail('请求地址无效', 'SecurityError', 403);
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/desktop-api/')) {
        const provided = Buffer.from(String(req.headers['x-qx-desktop'] || ''));
        if (req.method !== 'POST' || req.headers.origin !== origin || provided.length !== token.length || !timingSafeEqual(provided, Buffer.from(token))) fail('此操作必须从本机情晓录页面发起', 'SecurityError', 403);
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 128 * 1024 * 1024) fail('文件过大，请拆分后操作'); chunks.push(chunk); }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const pending = operations.then(() => operation(url.pathname.slice('/desktop-api/'.length), body));
        operations = pending.catch(() => {});
        return json(200, await pending);
      }
      if (url.pathname.startsWith('/qingxiaolu-api/')) {
        if (req.headers.origin && req.headers.origin !== origin) fail('不允许跨站请求', 'SecurityError', 403);
        if (!['GET', 'POST'].includes(req.method)) fail('请求方式不支持');
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 128 * 1024 * 1024) fail('请求过大，请拆分内容'); chunks.push(chunk); }
        const response = await fetch(`https://poem.timelordtty.cn${url.pathname}${url.search}`, { method: req.method,
          headers: { ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}), ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}) },
          ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}), signal: AbortSignal.timeout(30000), redirect: 'error' });
        res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' });
        res.end(Buffer.from(await response.arrayBuffer())); return;
      }
      if (req.method !== 'GET' || !url.pathname.startsWith('/qingxiaolu/')) fail('页面不存在', 'NotFoundError', 404);
      const relative = decodeURIComponent(url.pathname.slice('/qingxiaolu/'.length)) || 'index.html';
      const target = path.resolve(frontendPath, relative);
      if (!target.startsWith(frontendPath + path.sep) || path.basename(target).startsWith('.')) fail('页面不存在', 'NotFoundError', 404);
      let data = await readFile(target);
      if (relative === 'index.html') {
        const bootstrap = JSON.stringify({ token, rootName: path.basename(rootPath) }).replace(/</g, '\\u003c');
        data = Buffer.from(data.toString('utf8').replace('<head>', `<head><script>window.__QX_DESKTOP__=${bootstrap}</script>`));
      }
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }[path.extname(target)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY' }); res.end(data);
    } catch (error) { json(error.status || (error.code === 'ENOENT' ? 404 : 400), { name: error.code === 'ENOENT' ? 'NotFoundError' : error.name, error: error.status ? error.message : error.code ? '电脑文件操作失败，请检查文件权限，原内容仍保留' : error.message }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin, token, close: () => new Promise(resolve => server.close(resolve)) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = name => process.argv[process.argv.indexOf(name) + 1];
  if (!process.argv.includes('--root')) throw new Error('启动时必须选择情晓录总文件夹');
  const instance = await createDesktopServer({ root: option('--root'), frontend: process.argv.includes('--frontend') ? option('--frontend') : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../mobile-dist'),
    wpsPath: process.argv.includes('--wps') ? option('--wps') : '', port: process.argv.includes('--port') ? Number(option('--port')) : 43127 });
  console.log(`情晓录本机工作台已启动：${instance.origin}/qingxiaolu/`);
}
