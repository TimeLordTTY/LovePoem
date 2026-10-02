import test from "node:test";
import assert from "node:assert/strict";
import {writeProjectFolder,uniqueFolderFiles,filterRetiredFiles,acknowledgeFolderChanges} from "../work/writing-tests/folderSync.mjs";
class Directory {
  kind="directory"; children=new Map(); root;
  constructor(root){this.root=root||this;}
  async getDirectoryHandle(name,{create=false}={}) {if(!this.children.has(name)&&create)this.children.set(name,new Directory(this.root));const value=this.children.get(name);if(!value)throw new DOMException("missing","NotFoundError");return value;}
  async getFileHandle(name,{create=false}={}) {
    if(!this.children.has(name)&&create) {
      const root=this.root;
      const file={kind:"file",text:"",async getFile(){return {text:async()=>file.text};},async createWritable(){let staged;return {async write(value){staged=await value.text();},async close(){if(root.failName===name){root.failName="";throw new Error("disk full");}file.text=staged;},async abort(){}};}};
      this.children.set(name,file);
    }
    const value=this.children.get(name);if(!value)throw new DOMException("missing","NotFoundError");return value;
  }
  async removeEntry(name){this.children.delete(name);}
  async *entries(){yield* this.children.entries();}
}
const entry=(name,title="第一章",order=1)=>({directory:"大纲",name,id:"stable",text:`# ${title}\n\n章节ID：stable\n顺序：${order}\n\n摘要`});
test("电脑新建的普通 Markdown 首次读入后拥有稳定关联，改标题仍更新同一文件",async()=>{
  const root=new Directory();const dir=await root.getDirectoryHandle("正文",{create:true});const file=await dir.getFileHandle("手写.md",{create:true});file.text="# 原标题\n\n正文";
  await acknowledgeFolderChanges(root,"p",[{directory:"正文",name:"手写.md",id:"raw-stable"}]);
  file.text="# 新标题\n\n正文";
  const inputs=await filterRetiredFiles(root,"p","正文",[{name:"手写.md",text:file.text}]);assert.equal(inputs[0].id,"raw-stable");
  await acknowledgeFolderChanges(root,"p",[{directory:"正文",name:"手写.md",id:"raw-stable"}]);
  await writeProjectFolder(root,"p",[{directory:"正文",name:"raw-stable--新标题.md",id:"raw-stable",text:file.text}]);
  assert.equal(dir.children.size,1);assert.equal(dir.children.get("手写.md").text,"# 新标题\n\n正文");
});
test("旧文件夹属于另一项目时拒绝覆盖",async()=>{
  const root=new Directory();const file=await root.getFileHandle("完整备份.json",{create:true});file.text=JSON.stringify({items:[{id:"other",payload:{itemType:"project"}}]});
  await assert.rejects(writeProjectFolder(root,"p",[entry("a.md")]),/其他项目/);assert.equal(root.children.size,1);
});
test("章节改名和重排复用同一文件，元数据保留顺序；外部文件不受影响",async()=>{
  const root=new Directory();await writeProjectFolder(root,"p",[entry("001-第一章.md")]);
  const notes=await root.getFileHandle("外部笔记.md",{create:true});notes.text="作者的其他文件";
  await writeProjectFolder(root,"p",[entry("002-改名.md","改名",2)]);
  const dir=await root.getDirectoryHandle("大纲");assert.equal(dir.children.size,1);assert.match(dir.children.get("001-第一章.md").text,/顺序：2/);
  assert.equal(notes.text,"作者的其他文件");
});
test("已有电脑修改时导出拒绝覆盖，读回后可继续同步",async()=>{
  const root=new Directory();await writeProjectFolder(root,"p",[entry("a.md")]);
  const dir=await root.getDirectoryHandle("大纲");dir.children.get("a.md").text+="\n作者修改";
  await assert.rejects(writeProjectFolder(root,"p",[entry("b.md")]),/有本地修改/);
  assert.match(dir.children.get("a.md").text,/作者修改/);
  await acknowledgeFolderChanges(root,"p");await writeProjectFolder(root,"p",[{...entry("b.md"),text:dir.children.get("a.md").text}]);
  assert.equal(dir.children.size,1);
});
test("目录写入中途失败恢复原文件，移除新文件，清单不改变",async()=>{
  const root=new Directory();await writeProjectFolder(root,"p",[entry("a.md")]);
  const manifest=root.children.get("文件清单.json").text;root.failName="fail.md";
  await assert.rejects(writeProjectFolder(root,"p",[{...entry("a.md"),text:"更新正文"},{directory:"正文",name:"fail.md",text:"新正文"}]),/已撤销/);
  assert.equal((await root.getDirectoryHandle("大纲")).children.get("a.md").text,entry("a.md").text);
  assert.equal((await root.getDirectoryHandle("正文")).children.size,0);assert.equal(root.children.get("文件清单.json").text,manifest);
});
test("从 App 移除的资料保留文件但不会重新导入；修改旧文件时提示作者保留",async()=>{
  const root=new Directory();await writeProjectFolder(root,"p",[entry("a.md")]);await writeProjectFolder(root,"p",[]);
  const dir=await root.getDirectoryHandle("大纲");const file=dir.children.get("a.md");assert.ok(file);
  assert.deepEqual(await filterRetiredFiles(root,"p","大纲",[{name:"a.md",text:file.text}]),[]);
  file.text+="作者修改";await assert.rejects(filterRetiredFiles(root,"p","大纲",[{name:"a.md",text:file.text}]),/本地修改/);
});
test("相同 ID 的不同版本在写入前报错；完全相同文件去重，顺序不靠旧文件名",()=>{
  assert.throws(()=>uniqueFolderFiles([{name:"旧.md",text:"章节ID：a\n旧"},{name:"新.md",text:"章节ID：a\n新"}],"章节"),/尚未导入/);
  const result=uniqueFolderFiles([{name:"001.md",text:"章节ID：a\n顺序：2"},{name:"003.md",text:"章节ID：a\n顺序：2"},{name:"002.md",text:"章节ID：b\n顺序：1"}],"章节");
  assert.equal(result.length,2);assert.equal(result[0].name,"002.md");
});
