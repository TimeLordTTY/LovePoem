import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const [apk, debug] = process.argv.slice(2); assert.ok(apk && debug);
const releaseBytes = await readFile(apk), release = await JSZip.loadAsync(releaseBytes), acceptance = await JSZip.loadAsync(await readFile(debug));
const resources = Object.keys(release.files).filter(name => name.startsWith('assets/public/') && !release.files[name].dir);
assert.ok(resources.length > 5);
for (const name of Object.keys(release.files)) assert.ok(!/assets\/public\/(imports|tools)\/|\.keystore$|\.p12$|\.jks$|(?:^|\/)\.env/.test(name), 'APK 不能携带私人素材、电脑工具或凭据');
for (const name of resources) assert.ok((await release.file(name).async('nodebuffer')).equals(await acceptance.file(name).async('nodebuffer')), '验收与正式包程序资源必须相同');
const aapt = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/build-tools/34.0.0/aapt2.exe');
const metadata = execFileSync(aapt, ['dump', 'badging', apk], { encoding: 'utf8', windowsHide: true });
assert.ok(metadata.includes("name='com.qingxiaolu.app' versionCode='8' versionName='1.7'"));
assert.ok(!metadata.includes('application-debuggable'), '正式包不能开启调试');
console.log(JSON.stringify({ version: '1.7', versionCode: 8, packageIdPreserved: true, releaseNotDebuggable: true,
  testedAndReleaseResourcesExact: true, privateMaterialAndSecretsExcluded: true, bytes: releaseBytes.length,
  sha256: createHash('sha256').update(releaseBytes).digest('hex') }));
