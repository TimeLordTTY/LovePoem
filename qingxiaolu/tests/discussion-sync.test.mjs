import test from "node:test";import {strict as assert} from "node:assert";
import {makeAttempt,buildChanges,acceptResult} from "../tools/chatgpt-qingxiaolu-sync/syncPlan.js";
const project=()=>({id:"p",revision:1,payload:{title:"小说",content:{world:"原设定",privateNotes:"原私密备注"}}});
const attempt=()=>makeAttempt({projectId:"p",category:"世界观",title:"讨论",text:"需要整理的文字",url:"https://chatgpt.com/c/fixture"},"synthetic-owner");
test("讨论成功但项目冲突不能报告整体成功，重试不重复创建讨论",()=>{
 const pending=attempt(),projects=new Map([["p",project()]]),changes=buildChanges(pending,projects.get("p"));
 assert.equal(acceptResult(pending,{applied:[{id:pending.id,revision:1}],conflicts:[{id:"p",server:{revision:2,title:"新小说名",content_json:JSON.stringify({world:"另一设备的新设定",privateNotes:"新私密备注"})}}]},changes,projects),false);
 const retry=buildChanges(pending,projects.get("p"));assert.equal(retry.length,1);assert.equal(retry[0].baseRevision,2);assert.ok(retry[0].content.world.startsWith("另一设备的新设定"));assert.equal(retry[0].content.privateNotes,"新私密备注");
 assert.equal(acceptResult(pending,{applied:[{id:"p",revision:3}],conflicts:[]},retry,projects),true);assert.equal(projects.get("p").revision,3);
 const next=attempt();assert.equal(buildChanges(next,projects.get("p"))[0].baseRevision,3);
});
test("未收到确认后重新读取已有导入标记，不重复追加项目资料",()=>{
 const pending=attempt(),original=project(),changes=buildChanges(pending,original);assert.equal(original.payload.content.world,"原设定");
 const saved={id:"p",revision:2,payload:changes[0]};assert.equal(buildChanges(pending,saved).length,1);assert.equal(pending.confirmed.p,2);
});
test("异常确认不能改变本机确认状态或项目缓存",()=>{
 const pending=attempt(),projects=new Map([["p",project()]]),changes=buildChanges(pending,projects.get("p"));
 assert.throws(()=>acceptResult(pending,{applied:[{id:pending.id}],conflicts:[]},changes,projects),/异常保存确认/);assert.deepEqual(pending.confirmed,{});assert.equal(projects.get("p").revision,1);
});
