import JSZip from 'jszip';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
const zip = new JSZip();
for (const name of ['server.mjs', '启动情晓录.ps1', '停止情晓录.ps1', '启动情晓录.cmd', '停止情晓录.cmd', 'README.md']) {
  let value = await readFile(`tools/desktop/${name}`);
  // Windows PowerShell 5.1 需要 BOM，才能正确读取中文脚本和 CMD 路径。
  if (name.endsWith('.ps1')) value = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), value]);
  if (name.endsWith('.cmd')) value = Buffer.from(value.toString('utf8').replaceAll('启动情晓录.ps1', 'start.ps1').replaceAll('停止情晓录.ps1', 'stop.ps1'));
  zip.file(`情晓录电脑助手/${name}`, value);
  if (name.endsWith('.ps1')) zip.file(`情晓录电脑助手/${name.startsWith('启动') ? 'start.ps1' : 'stop.ps1'}`, value);
}
async function add(directory, target) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) await add(path.join(directory, entry.name), `${target}/${entry.name}`);
    else zip.file(`${target}/${entry.name}`, await readFile(path.join(directory, entry.name)));
  }
}
for (const name of ['index.html', 'offline-sw.js']) zip.file(`情晓录电脑助手/frontend/${name}`, await readFile(`mobile-dist/${name}`));
for (const name of ['assets', 'runners']) await add(`mobile-dist/${name}`, `情晓录电脑助手/frontend/${name}`);
for (const name of ['browser-import.mjs', 'loaded-history.mjs']) zip.file(`情晓录电脑助手/history/${name}`, await readFile(`tools/history-importers/${name}`));
await add('node_modules/playwright-core', '情晓录电脑助手/node_modules/playwright-core');
zip.file('情晓录电脑助手/采集微博.cmd', '@echo off\r\nnode "%~dp0history\\browser-import.mjs"\r\nif errorlevel 1 pause\r\n');
zip.file('情晓录电脑助手/采集QQ空间.cmd', '@echo off\r\nnode "%~dp0history\\browser-import.mjs" --qqzone\r\nif errorlevel 1 pause\r\n');
await mkdir('desktop-helper-dist', { recursive: true });
await writeFile('desktop-helper-dist/qingxiaolu-desktop.zip', await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
await mkdir('mobile-dist/tools/desktop', { recursive: true });
await writeFile('mobile-dist/tools/desktop/qingxiaolu-desktop.zip', await readFile('desktop-helper-dist/qingxiaolu-desktop.zip'));
await writeFile('mobile-dist/tools/desktop/guide.html', await readFile('tools/desktop/guide.html'));
console.log('电脑助手已打包：desktop-helper-dist/qingxiaolu-desktop.zip');
