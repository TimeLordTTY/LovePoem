import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createDesktopServer } from '../tools/desktop/server.mjs';

test('本机助手只访问授权目录、校验来源及会话，拒绝外部覆盖，并将 Word 打开请求交给已配置程序', async () => {
  const base = path.resolve('work'); await mkdir(base, { recursive: true });
  const task = await mkdtemp(path.join(base, 'desktop-test-'));
  const root = path.join(task, 'selected'), frontend = path.join(task, 'frontend'), outside = path.join(task, 'outside');
  await Promise.all([root, frontend, outside].map(dir => mkdir(dir)));
  await writeFile(path.join(frontend, 'index.html'), '<html><head></head><body>情晓录测试页面</body></html>');
  await writeFile(path.join(outside, 'private.txt'), '不应读取的外部内容');
  const wpsPath = path.join(task, 'wps.exe'); await writeFile(wpsPath, '受控启动夹具，不是真实 WPS');
  const launches = [];
  const instance = await createDesktopServer({ root, frontend, port: 0, wpsPath, launch: (file, args, options) => {
    launches.push({ file, args, options }); const child = new EventEmitter(); child.unref = () => {};
    queueMicrotask(() => child.emit('spawn')); return child;
  } });
  const request = (op, body = {}, headers = {}) => fetch(`${instance.origin}/desktop-api/${op}`, { method: 'POST',
    headers: { origin: instance.origin, 'content-type': 'application/json', 'x-qx-desktop': instance.token, ...headers }, body: JSON.stringify(body) });
  try {
    const html = await (await fetch(`${instance.origin}/qingxiaolu/`)).text(); assert.ok(html.includes('__QX_DESKTOP__'));
    assert.equal((await request('list', { parts: [] }, { origin: 'https://foreign.invalid' })).status, 403);
    assert.equal((await request('list', { parts: [] }, { 'x-qx-desktop': 'wrong' })).status, 403);
    for (const parts of [['..', 'outside', 'private.txt'], ['D:', 'anything'], ['CON'], ['file.'], ['../private.txt']])
      assert.equal((await request('read', { parts })).status, 400);
    await symlink(outside, path.join(root, 'junction'), 'junction');
    assert.equal((await request('read', { parts: ['junction', 'private.txt'] })).status, 400);
    assert.equal((await request('directory', { parts: ['正文'], create: true })).status, 200);
    assert.equal((await request('file', { parts: ['正文', '测试.docx'], create: true })).status, 200);
    const initial = await (await request('read', { parts: ['正文', '测试.docx'] })).json();
    const writing = await request('write', { parts: ['正文', '测试.docx'], expectedHash: initial.hash, base64: Buffer.from('DOCX 合成占位').toString('base64') });
    assert.equal(writing.status, 200); const saved = await writing.json();
    await writeFile(path.join(root, '正文', '测试.docx'), '外部修改');
    assert.equal((await request('write', { parts: ['正文', '测试.docx'], expectedHash: saved.hash, base64: Buffer.from('旧预览').toString('base64') })).status, 409);
    assert.equal(await readFile(path.join(root, '正文', '测试.docx'), 'utf8'), '外部修改');
    assert.equal((await request('open-wps', { parts: ['正文', '测试.docx'] })).status, 200);
    assert.equal(launches.length, 1); assert.deepEqual(launches[0].args, [path.join(root, '正文', '测试.docx')]);
    assert.equal(launches[0].options.shell, false); assert.equal(launches[0].options.windowsHide, true);
    assert.equal((await request('open-wps', { parts: ['junction', 'private.txt'] })).status, 400);
    assert.equal(await readFile(path.join(outside, 'private.txt'), 'utf8'), '不应读取的外部内容');
  } finally {
    await instance.close();
    assert.ok(task.startsWith(base + path.sep) && path.basename(task).startsWith('desktop-test-'));
    await rm(task, { recursive: true, force: true });
  }
});
