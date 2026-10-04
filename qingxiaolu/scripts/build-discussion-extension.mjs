import ts from "typescript";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
const source=resolve("tools/chatgpt-qingxiaolu-sync"),output=resolve("discussion-extension-dist");
await mkdir(output,{recursive:true});await mkdir(resolve(output,"shared"),{recursive:true});
const files=["manifest.json","popup.html","popup.css","popup.js","syncPlan.js","安装说明.md"];
for(const file of [...files,"guide.html"])await copyFile(resolve(source,file),resolve(output,file));
for(const name of ["sync-request","sync-content"]){const text=await readFile(resolve("mobile",name+".ts"),"utf8");const compiled=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from "(\.{1,2}\/[^".]+)"/g,'from "$1.mjs"');await writeFile(resolve(output,"shared",name+".mjs"),compiled);}
const zip=new JSZip();for(const file of [...files,"shared/sync-request.mjs","shared/sync-content.mjs"])zip.file(file,await readFile(resolve(output,file)));
await writeFile(resolve(output,"chatgpt-qingxiaolu-sync.zip"),await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"}));
console.log("讨论同步扩展构建完成：discussion-extension-dist");
