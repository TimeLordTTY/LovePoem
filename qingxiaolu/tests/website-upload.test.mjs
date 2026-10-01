import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';
import { createWebsiteBridge, websiteJwt } from '../sync-server/website-bridge.mjs';
import { requestWebsite, imageExtension } from '../work/writing-tests/website-client.mjs';

beforeEach(() => {
  const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
  globalThis.fetch = async () => { throw new Error('禁止测试请求真实服务'); };
});
const secret = 'test-key-not-a-production-secret-'.repeat(3);
const user = { id: 42, username: 'test-author' };
const req = (method, body, headers = {}) => Object.assign(Readable.from(body == null ? [] : [Buffer.from(body)]), { method, headers });
const url = path => new URL(`http://localhost/v1/website${path}`);
const response = (data, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
function setup(post, assetExists = true) {
  const calls = [];
  const pool = { query: async (sql, args) => {
    if (sql.includes('FROM users')) { assert.deepEqual(args, ['test-author']); return [[user]]; }
    if (sql.includes('FROM asset')) return [assetExists ? [{ id: 99 }] : []];
    return [post ? [post] : []];
  } };
  const bridge = createWebsiteBridge({ pool, allowedUser: 'test-author', secret, fetcher: async (address, options) => {
    calls.push({ address, options }); return response({ code: 200, data: address.endsWith('/auth/me') ? { id: 42 } : address.endsWith('/assets/upload-image') ? { id: 99, url: '/uploads/fixture.png' } : 99 });
  } });
  return { bridge, calls };
}

test('已登录情晓录直接使用同一凭证，不依赖旧网站登录令牌', async () => {
  localStorage.setItem('qx_sync_token', 'existing-session-fixture');
  localStorage.setItem('qx_lovepoem_token', 'unused-old-fixture');
  globalThis.fetch = async (address, options) => {
    assert.ok(address.endsWith('/qingxiaolu-api/v1/website/session'));
    assert.equal(options.headers.authorization, 'Bearer existing-session-fixture');
    return response({ code: 200, data: { connected: true } });
  };
  assert.equal((await requestWebsite('/session')).connected, true);
});

test('异常文本响应显示可理解错误，不产生 Unexpected token', async () => {
  localStorage.setItem('qx_sync_token', 'fixture');
  globalThis.fetch = async () => ({ status: 403, ok: false, text: async () => 'Invalid CORS request' });
  await assert.rejects(requestWebsite('/session'), /异常响应/);
});

test('主会话失效只返回情晓录登录，不维持另一套登录', async () => {
  localStorage.setItem('qx_sync_token', 'expired-fixture');
  globalThis.fetch = async () => response({ error: '未授权' }, 401);
  await assert.rejects(requestWebsite('/session'), /情晓录登录状态已失效/);
  assert.equal(localStorage.getItem('qx_sync_token'), null);
});

test('短期网站凭证使用现有账号和 HS512，不接受请求指定身份', async () => {
  const token = websiteJwt(user, secret, 100);
  const [header, payload, signature] = token.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).alg, 'HS512');
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(claims.sub, '42'); assert.equal(claims.exp, 400);
  assert.equal(signature, createHmac('sha512', secret).update(`${header}.${payload}`).digest('base64url'));
  const { bridge, calls } = setup();
  const result = await bridge(req('GET', null, { origin: 'https://poem.timelordtty.cn' }), url('/session'));
  assert.deepEqual(result, { code: 200, data: { connected: true } });
  assert.equal(calls[0].options.headers.origin, undefined);
  assert.equal(calls[0].address, 'http://127.0.0.1:8080/api/auth/me');
});

test('上传强制保存为私密草稿，拒绝调用发布和任意代理接口', async () => {
  const { bridge, calls } = setup();
  await bridge(req('POST', JSON.stringify({ title: '测试稿', status: 'PUBLISHED', visibility: 'PUBLIC' })), url('/posts'));
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.status, 'DRAFT'); assert.equal(body.visibility, 'PRIVATE'); assert.equal(body.publishDate, null);
  await assert.rejects(bridge(req('POST', '{}'), url('/posts/99/publish')), /不存在/);
  await assert.rejects(bridge(req('GET'), url('/admin/users')), /不存在/);
});

test('已公开作品上传为新草稿，不覆盖公开作品', async () => {
  const { bridge, calls } = setup({ created_by: 42, status: 'PUBLISHED', visibility: 'PUBLIC', deleted: 0 });
  await bridge(req('PUT', '{"title":"新版"}'), url('/posts/9'));
  assert.equal(calls[0].options.method, 'POST'); assert.ok(calls[0].address.endsWith('/posts'));
});

test('禁止更新其他作者作品，即使当前账号原本具有管理权限', async () => {
  const { bridge, calls } = setup({ created_by: 7, status: 'DRAFT', visibility: 'PRIVATE', deleted: 0 });
  await assert.rejects(bridge(req('PUT', '{}'), url('/posts/9')), /其他作者/);
  assert.equal(calls.length, 0);
});

test('图片转接保留 multipart 边界，不发送浏览器 Origin', async () => {
  const { bridge, calls } = setup();
  const request = await imageRequest();
  await bridge(request, url('/assets/upload-image'));
  assert.equal(calls[0].options.headers['content-type'], request.headers['content-type']);
  assert.equal(calls[0].options.headers.origin, undefined);
});

async function imageRequest(type = 'image/png', title = '') {
  const form = new FormData();
  form.append('file', new Blob(['same-fixture-bytes'], { type }), 'fixture.png');
  if (title) form.append('title', title);
  const native = new Request('http://localhost/upload', { method: 'POST', body: form });
  return req('POST', Buffer.from(await native.arrayBuffer()), { 'content-type': native.headers.get('content-type'), origin: 'https://poem.timelordtty.cn' });
}

test('主会话失效且响应没有 JSON 时也正常回到主登录', async () => {
  localStorage.setItem('qx_sync_token', 'expired-fixture');
  globalThis.fetch = async () => ({ status: 401, ok: false, text: async () => '' });
  await assert.rejects(requestWebsite('/session'), /情晓录登录状态已失效/);
  assert.equal(localStorage.getItem('qx_sync_token'), null);
});

test('JSON null 响应显示异常响应，不崩溃', async () => {
  localStorage.setItem('qx_sync_token', 'fixture');
  globalThis.fetch = async () => ({ status: 200, ok: true, text: async () => 'null' });
  await assert.rejects(requestWebsite('/session'), /异常响应/);
});

test('本机映射丢失后重试通过稿件标识更新同一私密草稿', async () => {
  const calls = [];
  const bridge = createWebsiteBridge({ secret, allowedUser: 'test-author', pool: { query: async sql =>
    sql.includes('FROM users') ? [[user]] : [[{ id: 101, slug: 'qingxiaolu-existing-draft' }]] }, fetcher: async (address, options) => {
      calls.push({ address, options }); return response({ code: 200, data: 101 });
    } });
  await bridge(req('POST', JSON.stringify({ title: '重试稿', _qingxiaoluSourceId: 'local-draft-id' })), url('/posts'));
  assert.equal(calls[0].options.method, 'PUT'); assert.ok(calls[0].address.endsWith('/posts/101'));
  const sent = JSON.parse(calls[0].options.body);
  assert.equal(sent._qingxiaoluSourceId, undefined); assert.equal(sent.slug, 'qingxiaolu-existing-draft');
});

test('已发布稿件占用标识时另建私密草稿，保留原公开作品', async () => {
  const calls = [];
  const bridge = createWebsiteBridge({ secret, allowedUser: 'test-author', pool: { query: async sql => {
    if (sql.includes('FROM users')) return [[user]];
    if (sql.includes("status='DRAFT'")) return [[]];
    return [[{ id: 77 }]];
  } }, fetcher: async (address, options) => { calls.push({ address, options }); return response({ code: 200, data: 102 }); } });
  await bridge(req('POST', JSON.stringify({ _qingxiaoluSourceId: 'published-source', status: 'PUBLISHED', visibility: 'PUBLIC' })), url('/posts'));
  assert.equal(calls[0].options.method, 'POST');
  const sent = JSON.parse(calls[0].options.body);
  assert.match(sent.slug, /^qingxiaolu-[a-f0-9]{32}-[a-f0-9-]{8}$/);
  assert.equal(sent.status, 'DRAFT'); assert.equal(sent.visibility, 'PRIVATE');
});

test('更新原有私密草稿保留原地址标识', async () => {
  const { bridge, calls } = setup({ created_by: 42, status: 'DRAFT', visibility: 'PRIVATE', deleted: 0, slug: 'original-address' });
  await bridge(req('PUT', '{"title":"新版","slug":"changed-address","_qingxiaoluSourceId":"a"}'), url('/posts/9'));
  assert.equal(JSON.parse(calls[0].options.body).slug, 'original-address');
});

test('相同图片重复提交只上传一次，multipart 边界变化不影响识别', async () => {
  const { bridge, calls } = setup();
  const first = await bridge(await imageRequest(), url('/assets/upload-image'));
  const second = await bridge(await imageRequest(), url('/assets/upload-image'));
  assert.equal(first.data.id, second.data.id); assert.equal(calls.length, 1);
});

test('已被网站删除的缓存图片会重新上传', async () => {
  const { bridge, calls } = setup(undefined, false);
  await bridge(await imageRequest(), url('/assets/upload-image'));
  await bridge(await imageRequest(), url('/assets/upload-image'));
  assert.equal(calls.length, 2);
});

test('无效图片数据不会转发到网站', async () => {
  const { bridge, calls } = setup();
  await assert.rejects(bridge(await imageRequest('text/plain'), url('/assets/upload-image')), /图片/);
  await assert.rejects(bridge(req('POST', 'broken', { 'content-type': 'multipart/form-data; boundary=bad' }), url('/assets/upload-image')), /格式/);
  assert.equal(calls.length, 0);
});

test('错误稿件标识不会保存网站草稿', async () => {
  const { bridge, calls } = setup();
  await assert.rejects(bridge(req('POST', '{"_qingxiaoluSourceId":42}'), url('/posts')), /标识/);
  assert.equal(calls.length, 0);
});

test('相同图片用于不同标题时保留原有图片库标题行为', async () => {
  const { bridge, calls } = setup();
  await bridge(await imageRequest('image/png', '标题一'), url('/assets/upload-image'));
  await bridge(await imageRequest('image/png', '标题二'), url('/assets/upload-image'));
  assert.equal(calls.length, 2);
});

test('图片文件名按实际格式保存，不将 SVG 或 PNG 标成 JPG', () => {
  assert.equal(imageExtension('image/svg+xml'), 'svg');
  assert.equal(imageExtension('image/png'), 'png');
  assert.equal(imageExtension('image/jpeg'), 'jpg');
  assert.equal(imageExtension('image/webp'), 'webp');
});

test('禁用账号和缺少认证配置不会匿名上传', async () => {
  const noAccount = createWebsiteBridge({ pool: { query: async () => [[]] }, allowedUser: 'test-author', secret });
  await assert.rejects(noAccount(req('GET'), url('/session')), /停用/);
  assert.throws(() => websiteJwt(user, ''), /尚未配置/);
});
