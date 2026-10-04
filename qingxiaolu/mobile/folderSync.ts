export type FolderFile = { directory: string; name: string; text: string; type?: string; id?: string };
export type FolderInputFile = { name: string; text: string; id?: string };
type ManifestEntry = { directory: string; name: string; hash: string; id?: string };
type Manifest = { format: "qingxiaolu-folder"; projectId: string; files: ManifestEntry[]; retired?: ManifestEntry[] };
const allowedDirectories = new Set(["", "人物", "大纲", "时间轴", "正文", "AI讨论"]);
const safeName = (name: string) => Boolean(name && !/[\\/]/.test(name) && name !== "." && name !== "..");
const digest = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))).map(n => n.toString(16).padStart(2,"0")).join("");
async function directory(root: any, name: string, create = false) { return name ? root.getDirectoryHandle(name, { create }) : root; }
async function read(root: any, file: {directory: string; name: string}) {
  try { return await (await (await directory(root,file.directory)).getFileHandle(file.name)).getFile().then((value: File)=>value.text()); }
  catch (error: any) { if (error?.name === "NotFoundError") return null; throw error; }
}
async function write(root: any, file: FolderFile) {
  const handle = await (await directory(root,file.directory,true)).getFileHandle(file.name,{create:true});
  const writable = await handle.createWritable();
  try { await writable.write(new Blob([file.text], {type:file.type || "text/markdown;charset=utf-8"})); await writable.close(); }
  catch(error) { await writable.abort?.().catch(()=>undefined); throw error; }
}
export type FolderChange = { directory: string; name: string; status: "新增" | "修改" | "不变" | "冲突"; localText: string | null; appText: string; reason?: string };
export type FolderPlan = { files: FolderFile[]; rows: FolderChange[]; raw: string | null; previous: Manifest | null; signature: string };

export async function planProjectFolder(root: any, projectId: string, files: FolderFile[]): Promise<FolderPlan> {
  const manifestName = { directory:"",name:"文件清单.json" };
  const raw = await read(root,manifestName);
  let previous: Manifest | null = null;
  if(raw) {
    try { previous=JSON.parse(raw); } catch { throw new Error("文件清单无法读取，请先保留整个文件夹的备份。"); }
    if(previous?.format!=="qingxiaolu-folder" || previous.projectId!==projectId || !Array.isArray(previous.files) ||
      !Array.isArray(previous.retired || []) || [...previous.files,...(previous.retired || [])].some(file=>!allowedDirectories.has(file.directory)||!safeName(file.name)||typeof file.hash!=="string")) throw new Error("文件清单与当前项目不一致，未写入文件夹。");
  }
  if(!previous) {
    const oldBackup=await read(root,{directory:"",name:"完整备份.json"});
    if(oldBackup) {
      let parsed:any;
      try { parsed=JSON.parse(oldBackup); } catch { throw new Error("已有完整备份无法读取，未覆盖文件夹。请先保留该文件。"); }
      const project=parsed?.items?.find((item:any)=>item.payload?.itemType==="project");
      if(project&&project.id!==projectId) throw new Error("文件夹中的备份属于其他项目，未覆盖文件夹。请更换目录。");
    }
  }
  const planned = files.map(file=>({...file}));
  // 沿用已关联文件名；改标题不再产生第二份文件，顺序由文件中的元数据记录。
  for(const file of planned) if(file.id) {
    const tracked=previous?.files.find(old=>old.directory===file.directory&&old.id===file.id);
    if(tracked && await read(root,tracked)!==null) file.name=tracked.name;
    else {
      try {
        const dir=await directory(root,file.directory);
        const matches:string[]=[];
        for await(const [name,handle] of dir.entries()) if(handle.kind==="file"&&name.endsWith(".md")) {
          const text=await (await handle.getFile()).text();
          if(name.startsWith(`${file.id}--`) || new RegExp(`^(?:人物|章节|事件|稿件|讨论)ID：${file.id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\r?$`,"m").test(text)) matches.push(name);
        }
        if(matches.length>1) throw new Error(`“${file.directory}”存在同一内容的多个文件（${matches.join("、")}），请先保留需要的版本再同步。未覆盖文件。`);
        if(matches.length===1) file.name=matches[0];
      } catch(error:any) { if(error?.name!=="NotFoundError") throw error; }
    }
  }
  const paths = new Set<string>();
  for(const file of planned) {
    if(!allowedDirectories.has(file.directory)||!safeName(file.name)) throw new Error("文件名无效，未写入文件夹。");
    const path=`${file.directory}/${file.name}`;
    if(paths.has(path)) throw new Error(`存在重名文件“${path}”，未写入文件夹。`);
    paths.add(path);
  }
  const rows: FolderChange[] = [];
  const modified = new Set<string>();
  // 预览也列出本地修改，不能等确认后才告诉作者冲突。
  for(const old of [...(previous?.files || []), ...(previous?.retired || [])]) {
    const text=await read(root,old);
    if(text!==null && await digest(text)!==old.hash) {
      modified.add(`${old.directory}/${old.name}`);
      if (!planned.some(file => file.directory === old.directory && file.name === old.name))
        rows.push({ ...old, status: "冲突", localText: text, appText: "", reason: "已移出 App 的文件有本地修改，文件仍保留，请先读回或另存。" });
    }
  }
  for (const file of planned) {
    const localText = await read(root, file);
    const tracked = previous?.files.some(old => old.directory === file.directory && old.name === file.name);
    const conflict = modified.has(`${file.directory}/${file.name}`) || (localText !== null && !tracked && localText !== file.text);
    rows.push({ directory: file.directory, name: file.name, localText, appText: file.text,
      status: conflict ? "冲突" : localText === null ? "新增" : localText === file.text ? "不变" : "修改",
      reason: conflict ? tracked ? "有本地修改。请先从本地同步到 App，未覆盖文件。" : "已有外部文件，未覆盖文件。" : undefined });
  }
  return { files: planned, rows, raw, previous, signature: await digest(JSON.stringify({ raw, rows, planned })) };
}

export async function writeProjectFolder(root: any, projectId: string, files: FolderFile[], expected?: FolderPlan) {
  const manifestName = { directory: "", name: "文件清单.json" };
  const plan = await planProjectFolder(root, projectId, files);
  if (expected && expected.signature !== plan.signature) throw new Error("预览后文件夹或内容发生变化，未写入任何文件，请重新预览。");
  const conflict = plan.rows.find(row => row.status === "冲突");
  if (conflict) throw new Error(`“${conflict.directory}/${conflict.name}”${conflict.reason}`);
  const { files: planned, previous, raw } = plan;
  const paths = new Set(planned.map(file => `${file.directory}/${file.name}`));
  const before = new Map<string, string | null>();
  for(const file of planned) before.set(`${file.directory}/${file.name}`,await read(root,file));
  const retired = [...(previous?.retired || []), ...(previous?.files || []).filter(old=>!paths.has(`${old.directory}/${old.name}`))]
    .filter(old=>!paths.has(`${old.directory}/${old.name}`));
  const manifest:Manifest={format:"qingxiaolu-folder",projectId,retired,files:await Promise.all(planned.map(async file=>({directory:file.directory,name:file.name,id:file.id,hash:await digest(file.text)})))};
  const attempted:FolderFile[]=[];
  let manifestAttempted=false;
  try {
    for(const file of planned) { attempted.push(file); await write(root,file); }
    manifestAttempted=true;
    await write(root,{...manifestName,text:JSON.stringify(manifest,null,2),type:"application/json"});
  } catch(error) {
    const failures:string[]=[];
    for(const file of attempted.reverse()) {
      try { const original=before.get(`${file.directory}/${file.name}`); if(original!==null) await write(root,{...file,text:original!}); else await (await directory(root,file.directory)).removeEntry(file.name); }
      catch { failures.push(`${file.directory}/${file.name}`); }
    }
    if(manifestAttempted) try { if(raw===null) await root.removeEntry(manifestName.name); else await write(root,{...manifestName,text:raw,type:"application/json"}); } catch {failures.push(manifestName.name);}
    throw new Error(failures.length ? `文件夹写入失败，部分文件无法回滚（${failures.join("、")}）。完整本机稿件仍保留，请检查文件夹权限后重新同步。` : "文件夹写入失败，本次文件变更已撤销；本机稿件仍保留。");
  }
  return manifest;
}

// 项目改名沿用已有目录；同名项目按 ID 隔离，不能混在同一个目录中。
export async function projectFolder(root: any, projectId: string, title: string) {
  const matches: any[] = [];
  const safe = (value: string) => value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/[. ]+$/, "");
  for await (const [name, handle] of root.entries()) {
    if (handle.kind !== "directory") continue;
    const manifest = await read(handle, { directory: "", name: "文件清单.json" });
    if (manifest) {
      try { if (JSON.parse(manifest).projectId === projectId) matches.push(handle); } catch { /* 其他目录不作为当前项目。 */ }
    } else {
      const backup = await read(handle, { directory: "", name: "完整备份.json" });
      if (backup) { try { if (JSON.parse(backup).items?.some((item: any) => item.id === projectId && item.payload?.itemType === "project")) matches.push(handle); } catch { /* 旧目录需作者自行核对。 */ } }
      else if (name.endsWith(`--${safe(projectId)}`)) matches.push(handle);
    }
  }
  if (matches.length > 1) throw new Error("总文件夹中有当前项目的多个副本，请先保留需要使用的副本，未选择或覆盖任何目录。");
  if (matches.length) return matches[0];
  return root.getDirectoryHandle(`${safe(title || "未命名项目").slice(0, 70)}--${safe(projectId)}`, { create: true });
}

export async function folderTextSnapshot(root: any) {
  const values: Array<{ directory: string; name: string; text: string }> = [];
  for (const name of ["世界观.md", "情节.md", "私密备注.md", "项目信息.md", "完整备份.json", "文件清单.json"]) {
    const text = await read(root, { directory: "", name });
    if (text !== null) values.push({ directory: "", name, text });
  }
  for (const name of ["人物", "大纲", "时间轴", "正文", "AI讨论"]) {
    try {
      const dir = await root.getDirectoryHandle(name);
      for await (const [fileName, handle] of dir.entries()) if (handle.kind === "file" && fileName.toLowerCase().endsWith(".md"))
        values.push({ directory: name, name: fileName, text: await (await handle.getFile()).text() });
    } catch (error: any) { if (error?.name !== "NotFoundError") throw error; }
  }
  return JSON.stringify(values.sort((a, b) => `${a.directory}/${a.name}`.localeCompare(`${b.directory}/${b.name}`)));
}

export async function filterRetiredFiles(root:any, projectId:string, directoryName:string, files:FolderInputFile[]):Promise<FolderInputFile[]> {
  const raw = await read(root,{directory:"",name:"文件清单.json"});
  if(!raw) return files;
  let manifest:Manifest;
  try { manifest=JSON.parse(raw); } catch { throw new Error("文件清单无法读取，尚未导入任何内容。"); }
  if(manifest.format!=="qingxiaolu-folder" || manifest.projectId!==projectId || !Array.isArray(manifest.files) || !Array.isArray(manifest.retired || [])) throw new Error("文件清单与当前项目不一致，尚未导入任何内容。");
  const result=[];
  for(const file of files) {
    const retired=manifest.retired?.find(old=>old.directory===directoryName&&old.name===file.name);
    if(retired) {
      if(await digest(file.text)!==retired.hash) throw new Error(`已从 App 移除的“${directoryName}/${file.name}”又有本地修改，请保留该文件并改为新文件名后导入。尚未导入任何内容。`);
    } else result.push({...file,id:manifest.files.find(entry=>entry.directory===directoryName&&entry.name===file.name)?.id});
  }
  return result;
}

export async function acknowledgeFolderChanges(root:any, projectId:string, associations:Array<{directory:string;name:string;id:string}> = []) {
  const raw=await read(root,{directory:"",name:"文件清单.json"});
  const manifest:Manifest=raw ? JSON.parse(raw) : {format:"qingxiaolu-folder",projectId,files:[]};
  if(manifest.format!=="qingxiaolu-folder"||manifest.projectId!==projectId) return;
  if(!raw) for(const name of ["项目信息.md","世界观.md","情节.md","私密备注.md","完整备份.json","项目全文.doc"]) {
    const file={directory:"",name};const text=await read(root,file);
    if(text!==null) manifest.files.push({...file,hash:await digest(text)});
  }
  for(const entry of associations) {
    if(!allowedDirectories.has(entry.directory)||!safeName(entry.name))throw new Error("文件名无效，无法记录文件对应关系。");
    const text=await read(root,entry);if(text===null)continue;
    manifest.files=manifest.files.filter(file=>!(file.directory===entry.directory&&(file.name===entry.name||file.id===entry.id)));
    manifest.files.push({...entry,hash:await digest(text)});
  }
  for(const file of manifest.files) {
    if(!file.name.endsWith(".md")) continue;
    let text=await read(root,file);
    if(text===null&&file.id) {
      try {
        const dir=await directory(root,file.directory);
        for await(const [name,handle] of dir.entries()) if(handle.kind==="file"&&name.endsWith(".md")) {
          const value=await (await handle.getFile()).text();
          if(name.startsWith(`${file.id}--`) || value.split(/\r?\n/).some((line:string)=>/^(?:人物|章节|事件|稿件|讨论)ID：/.test(line)&&line.split("：")[1]===file.id)) {file.name=name;text=value;break;}
        }
      } catch(error:any) {if(error?.name!=="NotFoundError") throw error;}
    }
    if(text!==null) file.hash=await digest(text);
  }
  await write(root,{directory:"",name:"文件清单.json",text:JSON.stringify(manifest,null,2),type:"application/json"});
}

export function uniqueFolderFiles(files: FolderInputFile[], label:string) {
  const seen=new Map<string,FolderInputFile>();
  const result:FolderInputFile[]=[];
  for(const file of files) {
    const id=file.text.match(new RegExp(`^${label}ID：([^\\r\\n]+)`,"m"))?.[1]?.trim() || file.id || (file.name.includes("--") ? file.name.split("--")[0] : "");
    if(id&&seen.has(id)) {
      const previous=seen.get(id)!;
      if(previous.text.trim()===file.text.trim()) continue;
      throw new Error(`“${previous.name}”与“${file.name}”使用同一${label}ID但内容不同，请保留需要的版本再同步。尚未导入任何内容。`);
    }
    if(id) seen.set(id,file);
    result.push(file);
  }
  return result.sort((a,b)=>{
    const order=(file:{text:string})=>Number(file.text.match(/^顺序：(\d+)/m)?.[1] || Number.MAX_SAFE_INTEGER);
    return order(a)-order(b)||a.name.localeCompare(b.name);
  });
}
